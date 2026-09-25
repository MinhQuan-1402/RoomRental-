import { Router } from 'express';
import { contractsController } from './contracts.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

const router = Router();

// Tenant self-service: get their own ACTIVE contract (if any).
// Used by the dashboard to decide between "browse available rooms"
// and "show my current room".
router.get('/my-active', authMiddleware, contractsController.getMyActive);

export { router as contractsRouter };
