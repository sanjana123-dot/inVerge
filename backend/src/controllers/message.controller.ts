import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { getValidated } from '../middleware/validate';
import { messageService } from '../services/message.service';
import { sendSuccess } from '../utils/apiResponse';

export const messageController = {
  send: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { receiverId, content } = req.body;
      const message = await messageService.send(req.user!.userId, receiverId, content);
      sendSuccess(res, 'Message sent', message, 201);
    } catch (err) {
      next(err);
    }
  },

  getConversation: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, page, limit } = getValidated<{
        userId: string;
        page?: number;
        limit?: number;
      }>(req, 'query');
      const result = await messageService.getConversation(
        req.user!.userId,
        userId,
        page,
        limit
      );
      sendSuccess(res, 'Messages retrieved', result);
    } catch (err) {
      next(err);
    }
  },

  getConversations: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const conversations = await messageService.getConversations(req.user!.userId);
      sendSuccess(res, 'Conversations retrieved', conversations);
    } catch (err) {
      next(err);
    }
  },
};
