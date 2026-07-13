import { Module } from '@nestjs/common';
import { PrismaService } from '../db.service';
import { CacheModule } from '../cache/cache.module';
import { CommentCacheService } from '../comment/comment-cache.service';
import { ReplyController } from './reply.controller';
import { ReplyService } from './reply.service';
import { ReplyCacheService } from './reply-cache.service';

@Module({
  imports: [CacheModule],
  controllers: [ReplyController],
  providers: [
    ReplyService,
    ReplyCacheService,
    CommentCacheService,
    PrismaService,
  ],
})
export class ReplyModule {}
