import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { getValidated } from '../middleware/validate';
import { userService } from '../services/user.service';
import { endorsementService } from '../services/endorsement.service';
import { sendSuccess } from '../utils/apiResponse';

export const userController = {
  getMe: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = await userService.getMe(req.user!.userId);
      sendSuccess(res, 'Profile retrieved', user);
    } catch (err) {
      next(err);
    }
  },

  getById: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = await userService.getById(String(req.params.id));
      sendSuccess(res, 'User retrieved', user);
    } catch (err) {
      next(err);
    }
  },

  recordProfileView: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await userService.recordProfileView(
        req.user!.userId,
        String(req.params.id)
      );
      sendSuccess(res, 'Profile view recorded', result);
    } catch (err) {
      next(err);
    }
  },

  updateProfile: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await userService.updateProfile(req.user!.userId, req.body);
      sendSuccess(res, 'Profile updated', result);
    } catch (err) {
      next(err);
    }
  },

  getStats: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await userService.getStats(req.user!.userId);
      sendSuccess(res, 'Stats retrieved', stats);
    } catch (err) {
      next(err);
    }
  },

  deleteAccount: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await userService.deleteAccount(req.user!.userId, req.body.password);
      sendSuccess(res, 'Account deleted permanently');
    } catch (err) {
      next(err);
    }
  },

  discoverInvestors: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const query = getValidated<Parameters<typeof userService.discoverInvestors>[0]>(req, 'query');
      const result = await userService.discoverInvestors(query);
      sendSuccess(res, 'Investors retrieved', result);
    } catch (err) {
      next(err);
    }
  },

  getEndorsements: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await endorsementService.getPublicProfileEndorsements(
        String(req.params.userId)
      );
      sendSuccess(res, 'User endorsements retrieved', result);
    } catch (err) {
      next(err);
    }
  },
};
