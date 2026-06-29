import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export const logActivity = async (
  userId: string,
  action: string,
  metadata?: Record<string, unknown>
) => {
  return prisma.activityLog.create({
    data: {
      userId,
      action,
      metadata: metadata as Prisma.InputJsonValue | undefined,
    },
  });
};

export const getRecentActivity = async (userId: string, limit = 10) => {
  return prisma.activityLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
};

export const getActivityCountLast30Days = async (userId: string): Promise<number> => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return prisma.activityLog.count({
    where: {
      userId,
      createdAt: { gte: thirtyDaysAgo },
    },
  });
};
