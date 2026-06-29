import { NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { getIO } from '../sockets';

export const notificationService = {
  async create(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, unknown>
  ) {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data: data as Prisma.InputJsonValue | undefined,
      },
    });

    try {
      const io = getIO();
      io.to(`user:${userId}`).emit('notification:new', notification);
    } catch {
      // Socket not initialized yet
    }

    return notification;
  },

  async getForUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, read: false } }),
    ]);

    return { notifications, total, unreadCount, page, limit };
  },

  async markAsRead(userId: string, notificationId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  },

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  },
};
