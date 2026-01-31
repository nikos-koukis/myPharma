import { FastifyRequest, FastifyReply } from 'fastify';
import { getCache, setCache } from '../../cache/redis';
import { config } from '../../config';

export function cacheMiddleware(keyBuilder: (req: FastifyRequest) => string) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!config.cache.enabled) return;

    const key = keyBuilder(req);
    const cached = await getCache<unknown>(key);

    if (cached) {
      reply.header('X-Cache', 'HIT');
      reply.send(cached);
    }
  };
}
