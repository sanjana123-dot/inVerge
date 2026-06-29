import { z } from 'zod';

const experienceFields = {
  title: z.string().min(1).max(100),
  company: z.string().min(1).max(100),
  location: z.string().max(100).optional().nullable(),
  startDate: z.string().datetime({ message: 'Invalid start date' }),
  endDate: z.string().datetime({ message: 'Invalid end date' }).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
};

export const createExperienceSchema = z
  .object(experienceFields)
  .refine(
    (data) => {
      if (!data.endDate) return true;
      return new Date(data.endDate) >= new Date(data.startDate);
    },
    { message: 'End date must be on or after start date', path: ['endDate'] }
  );

export const updateExperienceSchema = z
  .object({
    title: experienceFields.title.optional(),
    company: experienceFields.company.optional(),
    location: experienceFields.location,
    startDate: experienceFields.startDate.optional(),
    endDate: experienceFields.endDate,
    description: experienceFields.description,
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) return true;
      return new Date(data.endDate) >= new Date(data.startDate);
    },
    { message: 'End date must be on or after start date', path: ['endDate'] }
  );
