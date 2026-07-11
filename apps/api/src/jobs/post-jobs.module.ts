import { Module } from '@nestjs/common';
import Redis from 'ioredis';
import { BULLMQ_CONNECTION } from './post-jobs.constants';
import { PostJobsService } from './post-jobs.service';

function createBullmqConnection(): Redis {
  const url = process.env.REDIS_URL;

  if (!url) {
    throw new Error('REDIS_URL must be set for BullMQ');
  }

  return new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
  });
}

@Module({
  providers: [
    {
      provide: BULLMQ_CONNECTION,
      useFactory: createBullmqConnection,
    },
    PostJobsService,
  ],
  exports: [PostJobsService, BULLMQ_CONNECTION],
})
export class PostJobsModule {}

