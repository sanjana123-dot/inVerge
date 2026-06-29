import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthPayload } from '../types';

export const signAccessToken = (payload: AuthPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
};

export const signRefreshToken = (payload: { userId: string }): string => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
};

export const verifyAccessToken = (token: string): AuthPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
};

export const verifyRefreshToken = (token: string): { userId: string } => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };
};

export const getRefreshTokenExpiry = (): Date => {
  const days = 7;
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry;
};
