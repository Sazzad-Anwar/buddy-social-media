import { Injectable } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import type { CommentCard } from './comment.types';

@Injectable()
export class CommentCacheService {
  constructor(private readonly cache: CacheService) {}

  commentsVersionKey(postId: number): string {
    return `comment:post:${postId}:version`;
  }

  async getCommentsVersion(postId: number): Promise<number> {
    return await this.cache.getNumber(this.commentsVersionKey(postId), 1);
  }

  async bumpCommentsVersion(postId: number): Promise<number> {
    return await this.cache.incr(this.commentsVersionKey(postId));
  }

  commentsPageKey(params: {
    postId: number;
    version: number;
    viewerId: number;
    cursor: string | null;
    limit: number;
  }): string {
    return [
      'comment:feed',
      `post:${params.postId}`,
      `v${params.version}`,
      `viewer:${params.viewerId}`,
      `cursor:${params.cursor ?? 'root'}`,
      `limit:${params.limit}`,
    ].join(':');
  }

  async getCommentsPage(key: string): Promise<string[] | null> {
    return await this.cache.getJSON<string[]>(key);
  }

  async setCommentsPage(
    key: string,
    commentIds: string[],
    ttlSeconds: number,
  ): Promise<void> {
    await this.cache.setJSON(key, commentIds, ttlSeconds);
  }

  async getCommentCard(key: string): Promise<CommentCard | null> {
    return await this.cache.getJSON<CommentCard>(key);
  }

  async setCommentCard(
    key: string,
    card: CommentCard,
    ttlSeconds: number,
  ): Promise<void> {
    await this.cache.setJSON(key, card, ttlSeconds);
  }

  commentSummaryKey(params: {
    commentId: number;
    scope: 'public' | 'private';
    ownerId?: number;
  }): string {
    if (params.scope === 'private') {
      return `comment:summary:${params.commentId}:private:${params.ownerId ?? 0}`;
    }

    return `comment:summary:${params.commentId}:public`;
  }

  async deleteCommentCards(commentId: number, ownerId?: number): Promise<void> {
    await this.cache.del(
      this.commentSummaryKey({ commentId, scope: 'public' }),
      this.commentSummaryKey({
        commentId,
        scope: 'private',
        ownerId: ownerId ?? 0,
      }),
    );
  }
}

