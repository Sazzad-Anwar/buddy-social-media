import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, type JobsOptions } from 'bullmq';
import { POST_IMAGE_QUEUE } from './post-jobs.constants';
import type { OnModuleDestroy } from '@nestjs/common';
import type { ProcessPostImageJob } from '@repo/types';

@Injectable()
export class PostJobsService implements OnModuleDestroy {
  private readonly queue: Queue;

  constructor(@InjectQueue(POST_IMAGE_QUEUE) queue: Queue) {
    this.queue = queue;
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
