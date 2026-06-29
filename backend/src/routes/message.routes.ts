import { Router } from 'express';
import { messageController } from '../controllers/message.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { sendMessageSchema, getMessagesQuerySchema } from '../validations/message.validation';

const router = Router();

router.use(authenticate);

router.post('/', validate(sendMessageSchema), messageController.send);
router.get('/conversations', messageController.getConversations);
router.get('/', validate(getMessagesQuerySchema, 'query'), messageController.getConversation);

export default router;
