import { Module } from '@nestjs/common';
import { PrismaService } from './db.service';
import { CacheModule } from './cache/cache.module';
import { MediaModule } from './media/media.module';
import { PostJobsModule } from './jobs/post-jobs.module';
import { PostCacheService } from './post/post-cache.service';
import { PostImageWorkerService } from './workers/post-image.worker';

@Module({
  imports: [CacheModule, MediaModule, PostJobsModule],
  providers: [PrismaService, PostCacheService, PostImageWorkerService],
})
export class WorkerModule {}

