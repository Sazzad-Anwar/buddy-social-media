import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { PrismaService } from '../db.service';
import { CacheModule } from '../cache/cache.module';
import { MediaModule } from '../media/media.module';
import { PostJobsModule } from '../jobs/post-jobs.module';
import { PostCacheService } from './post-cache.service';

@Module({
  imports: [CacheModule, MediaModule, PostJobsModule],
  controllers: [PostController],
  providers: [PostService, PostCacheService, PrismaService],
  exports: [PostService, PostCacheService],
})
export class PostModule {}
