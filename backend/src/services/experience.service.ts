import { prisma } from '../config/database';
import { trustScoreService } from './trustScore.service';
import { logActivity } from './activity.service';
import { AppError } from '../middleware/errorHandler';

const experienceSelect = {
  id: true,
  title: true,
  company: true,
  location: true,
  startDate: true,
  endDate: true,
  description: true,
  createdAt: true,
  updatedAt: true,
};

type ExperienceInput = {
  title: string;
  company: string;
  location?: string | null;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
};

function toExperienceData(data: ExperienceInput) {
  return {
    title: data.title.trim(),
    company: data.company.trim(),
    location: data.location?.trim() || null,
    startDate: new Date(data.startDate),
    endDate: data.endDate ? new Date(data.endDate) : null,
    description: data.description?.trim() || null,
  };
}

async function assertOwnership(userId: string, experienceId: string) {
  const experience = await prisma.experience.findUnique({
    where: { id: experienceId },
    select: { userId: true },
  });
  if (!experience) throw new AppError('Experience not found', 404);
  if (experience.userId !== userId) throw new AppError('Forbidden', 403);
  return experience;
}

export const experienceService = {
  async list(userId: string) {
    return prisma.experience.findMany({
      where: { userId },
      select: experienceSelect,
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });
  },

  async create(userId: string, data: ExperienceInput) {
    const experience = await prisma.experience.create({
      data: {
        userId,
        ...toExperienceData(data),
      },
      select: experienceSelect,
    });

    void logActivity(userId, 'EXPERIENCE_ADDED', { experienceId: experience.id }).catch(() => {});
    void trustScoreService.recalculate(userId, 'Experience added').catch((err) => {
      console.error('Trust score recalculation failed:', err);
    });

    return experience;
  },

  async update(userId: string, experienceId: string, data: Partial<ExperienceInput>) {
    await assertOwnership(userId, experienceId);

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.company !== undefined) updateData.company = data.company.trim();
    if (data.location !== undefined) updateData.location = data.location?.trim() || null;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;

    const experience = await prisma.experience.update({
      where: { id: experienceId },
      data: updateData,
      select: experienceSelect,
    });

    void logActivity(userId, 'EXPERIENCE_UPDATED', { experienceId }).catch(() => {});
    void trustScoreService.recalculate(userId, 'Experience updated').catch((err) => {
      console.error('Trust score recalculation failed:', err);
    });

    return experience;
  },

  async remove(userId: string, experienceId: string) {
    await assertOwnership(userId, experienceId);

    await prisma.experience.delete({ where: { id: experienceId } });

    void logActivity(userId, 'EXPERIENCE_REMOVED', { experienceId }).catch(() => {});
    void trustScoreService.recalculate(userId, 'Experience removed').catch((err) => {
      console.error('Trust score recalculation failed:', err);
    });

    return true;
  },
};
