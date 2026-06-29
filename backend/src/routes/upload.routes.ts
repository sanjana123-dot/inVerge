import { Router } from 'express';
import multer from 'multer';
import { Role } from '@prisma/client';
import { uploadController } from '../controllers/upload.controller';
import { authenticate, authorize } from '../middleware/auth';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = Router();

router.post(
  '/profile-picture',
  authenticate,
  avatarUpload.single('file'),
  uploadController.profilePicture
);

router.post(
  '/pitch-deck',
  authenticate,
  authorize(Role.FOUNDER),
  upload.single('file'),
  uploadController.pitchDeck
);

export default router;
