import { Response, NextFunction } from 'express';
import { Readable } from 'stream';
import { AuthenticatedRequest } from '../types';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary';
import { prisma } from '../config/database';
import { savePitchDeckLocally } from '../services/pitchDeckStorage.service';
import { saveAvatarLocally, avatarExtension } from '../services/avatarStorage.service';
import { trustScoreService } from '../services/trustScore.service';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { AppError } from '../middleware/errorHandler';

export const uploadController = {
  pitchDeck: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return sendError(res, 'No file uploaded', 400);
      }

      if (req.file.mimetype !== 'application/pdf') {
        throw new AppError('Only PDF files are allowed', 400);
      }

      let url: string;

      if (isCloudinaryConfigured) {
        const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: 'raw',
              folder: 'inverge/pitch-decks',
              format: 'pdf',
            },
            (error, result) => {
              if (error || !result) reject(error || new Error('Upload failed'));
              else resolve(result as { secure_url: string });
            }
          );

          const bufferStream = Readable.from(req.file!.buffer);
          bufferStream.pipe(uploadStream);
        });
        url = uploadResult.secure_url;
      } else {
        url = await savePitchDeckLocally(
          req.file.buffer,
          req.file.originalname || 'pitch-deck.pdf',
          req.user!.userId
        );
      }

      const founderId = req.user!.userId;
      const existing = await prisma.startup.findUnique({ where: { founderId } });
      if (existing) {
        await prisma.startup.update({
          where: { founderId },
          data: { pitchDeckUrl: url },
        });
      }

      sendSuccess(res, 'Pitch deck uploaded', {
        url,
        fileName: req.file.originalname || 'pitch-deck.pdf',
        savedToProfile: Boolean(existing),
      });
    } catch (err) {
      next(err);
    }
  },

  profilePicture: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return sendError(res, 'No file uploaded', 400);
      }

      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowed.includes(req.file.mimetype)) {
        throw new AppError('Only JPEG, PNG, or WebP images are allowed', 400);
      }

      let url: string;

      if (isCloudinaryConfigured) {
        const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: 'image',
              folder: 'inverge/avatars',
              format: avatarExtension(req.file!.mimetype).slice(1),
            },
            (error, result) => {
              if (error || !result) reject(error || new Error('Upload failed'));
              else resolve(result as { secure_url: string });
            }
          );

          const bufferStream = Readable.from(req.file!.buffer);
          bufferStream.pipe(uploadStream);
        });
        url = uploadResult.secure_url;
      } else {
        url = await saveAvatarLocally(
          req.file.buffer,
          req.file.mimetype,
          req.user!.userId
        );
      }

      const userId = req.user!.userId;
      const user = await prisma.user.update({
        where: { id: userId },
        data: { profilePicture: url },
        select: {
          id: true,
          name: true,
          profilePicture: true,
          trustScore: true,
        },
      });

      void trustScoreService.recalculate(userId, 'Profile picture updated').catch((err) => {
        console.error('Trust score recalculation failed:', err);
      });

      sendSuccess(res, 'Profile picture uploaded', {
        url,
        user,
      });
    } catch (err) {
      next(err);
    }
  },
};
