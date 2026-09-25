import { Router } from 'express';
import { roomsController } from './rooms.controller';
import { uploadRoomImages } from '../../config/upload';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { authorizeRoles } from '../../middlewares/role.middleware';

const router = Router();

// Tenant-facing: any authenticated user can browse available rooms
router.get('/available', authMiddleware, roomsController.listAvailable);

// Landlord-only CRUD on their own rooms
router.use(authMiddleware, authorizeRoles('LANDLORD'));

router.get('/', roomsController.listForLandlord);
router.get('/:id', roomsController.getById);

// Multer: accept up to 10 images under field name 'images'
router.post('/', uploadRoomImages.array('images', 10), roomsController.create);
router.put('/:id', uploadRoomImages.array('images', 10), roomsController.update);
router.delete('/:id', roomsController.remove);

// Image management
router.post('/:id/images', uploadRoomImages.array('images', 10), roomsController.addImages);
router.delete('/:roomId/images/:imageId', roomsController.removeImage);

export { router as roomsRouter };
