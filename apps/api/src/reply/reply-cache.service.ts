import { Injectable } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import type { ReplyCard } from './reply.types';

@Injectable()
export class ReplyCacheService {
  constructor(private readonly cache: CacheService) {}

  repliesVersionKey(commentId: number): string {
    return `reply:comment:${commentId}:version`;
  }

  async getRepliesVersion(commentId: number): Promise<number> {
    return await this.cache.getNumber(this.repliesVersionKey(commentId), 1);
  }

  async bumpRepliesVersion(commentId: number): Promise<number> {
    return await this.cache.incr(this.repliesVersionKey(commentId));
  }

  repliesPageKey(params: {
    commentId: number;
    parentReplyId: number | null;
    version: number;
    viewerId: number;
    cursor: string | null;
    limit: number;
  }): string {
    return [
      'reply:feed',
      `comment:${params.commentId}`,
      `parent:${params.parentReplyId ?? 'root'}`,
      `v${params.version}`,
      `viewer:${params.viewerId}`,
      `cursor:${params.cursor ?? 'root'}`,
      `limit:${params.limit}`,
    ].join(':');
  }

  async getRepliesPage(key: string): Promise<string[] | null> {
    const value = await this.cache.getJSON<unknown>(key);

    if (!Array.isArray(value)) {
      return null;
    }

    return value.every((item) => typeof item === 'string') ? value : null;
  }

  async setRepliesPage(
    key: string,
    replyIds: string[],
    ttlSeconds: number,
  ): Promise<void> {
    await this.cache.setJSON(key, replyIds, ttlSeconds);
  }

  async getReplyCard(key: string): Promise<ReplyCard | null> {
    return await this.cache.getJSON<ReplyCard>(key);
  }

  async setReplyCard(
    key: string,
    card: ReplyCard,
    ttlSeconds: number,
  ): Promise<void> {
    await this.cache.setJSON(key, card, ttlSeconds);
  }

  replySummaryKey(params: {
    replyId: number;
    scope: 'public' | 'private';
    ownerId?: number;
  }): string {
    if (params.scope === 'private') {
      return `reply:summary:${params.replyId}:private:${params.ownerId ?? 0}`;
    }

    return `reply:summary:${params.replyId}:public`;
  }

  async deleteReplyCards(replyId: number, ownerId?: number): Promise<void> {
    await this.cache.del(
      this.replySummaryKey({ replyId, scope: 'public' }),
      this.replySummaryKey({
        replyId,
        scope: 'private',
        ownerId: ownerId ?? 0,
      }),
    );
  }
}
