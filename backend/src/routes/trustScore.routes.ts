import { Router } from 'express';
import { trustScoreController } from '../controllers/trustScore.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', trustScoreController.getMine);
router.post('/refresh', trustScoreController.refresh);
router.get('/history', trustScoreController.getHistory);
router.get('/activity', trustScoreController.getActivity);

export default router;
