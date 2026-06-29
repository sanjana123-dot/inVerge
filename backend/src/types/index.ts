import { Role, RequestStatus, RequestIntent, Domain, FundingStage, NotificationType } from '@prisma/client';
import { Request } from 'express';

export { Role, RequestStatus, RequestIntent, Domain, FundingStage, NotificationType };

export interface AuthPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
  /** Zod-parsed values when req.body/query/params cannot be reassigned (Express 5) */
  validated?: {
    body?: unknown;
    query?: unknown;
    params?: unknown;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}
