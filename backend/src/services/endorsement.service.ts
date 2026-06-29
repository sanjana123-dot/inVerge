import { prisma } from '../config/database';
import { MAX_DAILY_ENDORSEMENTS } from '../constants/endorsementCategories';
import { endorsementRepository, formatEndorsement } from '../repositories/endorsement.repository';
import { trustScoreService } from './trustScore.service';
import { logActivity } from './activity.service';
import { notificationService } from './notification.service';
import { AppError } from '../middleware/errorHandler';

async function validateAcceptedConnection(
  fromUserId: string,
  toUserId: string,
  connectionRequestId: string
) {
  if (fromUserId === toUserId) {
    throw new AppError('Cannot endorse yourself', 400);
  }

  const connection = await prisma.connectionRequest.findUnique({
    where: { id: connectionRequestId },
    select: { id: true, senderId: true, receiverId: true, status: true },
  });

  if (!connection) {
    throw new AppError('Connection request not found', 404);
  }

  if (connection.status !== 'ACCEPTED') {
    throw new AppError('Endorsements require an accepted connection', 403);
  }

  const participants = new Set([connection.senderId, connection.receiverId]);
  if (!participants.has(fromUserId) || !participants.has(toUserId)) {
    throw new AppError('Connection request does not match the users involved', 400);
  }
}

async function resolveCategoryIds(categoryNames: string[]) {
  await endorsementRepository.ensureCategoriesSeeded();
  const uniqueNames = [...new Set(categoryNames)];
  const categories = await endorsementRepository.findCategoriesByNames(uniqueNames);

  if (categories.length !== uniqueNames.length) {
    throw new AppError('One or more endorsement categories are invalid', 400);
  }

  return categories.map((c) => c.id);
}

function aggregateTopTraits(
  endorsements: Awaited<ReturnType<typeof endorsementRepository.findPublicForUser>>,
  limit = 5
) {
  const counts = new Map<string, number>();

  for (const endorsement of endorsements) {
    for (const mapping of endorsement.categoryMappings) {
      const name = mapping.category.name;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

export const endorsementService = {
  async getCategories() {
    await endorsementRepository.ensureCategoriesSeeded();
    return endorsementRepository.findAllCategories();
  },

  async create(
    fromUserId: string,
    data: {
      toUserId: string;
      connectionRequestId: string;
      categories: string[];
      message: string;
    }
  ) {
    await validateAcceptedConnection(
      fromUserId,
      data.toUserId,
      data.connectionRequestId
    );

    const existing = await endorsementRepository.findByPair(fromUserId, data.toUserId);
    if (existing) {
      throw new AppError(
        'You have already endorsed this user. Update your existing endorsement instead.',
        409
      );
    }

    const todayCount = await endorsementRepository.countCreatedToday(fromUserId);
    if (todayCount >= MAX_DAILY_ENDORSEMENTS) {
      throw new AppError(
        `Daily endorsement limit reached (${MAX_DAILY_ENDORSEMENTS} per day)`,
        429
      );
    }

    const categoryIds = await resolveCategoryIds(data.categories);

    const endorsement = await endorsementRepository.createWithCategories({
      fromUserId,
      toUserId: data.toUserId,
      connectionRequestId: data.connectionRequestId,
      message: data.message,
      categoryIds,
    });

    void logActivity(fromUserId, 'ENDORSEMENT_GIVEN', {
      toUserId: data.toUserId,
      endorsementId: endorsement.id,
    }).catch(() => {});

    void trustScoreService
      .recalculate(data.toUserId, 'Endorsement received')
      .catch((err) => console.error('Trust score recalculation failed:', err));

    void notificationService
      .create(
        data.toUserId,
        'ENDORSEMENT_RECEIVED',
        'New endorsement',
        'You received a new endorsement.',
        { endorsementId: endorsement.id, fromUserId }
      )
      .catch(() => {});

    return formatEndorsement(endorsement);
  },

  async update(
    endorsementId: string,
    fromUserId: string,
    data: { categories: string[]; message: string }
  ) {
    const existing = await endorsementRepository.findById(endorsementId);
    if (!existing) throw new AppError('Endorsement not found', 404);
    if (existing.fromUserId !== fromUserId) {
      throw new AppError('Only the creator can update this endorsement', 403);
    }

    const categoryIds = await resolveCategoryIds(data.categories);

    const updated = await endorsementRepository.updateWithCategories(endorsementId, {
      message: data.message,
      categoryIds,
    });

    void trustScoreService
      .recalculate(existing.toUserId, 'Endorsement updated')
      .catch((err) => console.error('Trust score recalculation failed:', err));

    return formatEndorsement(updated);
  },

  async remove(endorsementId: string, fromUserId: string) {
    const existing = await endorsementRepository.findById(endorsementId);
    if (!existing) throw new AppError('Endorsement not found', 404);
    if (existing.fromUserId !== fromUserId) {
      throw new AppError('Only the creator can delete this endorsement', 403);
    }

    await endorsementRepository.deleteById(endorsementId);

    void trustScoreService
      .recalculate(existing.toUserId, 'Endorsement deleted')
      .catch((err) => console.error('Trust score recalculation failed:', err));

    return true;
  },

  async getReceived(userId: string) {
    const endorsements = await endorsementRepository.findReceived(userId);
    return endorsements.map((e) => formatEndorsement(e));
  },

  async getGiven(userId: string) {
    const endorsements = await endorsementRepository.findGiven(userId);
    return endorsements.map((e) => formatEndorsement(e));
  },

  async getPublicProfileEndorsements(userId: string) {
    const endorsements = await endorsementRepository.findPublicForUser(userId);
    const totalCount = endorsements.length;
    const topTraits = aggregateTopTraits(endorsements);

    return {
      totalCount,
      topTraits,
      endorsements: endorsements.map((e) => ({
        id: e.id,
        message: e.message,
        categories: e.categoryMappings.map((m) => m.category.name),
        createdAt: e.createdAt,
        endorser: {
          id: e.fromUser.id,
          name: e.fromUser.name,
          role: e.fromUser.role,
          profilePicture: e.fromUser.profilePicture,
        },
      })),
    };
  },

  async getEligibility(fromUserId: string, toUserId: string) {
    if (fromUserId === toUserId) {
      return { canEndorse: false, connectionRequestId: null, existingEndorsement: null };
    }

    const [connection, existing] = await Promise.all([
      prisma.connectionRequest.findFirst({
        where: {
          status: 'ACCEPTED',
          OR: [
            { senderId: fromUserId, receiverId: toUserId },
            { senderId: toUserId, receiverId: fromUserId },
          ],
        },
        select: { id: true },
      }),
      endorsementRepository.findByPair(fromUserId, toUserId),
    ]);

    return {
      canEndorse: Boolean(connection),
      connectionRequestId: connection?.id ?? null,
      existingEndorsement: existing ? formatEndorsement(existing) : null,
    };
  },
};
