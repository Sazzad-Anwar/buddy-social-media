import { Injectable } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import type { PostCard, PostLikeUser } from './post.types';

const FEED_VERSION_KEY = 'post:feed:version';

@Injectable()
export class PostCacheService {
  constructor(private readonly cache: CacheService) {}

  feedVersionKey(): string {
    return FEED_VERSION_KEY;
  }

  async getFeedVersion(): Promise<number> {
    return await this.cache.getNumber(FEED_VERSION_KEY, 1);
  }

  async bumpFeedVersion(): Promise<number> {
    return await this.cache.incr(FEED_VERSION_KEY);
  }

  feedPageKey(params: {
    version: number;
    viewerId: number;
    cursor: string | null;
    limit: number;
  }): string {
    return [
      'post:feed',
      `v${params.version}`,
      `viewer:${params.viewerId}`,
      `cursor:${params.cursor ?? 'root'}`,
      `limit:${params.limit}`,
    ].join(':');
  }

  postSummaryKey(params: {
    postId: number;
    scope: 'public' | 'private';
    ownerId?: number;
  }): string {
    if (params.scope === 'private') {
      return `post:summary:${params.postId}:private:${params.ownerId ?? 0}`;
    }

    return `post:summary:${params.postId}:public`;
  }

  postLikesPageKey(params: {
    postId: number;
    cursor: string | null;
    limit: number;
  }): string {
    return [
      'post:likes',
      `post:${params.postId}`,
      `cursor:${params.cursor ?? 'root'}`,
      `limit:${params.limit}`,
    ].join(':');
  }

  async getFeedPage(key: string): Promise<string[] | null> {
    return await this.cache.getJSON<string[]>(key);
  }

  async setFeedPage(key: string, postIds: string[], ttlSeconds: number) {
    await this.cache.setJSON(key, postIds, ttlSeconds);
  }

  async getPostCard(key: string): Promise<PostCard | null> {
    return await this.cache.getJSON<PostCard>(key);
  }

  async setPostCard(key: string, card: PostCard, ttlSeconds: number) {
    await this.cache.setJSON(key, card, ttlSeconds);
  }

  async deletePostCards(postId: number, ownerId?: number): Promise<void> {
    const keys = [
      this.postSummaryKey({ postId, scope: 'public' }),
      this.postSummaryKey({
        postId,
        scope: 'private',
        ownerId: ownerId ?? 0,
      }),
    ];

    await this.cache.del(...keys);
  }

  async getLikesPage(key: string): Promise<PostLikeUser[] | null> {
    return await this.cache.getJSON<PostLikeUser[]>(key);
  }

  async setLikesPage(
    key: string,
    users: PostLikeUser[],
    ttlSeconds: number,
  ): Promise<void> {
    await this.cache.setJSON(key, users, ttlSeconds);
  }
}
