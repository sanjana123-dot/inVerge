import { prisma } from '../config/database';
import { ENDORSEMENT_CATEGORY_NAMES } from '../constants/endorsementCategories';

const endorsementInclude = {
  fromUser: {
    select: { id: true, name: true, profilePicture: true, role: true },
  },
  toUser: {
    select: { id: true, name: true, profilePicture: true, role: true },
  },
  categoryMappings: {
    include: {
      category: { select: { id: true, name: true } },
    },
  },
} as const;

export const endorsementRepository = {
  async ensureCategoriesSeeded() {
    await Promise.all(
      ENDORSEMENT_CATEGORY_NAMES.map((name) =>
        prisma.endorsementCategory.upsert({
          where: { name },
          create: { name },
          update: {},
        })
      )
    );
  },

  async findCategoriesByNames(names: string[]) {
    return prisma.endorsementCategory.findMany({
      where: { name: { in: names } },
    });
  },

  async findAllCategories() {
    return prisma.endorsementCategory.findMany({
      orderBy: { name: 'asc' },
    });
  },

  findById(id: string) {
    return prisma.endorsement.findUnique({
      where: { id },
      include: endorsementInclude,
    });
  },

  findByPair(fromUserId: string, toUserId: string) {
    return prisma.endorsement.findUnique({
      where: { fromUserId_toUserId: { fromUserId, toUserId } },
      include: endorsementInclude,
    });
  },

  countCreatedToday(fromUserId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return prisma.endorsement.count({
      where: {
        fromUserId,
        createdAt: { gte: startOfDay },
      },
    });
  },

  createWithCategories(data: {
    fromUserId: string;
    toUserId: string;
    connectionRequestId: string;
    message: string;
    categoryIds: string[];
  }) {
    return prisma.endorsement.create({
      data: {
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        connectionRequestId: data.connectionRequestId,
        message: data.message,
        categoryMappings: {
          create: data.categoryIds.map((categoryId) => ({ categoryId })),
        },
      },
      include: endorsementInclude,
    });
  },

  updateWithCategories(id: string, data: { message: string; categoryIds: string[] }) {
    return prisma.$transaction(async (tx) => {
      await tx.endorsementCategoryMapping.deleteMany({
        where: { endorsementId: id },
      });
      return tx.endorsement.update({
        where: { id },
        data: {
          message: data.message,
          categoryMappings: {
            create: data.categoryIds.map((categoryId) => ({ categoryId })),
          },
        },
        include: endorsementInclude,
      });
    });
  },

  deleteById(id: string) {
    return prisma.endorsement.delete({ where: { id } });
  },

  findReceived(userId: string, limit = 50) {
    return prisma.endorsement.findMany({
      where: { toUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: endorsementInclude,
    });
  },

  findGiven(userId: string, limit = 50) {
    return prisma.endorsement.findMany({
      where: { fromUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: endorsementInclude,
    });
  },

  findPublicForUser(userId: string, limit = 50) {
    return prisma.endorsement.findMany({
      where: { toUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: endorsementInclude,
    });
  },

  countReceived(userId: string) {
    return prisma.endorsement.count({ where: { toUserId: userId } });
  },
};

export function formatEndorsement(
  endorsement: NonNullable<Awaited<ReturnType<typeof endorsementRepository.findById>>>
) {
  return {
    id: endorsement.id,
    fromUserId: endorsement.fromUserId,
    toUserId: endorsement.toUserId,
    connectionRequestId: endorsement.connectionRequestId,
    message: endorsement.message,
    categories: endorsement.categoryMappings.map((m) => m.category.name),
    createdAt: endorsement.createdAt,
    updatedAt: endorsement.updatedAt,
    fromUser: endorsement.fromUser,
    toUser: endorsement.toUser,
  };
}
