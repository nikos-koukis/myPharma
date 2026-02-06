import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from '../config';
import { healthRoutes } from './routes/health';
import { pharmacyRoutes } from './routes/pharmacies';
import { client, httpRequestDuration, httpRequestsTotal } from '../metrics';

export async function createServer() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });

  // Swagger
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'myPharma API',
        description: 'REST API for Greek pharmacies on duty',
        version: '1.0.0',
      },
      tags: [
        { name: 'Health', description: 'Health check endpoints' },
        { name: 'Pharmacies', description: 'Pharmacy data and duty schedules' },
        { name: 'Regions', description: 'Prefectures and regions' },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });

  // Request timing hooks
  app.addHook('onRequest', (req, _reply, done) => {
    (req as any).__startTime = process.hrtime.bigint();
    done();
  });

  app.addHook('onResponse', (req, reply, done) => {
    const start = (req as any).__startTime as bigint | undefined;
    if (start) {
      const durationNs = Number(process.hrtime.bigint() - start);
      const durationSec = durationNs / 1e9;
      const route = req.routeOptions?.url || req.url;
      const labels = {
        method: req.method,
        route,
        status_code: String(reply.statusCode),
      };
      httpRequestDuration.observe(labels, durationSec);
      httpRequestsTotal.inc(labels);
    }
    done();
  });

  // Root endpoint
  app.get('/', { schema: { hide: true } }, async () => {
    return { name: 'myPharma API', version: '1.0.0', docs: '/docs' };
  });

  // Prometheus metrics endpoint
  app.get('/metrics', { schema: { hide: true } }, async (_req, reply) => {
    reply.header('Content-Type', client.register.contentType);
    return client.register.metrics();
  });

  await app.register(healthRoutes);
  await app.register(pharmacyRoutes);

  await app.ready();
  app.swagger();

  return app;
}

export async function startServer() {
  const app = await createServer();

  await app.listen({ port: config.server.port, host: config.server.host });
  console.log(`[api] Server running on http://${config.server.host}:${config.server.port}`);
  console.log(`[api] Swagger docs at http://${config.server.host}:${config.server.port}/docs`);

  return app;
}
