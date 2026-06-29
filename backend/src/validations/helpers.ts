import { z } from 'zod';

/** Treat "" as null so optional URL fields do not fail validation. */
export const emptyStringToNull = (val: unknown) =>
  val === '' || val === undefined ? null : val;

export const optionalUrl = z.preprocess(
  emptyStringToNull,
  z.string().url().nullable().optional()
);
