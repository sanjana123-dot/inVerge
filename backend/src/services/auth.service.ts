import { Role } from '@prisma/client';
import { prisma } from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generatePasswordResetToken, hashPasswordResetToken } from '../utils/resetToken';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
} from '../utils/jwt';
import { calculateProfileCompleteness } from '../utils/profileCompleteness';
import { trustScoreService } from './trustScore.service';
import { logActivity } from './activity.service';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';

const userSelect = {
  id: true,
  email: true,
  name: true,
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
  updatedAt: true,
};

function schedulePostAuthSideEffects(userId: string, reason: string, activity: string) {
  void logActivity(userId, activity).catch(() => {});
  void trustScoreService.recalculate(userId, reason).catch((err) => {
    console.error('Trust score recalculation failed:', err);
  });
}

export const authService = {
  async signup(data: {
    name: string;
    email: string;
    password: string;
    role: Role;
  }) {
    const email = data.email.toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new AppError('Email already registered', 409);
    }

    const passwordHash = await hashPassword(data.password);
    const profileCompleteness = calculateProfileCompleteness({
      role: data.role,
      name: data.name,
      bio: null,
      profilePicture: null,
      skills: [],
      investmentInterests: [],
      domains: [],
      portfolioPreference: null,
      startup: null,
    });
    const initialTrustScore = Math.round(profileCompleteness * 0.3 * 10) / 10;

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email,
        passwordHash,
        role: data.role,
        profileCompleteness,
        trustScore: initialTrustScore,
      },
      select: userSelect,
    });

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    schedulePostAuthSideEffects(user.id, 'Initial signup', 'USER_SIGNUP');

    return { user, ...tokens };
  },

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !(await comparePassword(password, user.passwordHash))) {
      throw new AppError('Invalid email or password', 401);
    }

    const now = new Date();
    const lastLogin = user.lastLoginAt;
    let loginStreak = user.loginStreak;

    if (lastLogin) {
      const daysSince = Math.floor(
        (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSince === 1) loginStreak += 1;
      else if (daysSince > 1) loginStreak = 1;
    } else {
      loginStreak = 1;
    }

    const [profile, tokens] = await Promise.all([
      prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: now, loginStreak },
        select: userSelect,
      }),
      this.issueTokens(user.id, user.email, user.role),
    ]);

    schedulePostAuthSideEffects(user.id, 'Login consistency', 'USER_LOGIN');

    return { user: profile, ...tokens };
  },

  async refresh(refreshToken: string) {
    let payload: { userId: string };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError('Invalid refresh token', 401);
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new AppError('Refresh token expired', 401);
    }

    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const tokens = await this.issueTokens(
      stored.user.id,
      stored.user.email,
      stored.user.role
    );

    return tokens;
  },

  async logout(refreshToken?: string) {
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    return true;
  },

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new AppError('No account found with this email address', 404);
    }

    const { token, tokenHash, expiresAt } = generatePasswordResetToken();

    await prisma.$transaction([
      prisma.passwordReset.deleteMany({ where: { userId: user.id } }),
      prisma.passwordReset.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      }),
    ]);

    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;

    if (env.NODE_ENV === 'development') {
      console.log(`Password reset link for ${user.email}: ${resetUrl}`);
    }

    return { resetToken: token, resetUrl };
  },

  async resetPassword(token: string, password: string) {
    const tokenHash = hashPasswordResetToken(token);

    const reset = await prisma.passwordReset.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true } } },
    });

    if (!reset || reset.expiresAt < new Date()) {
      throw new AppError('Invalid or expired reset link. Please request a new one.', 400);
    }

    const passwordHash = await hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: reset.userId },
        data: { passwordHash },
      }),
      prisma.passwordReset.delete({ where: { id: reset.id } }),
      prisma.refreshToken.deleteMany({ where: { userId: reset.userId } }),
    ]);

    return true;
  },

  async issueTokens(userId: string, email: string, role: Role) {
    const accessToken = signAccessToken({ userId, email, role });
    const refreshToken = signRefreshToken({ userId });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    return { accessToken, refreshToken };
  },
};
