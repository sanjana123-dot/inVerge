import bcrypt from 'bcryptjs';

/** 10 balances security and speed; use 12 in production if you prefer slower hashing */
const SALT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};
