import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { PrismaService } from '../../db.service';
import { MediaService } from '../../media/media.service';
import { PostCacheService } from '../post-cache.service';
import { POST_IMAGE_QUEUE } from '../../jobs/post-jobs.constants';
import type { OnModuleDestroy } from '@nestjs/common';
import type { ProcessPostImageJob } from '@repo/types';

@Processor(POST_IMAGE_QUEUE)
@Injectable()
export class PostImageProcessor
  extends WorkerHost
  implements OnModuleDestroy
{
  private readonly logger = new Logger(PostImageProcessor.name);

  constructor(
    private readonly db: PrismaService,
    private readonly media: MediaService,
    private readonly postCache: PostCacheService,
  ) {
    super();
  }

  async process(job: Job<ProcessPostImageJob>) {
    this.logger.log(`Processing job ${job.id} for post ${job.data.postId}`);
    let processedTempPath: string | null = null;
    const post = await this.db.post.findUnique({
      where: {
        id: job.data.postId,
      },
      select: {
        id: true,
        authorId: true,
        imageKey: true,
      },
    });

    if (!post) {
      await this.media.removeFile(job.data.tempPath);
      return;
    }

    try {
      const processed = await this.media.processToWebp(
        job.data.tempPath,
        job.data.originalName,
        job.data.postId,
      );
      processedTempPath = processed.tempPath;

      const uploaded = await this.media.uploadWebp(processed, job.data.postId);

      await this.db.post.update({
        where: {
          id: post.id,
        },
        data: {
          imageKey: uploaded.key,
          imageUrl: uploaded.ufsUrl,
          imageStatus: 'READY',
        },
      });

      if (job.data.previousImageKey) {
        await this.media.deleteUploadedFile(job.data.previousImageKey);
      }

      await this.postCache.deletePostCards(post.id, post.authorId);
      this.logger.log(`Completed job ${job.id} for post ${job.data.postId}`);
    } catch (error) {
      this.logger.error(
        `Image processing failed for post ${job.data.postId}`,
        error instanceof Error ? error.stack : String(error),
      );
      await this.db.post.update({
        where: {
          id: post.id,
        },
        data: {
          imageStatus: 'FAILED',
        },
      });
      throw error;
    } finally {
      await this.media.removeFile(job.data.tempPath);
      if (processedTempPath) {
        await this.media.removeFile(processedTempPath);
      }
    }
  }

  async onModuleDestroy() {
    await this.worker.close();
  }
}
