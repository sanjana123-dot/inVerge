import { Response } from 'express';
import { ApiResponse } from '../types';

export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode = 200
) => {
  const body: ApiResponse<T> = { success: true, message, data };
  return res.status(statusCode).json(body);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 400,
  errors?: Record<string, string[]>
) => {
  const body: ApiResponse = { success: false, message, errors };
  return res.status(statusCode).json(body);
};
