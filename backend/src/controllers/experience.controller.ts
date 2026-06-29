import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { experienceService } from '../services/experience.service';
import { sendSuccess } from '../utils/apiResponse';

export const experienceController = {
  list: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const experiences = await experienceService.list(req.user!.userId);
      sendSuccess(res, 'Experience retrieved', experiences);
    } catch (err) {
      next(err);
    }
  },

  create: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const experience = await experienceService.create(req.user!.userId, req.body);
      sendSuccess(res, 'Experience added', experience, 201);
    } catch (err) {
      next(err);
    }
  },

  update: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const experience = await experienceService.update(
        req.user!.userId,
        String(req.params.id),
        req.body
      );
      sendSuccess(res, 'Experience updated', experience);
    } catch (err) {
      next(err);
    }
  },

  remove: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await experienceService.remove(req.user!.userId, String(req.params.id));
      sendSuccess(res, 'Experience removed');
    } catch (err) {
      next(err);
    }
  },
};
