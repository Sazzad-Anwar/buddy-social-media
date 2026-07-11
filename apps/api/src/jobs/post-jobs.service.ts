import { Inject, Injectable } from '@nestjs/common';
import { Queue, type JobsOptions } from 'bullmq';
import { BULLMQ_CONNECTION, POST_IMAGE_QUEUE } from './post-jobs.constants';
import type { OnModuleDestroy } from '@nestjs/common';
import type { ProcessPostImageJob } from '@repo/types';

@Injectable()
export class PostJobsService implements OnModuleDestroy {
  private readonly queue: Queue;

  constructor(@Inject(BULLMQ_CONNECTION) connection: any) {
    this.queue = new Queue(POST_IMAGE_QUEUE, {
      connection,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }

  async enqueuePostImageProcessing(
    payload: ProcessPostImageJob,
  ): Promise<void> {
    const options: JobsOptions = {
      jobId: `post-image:${payload.postId}:${payload.tempPath}`,
    };

    await this.queue.add('process', payload, options);
  }

  async onModuleDestroy() {
    await this.queue.close();
  }
}
