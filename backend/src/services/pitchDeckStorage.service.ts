import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'pitch-decks');

export async function savePitchDeckLocally(
  buffer: Buffer,
  originalName: string,
  userId: string
): Promise<string> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const ext = path.extname(originalName).toLowerCase() || '.pdf';
  const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9._-]/g, '_') || 'deck';
  const filename = `${userId}-${Date.now()}-${base}${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);

  const publicBase =
    process.env.API_PUBLIC_URL?.replace(/\/$/, '') || `http://localhost:${env.PORT}`;
  return `${publicBase}/uploads/pitch-decks/${encodeURIComponent(filename)}`;
}
