import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import startupRoutes from './startup.routes';
import requestRoutes from './request.routes';
import endorsementRoutes from './endorsement.routes';
import messageRoutes from './message.routes';
import notificationRoutes from './notification.routes';
import trustScoreRoutes from './trustScore.routes';
import uploadRoutes from './upload.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/startups', startupRoutes);
router.use('/requests', requestRoutes);
router.use('/endorsements', endorsementRoutes);
router.use('/messages', messageRoutes);
router.use('/notifications', notificationRoutes);
router.use('/trust-score', trustScoreRoutes);
router.use('/upload', uploadRoutes);

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'INverge API is running' });
});

export default router;
