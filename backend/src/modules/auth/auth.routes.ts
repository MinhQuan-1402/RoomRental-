import { Router } from 'express';
import { authController } from './auth.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.getMe); // router để lấy thông tin user

// Google OAuth — POST idToken (JWT) từ Google Identity Services
router.post('/google', authController.loginWithGoogle);

export { router as authRouter };
