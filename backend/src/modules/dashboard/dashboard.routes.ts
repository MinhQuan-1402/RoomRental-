import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { dashboardController } from './dashboard.controller';

const router = Router();

/**
 * GET /api/dashboard/landlord-stats
 * Chỉ landlord/admin.
 */
router.get(
  '/landlord-stats',
  authMiddleware,
  dashboardController.getLandlordStats
);

export { router as dashboardRouter };
