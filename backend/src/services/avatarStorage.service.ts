import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'avatars');

const ALLOWED_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export function avatarExtension(mimetype: string): string {
  return ALLOWED_EXT[mimetype] ?? '.jpg';
}

export async function saveAvatarLocally(
  buffer: Buffer,
  mimetype: string,
  userId: string
): Promise<string> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const ext = avatarExtension(mimetype);
  const filename = `${userId}-${Date.now()}${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);

  const publicBase =
    process.env.API_PUBLIC_URL?.replace(/\/$/, '') || `http://localhost:${env.PORT}`;
  return `${publicBase}/uploads/avatars/${encodeURIComponent(filename)}`;
}
