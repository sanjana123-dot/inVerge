import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { getValidated } from '../middleware/validate';
import { startupService } from '../services/startup.service';
import { viewService } from '../services/view.service';
import { sendSuccess } from '../utils/apiResponse';

export const startupController = {
  create: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const startup = await startupService.create(req.user!.userId, req.body);
      sendSuccess(res, 'Startup created', startup, 201);
    } catch (err) {
      next(err);
    }
  },

  update: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const startup = await startupService.update(req.user!.userId, req.body);
      sendSuccess(res, 'Startup updated', startup);
    } catch (err) {
      next(err);
    }
  },

  getMine: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const startup = await startupService.getByFounder(req.user!.userId);
      sendSuccess(res, 'Startup retrieved', startup);
    } catch (err) {
      next(err);
    }
  },

  getById: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const startup = await startupService.getById(String(req.params.id));
      sendSuccess(res, 'Startup retrieved', startup);
    } catch (err) {
      next(err);
    }
  },

  recordView: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await viewService.recordStartupView(
        req.user!.userId,
        String(req.params.id)
      );
      sendSuccess(res, 'Startup view recorded', result);
    } catch (err) {
      next(err);
    }
  },

  discover: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const query = getValidated<Parameters<typeof startupService.discover>[0]>(req, 'query');
      const result = await startupService.discover(query);
      sendSuccess(res, 'Startups retrieved', result);
    } catch (err) {
      next(err);
    }
  },

  save: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const startup = await startupService.save(req.user!.userId, req.body);
      sendSuccess(res, 'Startup saved', startup);
    } catch (err) {
      next(err);
    }
  },

  analytics: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const analytics = await startupService.getFounderAnalytics(req.user!.userId);
      sendSuccess(res, 'Analytics retrieved', analytics);
    } catch (err) {
      next(err);
    }
  },
};
