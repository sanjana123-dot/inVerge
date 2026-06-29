import { Role, Startup } from '@prisma/client';

type UserWithStartup = {
  role: Role;
  name: string;
  bio?: string | null;
  profilePicture?: string | null;
  skills: string[];
  investmentInterests?: string[];
  domains?: string[];
  portfolioPreference?: string | null;
  startup?: Startup | null;
  experiences?: { id: string }[];
};

const FOUNDER_FIELDS = [
  'name',
  'bio',
  'profilePicture',
  'skills',
] as const;

const INVESTOR_FIELDS = [
  'name',
  'bio',
  'profilePicture',
  'skills',
  'investmentInterests',
  'domains',
  'portfolioPreference',
] as const;

export const calculateProfileCompleteness = (user: UserWithStartup): number => {
  let filled = 0;
  let total = 0;

  const checkField = (value: unknown) => {
    total++;
    if (Array.isArray(value)) {
      if (value.length > 0) filled++;
    } else if (typeof value === 'string' && value.trim().length > 0) {
      filled++;
    } else if (value) {
      filled++;
    }
  };

  if (user.role === Role.FOUNDER) {
    FOUNDER_FIELDS.forEach((f) => checkField(user[f]));
    total++;
    if (user.experiences && user.experiences.length > 0) filled++;
    total += 5;
    if (user.startup) {
      const s = user.startup;
      if (s.startupName) filled++;
      if (s.description?.length > 20) filled++;
      if (s.pitch?.length > 20) filled++;
      if (s.pitchDeckUrl) filled++;
      if (s.teamSize > 0) filled++;
    }
  } else {
    INVESTOR_FIELDS.forEach((f) => checkField(user[f]));
    total++;
    if (user.experiences && user.experiences.length > 0) filled++;
  }

  return total > 0 ? Math.round((filled / total) * 100) : 0;
};
