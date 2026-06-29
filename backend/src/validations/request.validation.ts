import { z } from 'zod';

export const createRequestSchema = z.object({
  receiverId: z.string().cuid(),
  message: z.string().min(10).max(1000),
  intent: z.enum(['INVESTMENT', 'NETWORKING', 'MENTORSHIP']),
});

export const respondRequestSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED']),
});
