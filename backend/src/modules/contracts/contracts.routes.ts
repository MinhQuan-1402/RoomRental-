import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { contractsController } from './contracts.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { authorizeRoles } from '../../middlewares/role.middleware';
import { MAX_FILE_SIZE } from './contracts.service';

const router = Router();

// ─── Multer config for contract file uploads ───────────────────────────────────
// We use diskStorage so the temp file lives in a stable location we control.
// The service then renames it to its final versioned name.
const UPLOAD_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'storage',
  'contracts',
  '_tmp'
);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      // Ensure dir exists
      require('fs').mkdirSync(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      // Safe filename: timestamp + sanitized original name
      const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
      const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
      cb(null, safe);
    },
  }),
  limits: {
    fileSize: MAX_FILE_SIZE, // 10 MB
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    // Defense in depth — service also checks. Only accept PDF.
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file PDF'));
    }
  },
});

// All contract routes require auth.
router.use(authMiddleware);

// ─── Contract file endpoints ───────────────────────────────────────────────────

// GET /api/contracts — landlord list (must come BEFORE /:id routes)
router.get('/', authorizeRoles('LANDLORD'), contractsController.list);

// POST /api/contracts/:id/file — landlord only
// Note: must be defined BEFORE any routes that take params, otherwise the
// `upload.single` middleware will still trigger and write a temp file even
// when the param is invalid — Express still matches the path correctly, but
// keeping upload routes near each other makes the file easier to read.
router.post(
  '/:id/file',
  authorizeRoles('LANDLORD'),
  upload.single('file'),
  contractsController.uploadFile
);

// GET /api/contracts/:id/file — both landlord and tenant can read metadata
router.get('/:id/file', contractsController.getFileInfo);

// GET /api/contracts/:id/file/download — both can download
router.get('/:id/file/download', contractsController.downloadFile);

// Tenant self-service: get their own ACTIVE contract (if any).
// Used by the dashboard to decide between "browse available rooms"
// and "show my current room".
router.get('/my-active', contractsController.getMyActive);

export { router as contractsRouter };
