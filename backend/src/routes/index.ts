import { Router, Request, Response } from 'express';
import { authRouter } from '../modules/auth/auth.routes';
import { roomsRouter } from '../modules/rooms/rooms.routes';
import { contractsRouter } from '../modules/contracts/contracts.routes';
import { tenantsRouter } from '../modules/tenants/tenants.routes';
import { dashboardRouter } from '../modules/dashboard/dashboard.routes';
import { authMiddleware } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import { env } from '../config/env';

const router = Router();

/**
 * Health check endpoint
 * GET /api/health
 */
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
  });
});

// Mount Auth module routes
router.use('/auth', authRouter);

// Rooms: any authenticated user can browse available rooms; landlord CRUD below
router.use('/rooms', roomsRouter);

// Contracts: tenant self-service endpoint
router.use('/contracts', contractsRouter);

// Dashboard: landlord stats
router.use('/dashboard', dashboardRouter);

// Tenants: landlord CRUD
router.use('/tenants', tenantsRouter);

// Dev-only route to verify LANDLORD role authorization works.
if (env.NODE_ENV !== 'production') {
  router.get(
    '/test/landlord-only',
    authMiddleware,
    authorizeRoles('LANDLORD'),
    (_req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        message: 'Landlord access granted',
      });
    }
  );

  router.get(
    '/test/admin-only',
    authMiddleware,
    authorizeRoles('ADMIN'),
    (_req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        message: 'Admin access granted',
      });
    }
  );
}

// Future module routes will be registered here:
// router.use('/properties', propertyRoutes);
// router.use('/rooms', roomRoutes);
// router.use('/tenants', tenantRoutes);
// router.use('/contracts', contractRoutes);
// router.use('/invoices', invoiceRoutes);
// router.use('/payments', paymentRoutes);
// router.use('/dashboard', dashboardRoutes);

export { router as apiRouter };
