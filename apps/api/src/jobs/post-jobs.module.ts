import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { POST_IMAGE_QUEUE } from './post-jobs.constants';
import { PostJobsService } from './post-jobs.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: POST_IMAGE_QUEUE,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
  ],
  providers: [
    PostJobsService,
  ],
  exports: [PostJobsService],
})
export class PostJobsModule {}
