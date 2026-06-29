import { Router } from 'express';
import { endorsementController } from '../controllers/endorsement.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createEndorsementSchema,
  updateEndorsementSchema,
} from '../validations/endorsement.validation';

const router = Router();

router.use(authenticate);

router.get('/categories', endorsementController.getCategories);
router.get('/received', endorsementController.getReceived);
router.get('/given', endorsementController.getGiven);
router.get('/eligibility/:toUserId', endorsementController.getEligibility);
router.post('/', validate(createEndorsementSchema), endorsementController.create);
router.patch('/:id', validate(updateEndorsementSchema), endorsementController.update);
router.delete('/:id', endorsementController.remove);

export default router;
