import { FastifyInstance } from 'fastify';
import { prisma } from '../../db/client';
import { feedbackTotal } from '../../metrics';

interface FeedbackBody {
  type: 'bug' | 'feature' | 'general' | 'pharmacy_error';
  message: string;
  email?: string;
  appVersion?: string;
  platform?: 'ios' | 'android';
  deviceInfo?: string;
  pharmacyId?: string;
}

export async function feedbackRoutes(app: FastifyInstance) {
  app.post<{ Body: FeedbackBody }>('/api/feedback', {
    schema: {
      tags: ['Feedback'],
      summary: 'Submit user feedback',
      body: {
        type: 'object',
        required: ['type', 'message'],
        properties: {
          type: {
            type: 'string',
            enum: ['bug', 'feature', 'general', 'pharmacy_error'],
            description: 'Type of feedback'
          },
          message: {
            type: 'string',
            minLength: 10,
            maxLength: 2000,
            description: 'Feedback message'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Optional contact email'
          },
          appVersion: { type: 'string' },
          platform: { type: 'string', enum: ['ios', 'android'] },
          deviceInfo: { type: 'string' },
          pharmacyId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            id: { type: 'string' },
            message: { type: 'string' },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { type, message, email, appVersion, platform, deviceInfo, pharmacyId } = request.body;

    // Validate pharmacy exists if pharmacyId is provided
    if (pharmacyId) {
      const pharmacy = await prisma.pharmacy.findUnique({ where: { id: pharmacyId } });
      if (!pharmacy) {
        return reply.status(400).send({ error: 'Invalid pharmacy ID' });
      }
    }

    const feedback = await prisma.feedback.create({
      data: {
        type,
        message,
        email,
        appVersion,
        platform,
        deviceInfo,
        pharmacyId,
      },
    });

    // Increment Prometheus counter
    feedbackTotal.inc({ type, platform: platform || 'unknown' });

    console.log(`[feedback] New ${type} feedback received (id: ${feedback.id})`);

    return reply.status(201).send({
      success: true,
      id: feedback.id,
      message: 'Thank you for your feedback!',
    });
  });

  // Get feedback stats (admin endpoint)
  app.get('/api/feedback/stats', {
    schema: {
      tags: ['Feedback'],
      summary: 'Get feedback statistics',
      response: {
        200: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            byType: { type: 'object' },
            recent: { type: 'array' },
          },
        },
      },
    },
  }, async () => {
    const [total, byType, recent] = await Promise.all([
      prisma.feedback.count(),
      prisma.feedback.groupBy({
        by: ['type'],
        _count: { _all: true },
      }),
      prisma.feedback.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          message: true,
          platform: true,
          createdAt: true,
        },
      }),
    ]);

    const byTypeMap: Record<string, number> = {};
    for (const item of byType) {
      byTypeMap[item.type] = item._count._all;
    }

    return {
      total,
      byType: byTypeMap,
      recent,
    };
  });
}
