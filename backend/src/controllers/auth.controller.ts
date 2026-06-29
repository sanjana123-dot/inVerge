import { Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { authService } from '../services/auth.service';
import { sendSuccess } from '../utils/apiResponse';

export const authController = {
  signup: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { name, email, password, role } = req.body;
      const result = await authService.signup({
        name,
        email,
        password,
        role: role as Role,
      });
      sendSuccess(res, 'Account created successfully', result, 201);
    } catch (err) {
      next(err);
    }
  },

  login: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      sendSuccess(res, 'Login successful', result);
    } catch (err) {
      next(err);
    }
  },

  refresh: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refresh(refreshToken);
      sendSuccess(res, 'Token refreshed', tokens);
    } catch (err) {
      next(err);
    }
  },

  logout: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      await authService.logout(refreshToken);
      sendSuccess(res, 'Logged out successfully');
    } catch (err) {
      next(err);
    }
  },

  forgotPassword: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      const result = await authService.forgotPassword(email);
      sendSuccess(res, 'Password reset link generated', result);
    } catch (err) {
      next(err);
    }
  },

  resetPassword: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body;
      await authService.resetPassword(token, password);
      sendSuccess(res, 'Password updated successfully');
    } catch (err) {
      next(err);
    }
  },
};
