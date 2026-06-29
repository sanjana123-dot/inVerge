import { Router } from 'express';
import { Role } from '@prisma/client';
import { userController } from '../controllers/user.controller';
import { experienceController } from '../controllers/experience.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  deleteAccountSchema,
  investorDiscoveryQuerySchema,
  updateProfileSchema,
} from '../validations/user.validation';
import {
  createExperienceSchema,
  updateExperienceSchema,
} from '../validations/experience.validation';

const router = Router();

router.use(authenticate);

router.get('/me', userController.getMe);
router.get('/me/stats', userController.getStats);
router.patch('/me', validate(updateProfileSchema), userController.updateProfile);
router.delete('/me', validate(deleteAccountSchema), userController.deleteAccount);

router.get('/me/experience', experienceController.list);
router.post('/me/experience', validate(createExperienceSchema), experienceController.create);
router.patch(
  '/me/experience/:id',
  validate(updateExperienceSchema),
  experienceController.update
);
router.delete('/me/experience/:id', experienceController.remove);

router.get(
  '/investors/discover',
  authorize(Role.FOUNDER),
  validate(investorDiscoveryQuerySchema, 'query'),
  userController.discoverInvestors
);

router.get('/:userId/endorsements', userController.getEndorsements);
router.post('/:id/view', userController.recordProfileView);
router.get('/:id', userController.getById);

export default router;
