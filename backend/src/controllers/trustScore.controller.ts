import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { trustScoreService } from '../services/trustScore.service';
import { getRecentActivity } from '../services/activity.service';
import { sendSuccess } from '../utils/apiResponse';

export const trustScoreController = {
  getMine: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const trustData = await trustScoreService.getCached(req.user!.userId);
      sendSuccess(res, 'Trust score retrieved', trustData);
    } catch (err) {
      next(err);
    }
  },

  refresh: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const trustData = await trustScoreService.recalculate(
        req.user!.userId,
        'Manual refresh'
      );
      sendSuccess(res, 'Trust score refreshed', trustData);
    } catch (err) {
      next(err);
    }
  },

  getHistory: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const history = await trustScoreService.getHistory(req.user!.userId);
      sendSuccess(res, 'Trust score history retrieved', history);
    } catch (err) {
      next(err);
    }
  },

  getActivity: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const activity = await getRecentActivity(req.user!.userId);
      sendSuccess(res, 'Activity retrieved', activity);
    } catch (err) {
      next(err);
    }
  },
};
