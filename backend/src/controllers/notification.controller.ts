import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { notificationService } from '../services/notification.service';
import { sendSuccess } from '../utils/apiResponse';

export const notificationController = {
  getAll: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const result = await notificationService.getForUser(req.user!.userId, page, limit);
      sendSuccess(res, 'Notifications retrieved', result);
    } catch (err) {
      next(err);
    }
  },

  markAsRead: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await notificationService.markAsRead(req.user!.userId, String(req.params.id));
      sendSuccess(res, 'Notification marked as read');
    } catch (err) {
      next(err);
    }
  },

  markAllAsRead: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await notificationService.markAllAsRead(req.user!.userId);
      sendSuccess(res, 'All notifications marked as read');
    } catch (err) {
      next(err);
    }
  },
};
