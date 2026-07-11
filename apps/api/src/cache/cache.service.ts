import { Inject, Injectable } from '@nestjs/common';
import { Redis } from '@upstash/redis';
import { UPSTASH_REDIS } from './cache.constants';

@Injectable()
export class CacheService {
  constructor(@Inject(UPSTASH_REDIS) private readonly redis: Redis) {}

  async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.redis.get<string>(key);
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async setJSON<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), {
      ex: ttlSeconds,
    });
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) {
      return 0;
    }

    return await this.redis.del(...keys);
  }

  async incr(key: string): Promise<number> {
    return await this.redis.incr(key);
  }

  async getNumber(key: string, fallback = 0): Promise<number> {
    const value = await this.redis.get<string | number>(key);

    if (value === null || value === undefined) {
      return fallback;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  async getOrSetJSON<T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.getJSON<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.setJSON(key, value, ttlSeconds);
    return value;
  }
}

