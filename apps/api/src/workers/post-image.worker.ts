import { Inject, Injectable } from '@nestjs/common';
import { Worker } from 'bullmq';
import { PrismaService } from '../db.service';
import { MediaService } from '../media/media.service';
import { PostCacheService } from '../post/post-cache.service';
import {
  BULLMQ_CONNECTION,
  POST_IMAGE_QUEUE,
} from '../jobs/post-jobs.constants';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';

@Injectable()
export class PostImageWorkerService implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker;

  constructor(
    @Inject(BULLMQ_CONNECTION) private readonly connection: any,
    private readonly db: PrismaService,
    private readonly media: MediaService,
    private readonly postCache: PostCacheService,
  ) {}

  async onModuleInit() {
    this.worker = new Worker(
      POST_IMAGE_QUEUE,
      async (job) => {
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
          );

          const uploaded = await this.media.uploadWebp(
            processed,
            job.data.postId,
          );

          await this.db.post.update({
            where: {
              id: post.id,
            },
            data: {
              imageKey: uploaded.key,
              imageUrl: uploaded.url,
              imageStatus: 'READY',
            },
          });

          await this.postCache.deletePostCards(post.id, post.authorId);
        } catch {
          await this.db.post.update({
            where: {
              id: post.id,
            },
            data: {
              imageStatus: 'FAILED',
            },
          });
        } finally {
          await this.media.removeFile(job.data.tempPath);
        }
      },
      {
        connection: this.connection,
        concurrency: 2,
      },
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}
