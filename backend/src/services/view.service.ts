import { prisma } from '../config/database';
import { notificationService } from './notification.service';
import { AppError } from '../middleware/errorHandler';

const VIEW_NOTIFY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export const viewService = {
  async recordProfileView(viewerId: string, viewedUserId: string) {
    if (viewerId === viewedUserId) {
      return { notified: false };
    }

    const [viewer, viewedUser] = await Promise.all([
      prisma.user.findUnique({
        where: { id: viewerId },
        select: { id: true, name: true, role: true },
      }),
      prisma.user.findUnique({
        where: { id: viewedUserId },
        select: { id: true },
      }),
    ]);

    if (!viewer || !viewedUser) {
      throw new AppError('User not found', 404);
    }

    const since = new Date(Date.now() - VIEW_NOTIFY_COOLDOWN_MS);
    const recent = await prisma.profileView.findFirst({
      where: {
        viewerId,
        viewedUserId,
        createdAt: { gte: since },
      },
    });

    await prisma.profileView.create({
      data: { viewerId, viewedUserId },
    });

    if (!recent) {
      void notificationService
        .create(
          viewedUserId,
          'PROFILE_VIEWED',
          'Profile viewed',
          `${viewer.name} (${viewer.role.toLowerCase()}) viewed your personal profile`,
          { viewerId, viewerName: viewer.name, type: 'profile' }
        )
        .catch(() => {});
      return { notified: true };
    }

    return { notified: false };
  },

  async recordStartupView(viewerId: string, startupId: string) {
    const startup = await prisma.startup.findUnique({
      where: { id: startupId },
      select: {
        id: true,
        startupName: true,
        founderId: true,
      },
    });

    if (!startup) {
      throw new AppError('Startup not found', 404);
    }

    if (viewerId === startup.founderId) {
      return { notified: false };
    }

    const viewer = await prisma.user.findUnique({
      where: { id: viewerId },
      select: { id: true, name: true, role: true },
    });

    if (!viewer) {
      throw new AppError('User not found', 404);
    }

    const since = new Date(Date.now() - VIEW_NOTIFY_COOLDOWN_MS);
    const recent = await prisma.startupView.findFirst({
      where: {
        viewerId,
        startupId,
        createdAt: { gte: since },
      },
    });

    await prisma.startupView.create({
      data: { viewerId, startupId },
    });

    if (!recent) {
      void notificationService
        .create(
          startup.founderId,
          'STARTUP_VIEWED',
          'Startup profile viewed',
          `${viewer.name} (${viewer.role.toLowerCase()}) viewed your startup "${startup.startupName}"`,
          {
            viewerId,
            viewerName: viewer.name,
            startupId: startup.id,
            startupName: startup.startupName,
            type: 'startup',
          }
        )
        .catch(() => {});
      return { notified: true };
    }

    return { notified: false };
  },
};
