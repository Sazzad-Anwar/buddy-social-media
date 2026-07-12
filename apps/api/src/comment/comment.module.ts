import { Module } from '@nestjs/common';
import { PrismaService } from '../db.service';
import { CacheModule } from '../cache/cache.module';
import { PostModule } from '../post/post.module';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { CommentCacheService } from './comment-cache.service';

@Module({
  imports: [CacheModule, PostModule],
  controllers: [CommentController],
  providers: [CommentService, CommentCacheService, PrismaService],
  exports: [CommentService],
})
export class CommentModule {}

