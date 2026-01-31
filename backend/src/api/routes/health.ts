import { FastifyInstance } from 'fastify';
import { prisma } from '../../db/client';
import { redis } from '../../cache/redis';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/api/health', {
    schema: {
      tags: ['Health'],
      summary: 'Health check',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'degraded'] },
            checks: {
              type: 'object',
              properties: {
                database: { type: 'string' },
                redis: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async () => {
    const checks: Record<string, string> = {};

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    try {
      await redis.ping();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'error';
    }

    const healthy = Object.values(checks).every((v) => v === 'ok');

    return { status: healthy ? 'healthy' : 'degraded', checks };
  });
}
