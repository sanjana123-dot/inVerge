import { Router } from 'express';
import { Role } from '@prisma/client';
import { startupController } from '../controllers/startup.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createStartupSchema,
  updateStartupSchema,
  discoveryQuerySchema,
} from '../validations/startup.validation';

const router = Router();

router.use(authenticate);

router.get('/discover', validate(discoveryQuerySchema, 'query'), startupController.discover);
router.get('/founder/mine', authorize(Role.FOUNDER), startupController.getMine);
router.put(
  '/founder/me',
  authorize(Role.FOUNDER),
  validate(createStartupSchema),
  startupController.save
);
router.get('/founder/analytics', authorize(Role.FOUNDER), startupController.analytics);
router.post('/', authorize(Role.FOUNDER), validate(createStartupSchema), startupController.create);
router.patch('/', authorize(Role.FOUNDER), validate(updateStartupSchema), startupController.update);
router.post('/:id/view', startupController.recordView);
router.get('/:id', startupController.getById);

export default router;
