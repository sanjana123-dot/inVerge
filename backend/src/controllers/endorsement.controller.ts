import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { getValidated } from '../middleware/validate';
import { endorsementService } from '../services/endorsement.service';
import { sendSuccess } from '../utils/apiResponse';

export const endorsementController = {
  getCategories: async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const categories = await endorsementService.getCategories();
      sendSuccess(res, 'Categories retrieved', categories);
    } catch (err) {
      next(err);
    }
  },

  create: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = getValidated<{
        toUserId: string;
        connectionRequestId: string;
        categories: string[];
        message: string;
      }>(req, 'body');
      const endorsement = await endorsementService.create(req.user!.userId, body);
      sendSuccess(res, 'Endorsement created', endorsement, 201);
    } catch (err) {
      next(err);
    }
  },

  update: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = getValidated<{ categories: string[]; message: string }>(req, 'body');
      const endorsement = await endorsementService.update(
        String(req.params.id),
        req.user!.userId,
        body
      );
      sendSuccess(res, 'Endorsement updated', endorsement);
    } catch (err) {
      next(err);
    }
  },

  remove: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await endorsementService.remove(String(req.params.id), req.user!.userId);
      sendSuccess(res, 'Endorsement deleted');
    } catch (err) {
      next(err);
    }
  },

  getReceived: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const endorsements = await endorsementService.getReceived(req.user!.userId);
      sendSuccess(res, 'Endorsements retrieved', endorsements);
    } catch (err) {
      next(err);
    }
  },

  getGiven: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const endorsements = await endorsementService.getGiven(req.user!.userId);
      sendSuccess(res, 'Given endorsements retrieved', endorsements);
    } catch (err) {
      next(err);
    }
  },

  getEligibility: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await endorsementService.getEligibility(
        req.user!.userId,
        String(req.params.toUserId)
      );
      sendSuccess(res, 'Endorsement eligibility retrieved', result);
    } catch (err) {
      next(err);
    }
  },
};
