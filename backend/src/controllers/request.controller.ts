import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { requestService } from '../services/request.service';
import { sendSuccess } from '../utils/apiResponse';

export const requestController = {
  create: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const request = await requestService.create(req.user!.userId, req.body);
      sendSuccess(res, 'Request sent', request, 201);
    } catch (err) {
      next(err);
    }
  },

  respond: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { status } = req.body;
      const request = await requestService.respond(
        String(req.params.id),
        req.user!.userId,
        status
      );
      sendSuccess(res, `Request ${status.toLowerCase()}`, request);
    } catch (err) {
      next(err);
    }
  },

  getSent: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const requests = await requestService.getSent(req.user!.userId);
      sendSuccess(res, 'Sent requests retrieved', requests);
    } catch (err) {
      next(err);
    }
  },

  getReceived: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const requests = await requestService.getReceived(req.user!.userId);
      sendSuccess(res, 'Received requests retrieved', requests);
    } catch (err) {
      next(err);
    }
  },
};
