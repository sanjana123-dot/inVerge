import { prisma } from '../config/database';
import { calculateProfileCompleteness } from '../utils/profileCompleteness';

/**
 * Trust Score Formula:
 * score = 0.3 * profileCompleteness + 0.2 * responseRate +
 *         0.3 * endorsements + 0.2 * activityConsistency
 *
 * Each component is normalized to 0-100 before weighting.
 */
export const trustScoreService = {
  async calculateComponents(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { startup: true, experiences: { select: { id: true } } },
    });

    if (!user) throw new Error('User not found');

    const profileCompleteness = calculateProfileCompleteness(user);

    const [sentRequests, respondedRequests, totalReceived, endorsementCount, activityCount] =
      await Promise.all([
        prisma.connectionRequest.count({ where: { senderId: userId } }),
        prisma.connectionRequest.count({
          where: {
            receiverId: userId,
            status: { in: ['ACCEPTED', 'REJECTED'] },
          },
        }),
        prisma.connectionRequest.count({ where: { receiverId: userId } }),
        prisma.endorsement.count({ where: { toUserId: userId } }),
        prisma.activityLog.count({
          where: {
            userId,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

    const responseRate =
      totalReceived > 0
        ? Math.round((respondedRequests / totalReceived) * 100)
        : sentRequests > 0
          ? 50
          : 0;

    const endorsements = Math.min(endorsementCount * 10, 100);
    const activityConsistency = Math.min(activityCount * 5, 100);

    const loginBonus = Math.min((user.loginStreak || 0) * 5, 20);
    const activityWithLogin = Math.min(activityConsistency + loginBonus, 100);

    return {
      profileCompleteness,
      responseRate,
      endorsements,
      activityConsistency: activityWithLogin,
    };
  },

  buildBreakdown(components: {
    profileCompleteness: number;
    responseRate: number;
    endorsements: number;
    activityConsistency: number;
  }) {
    return {
      profileCompleteness: {
        value: components.profileCompleteness,
        weight: 0.3,
        contribution: Math.round(components.profileCompleteness * 0.3),
      },
      responseRate: {
        value: components.responseRate,
        weight: 0.2,
        contribution: Math.round(components.responseRate * 0.2),
      },
      endorsements: {
        value: components.endorsements,
        weight: 0.3,
        contribution: Math.round(components.endorsements * 0.3),
      },
      activityConsistency: {
        value: components.activityConsistency,
        weight: 0.2,
        contribution: Math.round(components.activityConsistency * 0.2),
      },
    };
  },

  /** Fast read of the stored score — no recalculation or history writes. */
  async getCached(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        trustScore: true,
        profileCompleteness: true,
        responseRate: true,
        endorsementScore: true,
        activityScore: true,
      },
    });

    if (!user) throw new Error('User not found');

    const components = {
      profileCompleteness: user.profileCompleteness ?? 0,
      responseRate: user.responseRate ?? 0,
      endorsements: user.endorsementScore ?? 0,
      activityConsistency: user.activityScore ?? 0,
    };

    return {
      ...user,
      breakdown: this.buildBreakdown(components),
    };
  },

  async recalculate(userId: string, reason?: string) {
    const components = await this.calculateComponents(userId);

    const score =
      0.3 * components.profileCompleteness +
      0.2 * components.responseRate +
      0.3 * components.endorsements +
      0.2 * components.activityConsistency;

    const roundedScore = Math.round(Math.min(Math.max(score, 0), 100) * 10) / 10;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        trustScore: roundedScore,
        profileCompleteness: components.profileCompleteness,
        responseRate: components.responseRate,
        endorsementScore: components.endorsements,
        activityScore: components.activityConsistency,
      },
      select: {
        id: true,
        trustScore: true,
        profileCompleteness: true,
        responseRate: true,
        endorsementScore: true,
        activityScore: true,
      },
    });

    await prisma.trustScoreHistory.create({
      data: {
        userId,
        score: roundedScore,
        profileCompleteness: components.profileCompleteness,
        responseRate: components.responseRate,
        endorsements: components.endorsements,
        activityConsistency: components.activityConsistency,
        reason,
      },
    });

    return {
      ...updated,
      breakdown: this.buildBreakdown(components),
    };
  },

  async getHistory(userId: string, limit = 30) {
    return prisma.trustScoreHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },
};
