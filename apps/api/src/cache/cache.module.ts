import { Module } from '@nestjs/common';
import { Redis } from '@upstash/redis';
import { CacheService } from './cache.service';
import { UPSTASH_REDIS } from './cache.constants';

function createRedisClient(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set',
    );
  }

  return new Redis({
    url,
    token,
  });
}

@Module({
  providers: [
    {
      provide: UPSTASH_REDIS,
      useFactory: createRedisClient,
    },
    CacheService,
  ],
  exports: [CacheService, UPSTASH_REDIS],
})
export class CacheModule {}

