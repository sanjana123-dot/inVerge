/** Predefined endorsement categories — add new entries here to scale the system. */
export const ENDORSEMENT_CATEGORY_NAMES = [
  'Professional Communication',
  'Transparency',
  'Strong Product Vision',
  'Technical Expertise',
  'Execution Ability',
  'Responsiveness',
  'Market Knowledge',
  'Leadership',
  'Investor Friendly',
  'Collaboration',
] as const;

export type EndorsementCategoryName = (typeof ENDORSEMENT_CATEGORY_NAMES)[number];

export const MAX_DAILY_ENDORSEMENTS = 5;
