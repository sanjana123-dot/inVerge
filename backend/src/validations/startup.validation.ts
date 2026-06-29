import { z } from 'zod';
import { optionalUrl } from './helpers';

const domainEnum = z.enum([
  'FINTECH',
  'HEALTHTECH',
  'AI',
  'EDTECH',
  'CLIMATETECH',
  'SAAS',
]);

const fundingStageEnum = z.enum([
  'IDEA',
  'PRE_SEED',
  'SEED',
  'SERIES_A',
  'SERIES_B',
]);

export const createStartupSchema = z.object({
  startupName: z.string().min(2).max(100),
  description: z.string().min(10).max(2000),
  pitch: z.string().min(10).max(5000),
  domain: domainEnum,
  fundingStage: fundingStageEnum,
  teamSize: z.number().int().min(1).max(10000),
  pitchDeckUrl: optionalUrl,
  websiteUrl: optionalUrl,
  metrics: z.record(z.union([z.string(), z.number()])).optional(),
});

export const updateStartupSchema = createStartupSchema.partial();

export const discoveryQuerySchema = z.object({
  search: z.string().optional(),
  domain: domainEnum.optional(),
  fundingStage: fundingStageEnum.optional(),
  minTrustScore: z.coerce.number().min(0).max(100).optional(),
  maxTrustScore: z.coerce.number().min(0).max(100).optional(),
  sortBy: z
    .enum(['trustScore', 'recentActivity', 'endorsements', 'newest'])
    .default('trustScore'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
