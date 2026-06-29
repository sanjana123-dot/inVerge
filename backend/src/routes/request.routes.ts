import { Router } from 'express';
import { requestController } from '../controllers/request.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createRequestSchema, respondRequestSchema } from '../validations/request.validation';

const router = Router();

router.use(authenticate);

router.post('/', validate(createRequestSchema), requestController.create);
router.get('/sent', requestController.getSent);
router.get('/received', requestController.getReceived);
router.patch('/:id/respond', validate(respondRequestSchema), requestController.respond);

export default router;
