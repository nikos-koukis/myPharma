import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from '../config';
import { healthRoutes } from './routes/health';
import { pharmacyRoutes } from './routes/pharmacies';

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

  // Root endpoint
  app.get('/', { schema: { hide: true } }, async () => {
    return { name: 'myPharma API', version: '1.0.0', docs: '/docs' };
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
