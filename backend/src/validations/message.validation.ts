import { z } from 'zod';

export const sendMessageSchema = z.object({
  receiverId: z.string().cuid(),
  content: z.string().min(1).max(5000),
});

export const getMessagesQuerySchema = z.object({
  userId: z.string().cuid(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
