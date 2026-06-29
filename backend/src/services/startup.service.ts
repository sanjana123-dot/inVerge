import { Domain, FundingStage, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { trustScoreService } from './trustScore.service';
import { logActivity } from './activity.service';
import { AppError } from '../middleware/errorHandler';

export const startupService = {
  async create(
    founderId: string,
    data: {
      startupName: string;
      description: string;
      pitch: string;
      domain: Domain;
      fundingStage: FundingStage;
      teamSize: number;
      pitchDeckUrl?: string | null;
      websiteUrl?: string | null;
      metrics?: Record<string, string | number>;
    }
  ) {
    const existing = await prisma.startup.findUnique({
      where: { founderId },
    });
    if (existing) {
      throw new AppError('Startup profile already exists', 409);
    }

    const startup = await prisma.startup.create({
      data: {
        founderId,
        ...data,
        metrics: data.metrics as Prisma.InputJsonValue | undefined,
      },
      include: {
        founder: {
          select: {
            id: true,
            name: true,
            trustScore: true,
            profilePicture: true,
          },
        },
      },
    });

    void logActivity(founderId, 'STARTUP_CREATED', { startupId: startup.id }).catch(() => {});
    void trustScoreService.recalculate(founderId, 'Startup created').catch((err) => {
      console.error('Trust score recalculation failed:', err);
    });

    return startup;
  },

  async update(
    founderId: string,
    data: Partial<{
      startupName: string;
      description: string;
      pitch: string;
      domain: Domain;
      fundingStage: FundingStage;
      teamSize: number;
      pitchDeckUrl: string | null;
      websiteUrl: string | null;
      metrics: Record<string, string | number>;
    }>
  ) {
    const startup = await prisma.startup.update({
      where: { founderId },
      data: {
        ...data,
        metrics: data.metrics as Prisma.InputJsonValue | undefined,
      },
      include: {
        founder: {
          select: {
            id: true,
            name: true,
            trustScore: true,
            profilePicture: true,
          },
        },
      },
    });

    void logActivity(founderId, 'STARTUP_UPDATED').catch(() => {});
    void trustScoreService.recalculate(founderId, 'Startup updated').catch((err) => {
      console.error('Trust score recalculation failed:', err);
    });

    return startup;
  },

  async save(
    founderId: string,
    data: {
      startupName: string;
      description: string;
      pitch: string;
      domain: Domain;
      fundingStage: FundingStage;
      teamSize: number;
      pitchDeckUrl?: string | null;
      websiteUrl?: string | null;
      metrics?: Record<string, string | number>;
    }
  ) {
    const metrics = data.metrics as Prisma.InputJsonValue | undefined;
    const { metrics: _m, ...rest } = data;

    const existing = await prisma.startup.findUnique({
      where: { founderId },
      select: { id: true },
    });

    const startup = await prisma.startup.upsert({
      where: { founderId },
      create: {
        founderId,
        ...rest,
        metrics,
      },
      update: {
        ...rest,
        metrics,
      },
      include: {
        founder: {
          select: {
            id: true,
            name: true,
            trustScore: true,
            profilePicture: true,
          },
        },
      },
    });

    void logActivity(
      founderId,
      existing ? 'STARTUP_UPDATED' : 'STARTUP_CREATED',
      { startupId: startup.id }
    ).catch(() => {});
    void trustScoreService
      .recalculate(founderId, existing ? 'Startup updated' : 'Startup created')
      .catch((err) => {
        console.error('Trust score recalculation failed:', err);
      });

    return startup;
  },

  async getByFounder(founderId: string) {
    const startup = await prisma.startup.findUnique({
      where: { founderId },
      include: {
        founder: {
          select: {
            id: true,
            name: true,
            trustScore: true,
            profilePicture: true,
            bio: true,
            skills: true,
          },
        },
      },
    });
    if (!startup) throw new AppError('Startup not found', 404);
    return startup;
  },

  async getById(id: string) {
    const startup = await prisma.startup.findUnique({
      where: { id },
      include: {
        founder: {
          select: {
            id: true,
            name: true,
            trustScore: true,
            profilePicture: true,
            bio: true,
            skills: true,
            profileCompleteness: true,
            responseRate: true,
            endorsementScore: true,
            activityScore: true,
            _count: { select: { endorsementsReceived: true } },
          },
        },
      },
    });
    if (!startup) throw new AppError('Startup not found', 404);
    return startup;
  },

  async discover(query: {
    search?: string;
    domain?: Domain;
    fundingStage?: FundingStage;
    minTrustScore?: number;
    maxTrustScore?: number;
    sortBy?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const skip = (page - 1) * limit;

    const where: Prisma.StartupWhereInput = {
      founder: {},
    };

    if (query.search) {
      where.OR = [
        { startupName: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { pitch: { contains: query.search, mode: 'insensitive' } },
        {
          founder: {
            name: { contains: query.search, mode: 'insensitive' },
          },
        },
      ];
    }

    if (query.domain) where.domain = query.domain;
    if (query.fundingStage) where.fundingStage = query.fundingStage;

    if (query.minTrustScore !== undefined || query.maxTrustScore !== undefined) {
      where.founder = {
        ...(where.founder as Prisma.UserWhereInput),
        trustScore: {
          ...(query.minTrustScore !== undefined && { gte: query.minTrustScore }),
          ...(query.maxTrustScore !== undefined && { lte: query.maxTrustScore }),
        },
      };
    }

    let orderBy: Prisma.StartupOrderByWithRelationInput = { createdAt: 'desc' };

    switch (query.sortBy) {
      case 'trustScore':
        orderBy = { founder: { trustScore: 'desc' } };
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'recentActivity':
        orderBy = { updatedAt: 'desc' };
        break;
      case 'endorsements':
        orderBy = { founder: { endorsementScore: 'desc' } };
        break;
    }

    const [startups, total] = await Promise.all([
      prisma.startup.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          founder: {
            select: {
              id: true,
              name: true,
              trustScore: true,
              profilePicture: true,
              _count: { select: { endorsementsReceived: true } },
            },
          },
        },
      }),
      prisma.startup.count({ where }),
    ]);

    return {
      startups,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getFounderAnalytics(founderId: string) {
    const startup = await prisma.startup.findUnique({
      where: { founderId },
    });

    const founderConnections = {
      OR: [{ receiverId: founderId }, { senderId: founderId }],
    };

    const [requestsReceived, connectionsAccepted, endorsements] = await Promise.all([
      prisma.connectionRequest.count({ where: founderConnections }),
      prisma.connectionRequest.count({
        where: { ...founderConnections, status: 'ACCEPTED' },
      }),
      prisma.endorsement.count({ where: { toUserId: founderId } }),
    ]);

    return {
      startup,
      requestsReceived,
      connectionsAccepted,
      endorsements,
      conversionRate:
        requestsReceived > 0
          ? Math.round((connectionsAccepted / requestsReceived) * 100)
          : 0,
    };
  },
};
