import { z } from 'zod';
import { ENDORSEMENT_CATEGORY_NAMES } from '../constants/endorsementCategories';

const categoryNameEnum = z.enum(
  ENDORSEMENT_CATEGORY_NAMES as unknown as [string, ...string[]]
);

export const createEndorsementSchema = z.object({
  toUserId: z.string().cuid(),
  connectionRequestId: z.string().cuid(),
  categories: z.array(categoryNameEnum).min(1).max(10),
  message: z.string().trim().min(10).max(500),
});

export const updateEndorsementSchema = z.object({
  categories: z.array(categoryNameEnum).min(1).max(10),
  message: z.string().trim().min(10).max(500),
});
