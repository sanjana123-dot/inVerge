import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

type RequestPart = 'body' | 'query' | 'params';

type RequestWithValidated = Request & {
  validated?: Partial<Record<RequestPart, unknown>>;
};

/** Read Zod-validated data (required for query/params on Express 5). */
export function getValidated<T>(req: Request, part: RequestPart): T {
  const r = req as RequestWithValidated;
  if (r.validated?.[part] !== undefined) {
    return r.validated[part] as T;
  }
  return req[part] as T;
}

export const validate =
  (schema: ZodSchema, part: RequestPart = 'body') =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      return next(result.error);
    }

    const r = req as RequestWithValidated;
    if (part === 'body') {
      // body remains writable in Express 5
      req.body = result.data;
    } else {
      // query and params are read-only getters in Express 5
      r.validated = { ...r.validated, [part]: result.data };
    }
    next();
  };
