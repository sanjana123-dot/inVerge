import { prisma } from '../config/database';
import { Domain, Prisma, Role } from '@prisma/client';
import { trustScoreService } from './trustScore.service';
import { logActivity } from './activity.service';
import { calculateProfileCompleteness } from '../utils/profileCompleteness';
import { viewService } from './view.service';
import { comparePassword } from '../utils/password';
import { AppError } from '../middleware/errorHandler';

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  bio: true,
  profilePicture: true,
  skills: true,
  trustScore: true,
  profileCompleteness: true,
  responseRate: true,
  endorsementScore: true,
  activityScore: true,
  investmentInterests: true,
  domains: true,
  portfolioPreference: true,
  createdAt: true,
  startup: true,
  experiences: {
    select: {
      id: true,
      title: true,
      company: true,
      location: true,
      startDate: true,
      endDate: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ startDate: 'desc' as const }, { createdAt: 'desc' as const }],
  },
  _count: {
    select: {
      endorsementsReceived: true,
      receivedRequests: true,
    },
  },
};

export const userService = {
  async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
    if (!user) throw new AppError('User not found', 404);

    const breakdown = trustScoreService.buildBreakdown({
      profileCompleteness: user.profileCompleteness ?? 0,
      responseRate: user.responseRate ?? 0,
      endorsements: user.endorsementScore ?? 0,
      activityConsistency: user.activityScore ?? 0,
    });

    const { email: _email, ...publicUser } = user;

    return {
      ...publicUser,
      profileCompletenessPercent: calculateProfileCompleteness(user),
      trustScoreBreakdown: breakdown,
    };
  },

  async recordProfileView(viewerId: string, viewedUserId: string) {
    return viewService.recordProfileView(viewerId, viewedUserId);
  },

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...publicUserSelect,
        email: true,
        updatedAt: true,
      },
    });
    if (!user) throw new AppError('User not found', 404);

    const completeness = calculateProfileCompleteness(user);

    return { ...user, profileCompletenessPercent: completeness };
  },

  async updateProfile(
    userId: string,
    data: {
      name?: string;
      bio?: string;
      profilePicture?: string | null;
      skills?: string[];
      investmentInterests?: string[];
      domains?: ('FINTECH' | 'HEALTHTECH' | 'AI' | 'EDTECH' | 'CLIMATETECH' | 'SAAS')[];
      portfolioPreference?: string | null;
    }
  ) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: publicUserSelect,
    });

    void logActivity(userId, 'PROFILE_UPDATED').catch(() => {});
    void trustScoreService.recalculate(userId, 'Profile update').catch((err) => {
      console.error('Trust score recalculation failed:', err);
    });

    return { user };
  },

  async getStats(userId: string) {
    const [endorsements, requestsSent, requestsReceived, messages] =
      await Promise.all([
        prisma.endorsement.count({ where: { toUserId: userId } }),
        prisma.connectionRequest.count({ where: { senderId: userId } }),
        prisma.connectionRequest.count({ where: { receiverId: userId } }),
        prisma.message.count({
          where: { OR: [{ senderId: userId }, { receiverId: userId }] },
        }),
      ]);

    return {
      endorsementsReceived: endorsements,
      requestsSent,
      requestsReceived,
      messagesCount: messages,
    };
  },

  async deleteAccount(userId: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });
    if (!user) throw new AppError('User not found', 404);

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) throw new AppError('Incorrect password', 401);

    await prisma.user.delete({ where: { id: userId } });

    return true;
  },

  async discoverInvestors(query: {
    name?: string;
    search?: string;
    domain?: Domain;
    interest?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const skip = (page - 1) * limit;

    const and: Prisma.UserWhereInput[] = [{ role: Role.INVESTOR }];

    const textSearch = (query.search || query.name)?.trim();
    const interestSearch = query.interest?.trim();
    const searchingByText = Boolean(textSearch || interestSearch);

    if (textSearch) {
      and.push({
        OR: [
          { name: { contains: textSearch, mode: 'insensitive' } },
          { bio: { contains: textSearch, mode: 'insensitive' } },
          { portfolioPreference: { contains: textSearch, mode: 'insensitive' } },
          { investmentInterests: { has: textSearch } },
        ],
      });
    }

    if (interestSearch) {
      and.push({
        OR: [
          { bio: { contains: interestSearch, mode: 'insensitive' } },
          { portfolioPreference: { contains: interestSearch, mode: 'insensitive' } },
          { investmentInterests: { has: interestSearch } },
          { name: { contains: interestSearch, mode: 'insensitive' } },
        ],
      });
    }

    // Domain chips apply when browsing; skip during name/interest search so
    // investors without domains set still appear when searched by name.
    if (query.domain && !searchingByText) {
      and.push({ domains: { has: query.domain } });
    }

    const where: Prisma.UserWhereInput = { AND: and };

    let orderBy: Prisma.UserOrderByWithRelationInput = { trustScore: 'desc' };

    switch (query.sortBy) {
      case 'recentActivity':
        orderBy = { activityScore: 'desc' };
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'trustScore':
      default:
        orderBy = { trustScore: 'desc' };
        break;
    }

    const investorSelect = {
      id: true,
      name: true,
      bio: true,
      profilePicture: true,
      skills: true,
      trustScore: true,
      activityScore: true,
      endorsementScore: true,
      investmentInterests: true,
      domains: true,
      portfolioPreference: true,
      createdAt: true,
      _count: {
        select: {
          endorsementsReceived: true,
        },
      },
    };

    const [investors, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: investorSelect,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      investors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};
