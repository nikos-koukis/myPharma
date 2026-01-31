import { FastifyInstance } from 'fastify';
import { prisma } from '../../db/client';
import { getCache, setCache, buildCacheKey } from '../../cache/redis';
import { config } from '../../config';

export async function pharmacyRoutes(app: FastifyInstance) {
  // GET /api/pharmacies/on-duty?region=...&city=...&date=2026-01-30
  app.get<{
    Querystring: { region?: string; city?: string; date?: string };
  }>('/api/pharmacies/on-duty', {
    schema: {
      tags: ['Pharmacies'],
      summary: 'Get pharmacies on duty',
      querystring: {
        type: 'object',
        properties: {
          region: { type: 'string', description: 'Filter by region/prefecture (case-insensitive)' },
          city: { type: 'string', description: 'Filter by city' },
          date: { type: 'string', format: 'date', description: 'Duty date (YYYY-MM-DD), defaults to today' },
        },
      },
    },
  }, async (req, reply) => {
    const { region, city, date } = req.query;
    const dutyDate = date ?? new Date().toISOString().split('T')[0];

    const cacheKey = buildCacheKey('pharmacies', 'on-duty', region ?? city ?? 'all', dutyDate);
    const cached = await getCache(cacheKey);
    if (cached) {
      reply.header('X-Cache', 'HIT');
      return cached;
    }

    const where: Record<string, unknown> = {
      duties: { some: { dutyDate: new Date(dutyDate) } },
    };
    if (region) where.region = { contains: region, mode: 'insensitive' };
    if (city) where.city = city;

    const pharmacies = await prisma.pharmacy.findMany({
      where,
      include: { duties: { where: { dutyDate: new Date(dutyDate) } } },
      orderBy: { name: 'asc' },
    });

    await setCache(cacheKey, pharmacies);
    reply.header('X-Cache', 'MISS');
    return pharmacies;
  });

  // GET /api/pharmacies/nearby?lat=37.98&lng=23.72&radius=2000&date=2026-01-30
  app.get<{
    Querystring: { lat: string; lng: string; radius?: string; date?: string };
  }>('/api/pharmacies/nearby', {
    schema: {
      tags: ['Pharmacies'],
      summary: 'Find nearby on-duty pharmacies',
      querystring: {
        type: 'object',
        required: ['lat', 'lng'],
        properties: {
          lat: { type: 'string', description: 'Latitude' },
          lng: { type: 'string', description: 'Longitude' },
          radius: { type: 'string', description: 'Search radius in meters (default: 2000)' },
          date: { type: 'string', format: 'date', description: 'Duty date (YYYY-MM-DD), defaults to today' },
        },
      },
    },
  }, async (req, reply) => {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseInt(req.query.radius ?? '2000', 10);
    const dutyDate = req.query.date ?? new Date().toISOString().split('T')[0];

    if (isNaN(lat) || isNaN(lng)) {
      reply.status(400);
      return { error: 'lat and lng are required' };
    }

    const precision = config.cache.nearbyPrecision;
    const roundedLat = lat.toFixed(precision);
    const roundedLng = lng.toFixed(precision);
    const cacheKey = buildCacheKey('pharmacies', 'nearby', roundedLat, roundedLng, String(radius), dutyDate);

    const cached = await getCache(cacheKey);
    if (cached) {
      reply.header('X-Cache', 'HIT');
      return cached;
    }

    // Try PostGIS first, fall back to Haversine
    let pharmacies;
    try {
      pharmacies = await prisma.$queryRaw`
        SELECT p.*, pd.duty_date, pd.shift,
          ST_Distance(
            ST_SetSRID(ST_MakePoint(p.lng, p.lat), 4326)::geography,
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
          ) AS distance_meters
        FROM pharmacies p
        INNER JOIN pharmacy_duties pd ON pd.pharmacy_id = p.id
        WHERE pd.duty_date = ${new Date(dutyDate)}::date
          AND p.lat IS NOT NULL
          AND p.lng IS NOT NULL
          AND ST_DWithin(
            ST_SetSRID(ST_MakePoint(p.lng, p.lat), 4326)::geography,
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
            ${radius}
          )
        ORDER BY distance_meters ASC
      `;
    } catch {
      // Fallback: Haversine formula without PostGIS
      console.log('[api] PostGIS not available, using Haversine fallback');
      pharmacies = await prisma.$queryRaw`
        SELECT *, distance_meters FROM (
          SELECT p.*, pd.duty_date, pd.shift,
            (6371000 * acos(
              cos(radians(${lat})) * cos(radians(p.lat)) *
              cos(radians(p.lng) - radians(${lng})) +
              sin(radians(${lat})) * sin(radians(p.lat))
            )) AS distance_meters
          FROM pharmacies p
          INNER JOIN pharmacy_duties pd ON pd.pharmacy_id = p.id
          WHERE pd.duty_date = ${new Date(dutyDate)}::date
            AND p.lat IS NOT NULL
            AND p.lng IS NOT NULL
        ) sub
        WHERE distance_meters <= ${radius}
        ORDER BY distance_meters ASC
      `;
    }

    await setCache(cacheKey, pharmacies);
    reply.header('X-Cache', 'MISS');
    return pharmacies;
  });

  // GET /api/pharmacies/:id
  app.get<{
    Params: { id: string };
  }>('/api/pharmacies/:id', {
    schema: {
      tags: ['Pharmacies'],
      summary: 'Get pharmacy by ID',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Pharmacy ID' },
        },
      },
    },
  }, async (req, reply) => {
    const { id } = req.params;

    const cacheKey = buildCacheKey('pharmacy', id);
    const cached = await getCache(cacheKey);
    if (cached) {
      reply.header('X-Cache', 'HIT');
      return cached;
    }

    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id },
      include: { duties: { orderBy: { dutyDate: 'desc' }, take: 30 } },
    });

    if (!pharmacy) {
      reply.status(404);
      return { error: 'Pharmacy not found' };
    }

    await setCache(cacheKey, pharmacy);
    reply.header('X-Cache', 'MISS');
    return pharmacy;
  });

  // GET /api/prefectures
  app.get('/api/prefectures', {
    schema: {
      tags: ['Regions'],
      summary: 'List all prefectures',
      response: {
        200: { type: 'array', items: { type: 'string' } },
      },
    },
  }, async (_req, reply) => {
    const cacheKey = 'prefectures:all';
    const cached = await getCache(cacheKey);
    if (cached) {
      reply.header('X-Cache', 'HIT');
      return cached;
    }

    const prefectures = await prisma.pharmacy.findMany({
      select: { region: true },
      distinct: ['region'],
      orderBy: { region: 'asc' },
    });

    const result = prefectures.map((p) => p.region).filter(Boolean);

    await setCache(cacheKey, result, 86400);
    reply.header('X-Cache', 'MISS');
    return result;
  });

  // GET /api/regions?prefecture=...
  app.get<{
    Querystring: { prefecture?: string };
  }>('/api/regions', {
    schema: {
      tags: ['Regions'],
      summary: 'List regions/cities',
      querystring: {
        type: 'object',
        properties: {
          prefecture: { type: 'string', description: 'Filter by prefecture (case-insensitive)' },
        },
      },
    },
  }, async (req, reply) => {
    const { prefecture } = req.query;
    const cacheKey = buildCacheKey('regions', prefecture ?? 'all');
    const cached = await getCache(cacheKey);
    if (cached) {
      reply.header('X-Cache', 'HIT');
      return cached;
    }

    const where = prefecture
      ? { region: { contains: prefecture, mode: 'insensitive' as const } }
      : {};

    const regions = await prisma.pharmacy.findMany({
      where,
      select: { region: true, city: true },
      distinct: ['region', 'city'],
      orderBy: { region: 'asc' },
    });

    await setCache(cacheKey, regions, 86400);
    reply.header('X-Cache', 'MISS');
    return regions;
  });
}
