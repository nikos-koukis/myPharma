import Redis from 'ioredis';
import { config } from '../config';
import { cacheHitsTotal, cacheMissesTotal } from '../metrics';

export const redis = new Redis(config.redis.url);

export async function getCache<T>(key: string): Promise<T | null> {
  if (!config.cache.enabled) return null;
  const prefix = key.split(':')[0];
  const data = await redis.get(key);
  if (data) {
    console.log(`[cache] HIT  ${key}`);
    cacheHitsTotal.inc({ key_prefix: prefix });
    return JSON.parse(data);
  }
  console.log(`[cache] MISS ${key}`);
  cacheMissesTotal.inc({ key_prefix: prefix });
  return null;
}

export async function setCache(key: string, data: unknown, ttl?: number): Promise<void> {
  if (!config.cache.enabled) return;
  const seconds = ttl ?? config.cache.defaultTTL;
  await redis.set(key, JSON.stringify(data), 'EX', seconds);
}

export async function invalidatePattern(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

export function buildCacheKey(...parts: string[]): string {
  return parts.join(':');
}
