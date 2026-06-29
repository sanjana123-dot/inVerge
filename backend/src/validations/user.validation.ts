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

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  bio: z.string().max(1000).optional(),
  profilePicture: optionalUrl,
  skills: z.array(z.string().max(50)).max(20).optional(),
  investmentInterests: z.array(z.string().max(50)).max(20).optional(),
  domains: z.array(domainEnum).max(10).optional(),
  portfolioPreference: z.string().max(500).optional().nullable(),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

const queryString = z.preprocess(
  (val) => {
    if (val === '' || val === undefined || val === null) return undefined;
    if (Array.isArray(val)) return val[0];
    return val;
  },
  z.string().optional()
);

export const investorDiscoveryQuerySchema = z.object({
  name: queryString,
  search: queryString,
  domain: domainEnum.optional(),
  interest: queryString,
  sortBy: z.enum(['trustScore', 'recentActivity', 'newest']).default('trustScore'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
