import crypto from 'crypto';

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export const generatePasswordResetToken = () => {
  const token = crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
  const tokenHash = hashPasswordResetToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  return { token, tokenHash, expiresAt };
};

export const hashPasswordResetToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');
