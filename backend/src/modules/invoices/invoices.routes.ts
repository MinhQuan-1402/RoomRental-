import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { authorizeRoles } from '../../middlewares/role.middleware';
import { sendSuccess } from '../../utils/response';
import { invoicesService } from './invoices.service';
import { batchSchema, monthSchema } from './invoices.validation';
import { invoiceIdSchema, tenantInvoiceQuerySchema } from './invoices.validation';
import { tenantInvoicesService } from './tenant-invoices.service';

export const invoicesRouter = Router();
invoicesRouter.use(authMiddleware);

// Tenant endpoints must precede the landlord-only middleware.
invoicesRouter.get('/my', authorizeRoles('TENANT'), async (req, res, next) => {
  try {
    const query = tenantInvoiceQuerySchema.parse(req.query);
    sendSuccess({ res, data: await tenantInvoicesService.list(Number(req.user!.userId), query) });
  } catch (error) { next(error); }
});

invoicesRouter.get('/my/:id', authorizeRoles('TENANT'), async (req, res, next) => {
  try {
    const id = invoiceIdSchema.parse(req.params.id);
    sendSuccess({ res, data: await tenantInvoicesService.detail(Number(req.user!.userId), id) });
  } catch (error) { next(error); }
});

invoicesRouter.use(authorizeRoles('LANDLORD'));

invoicesRouter.get('/', async (req, res, next) => {
  try {
    const month = monthSchema.parse(req.query.billingMonth);
    sendSuccess({ res, data: await invoicesService.list(Number(req.user!.userId), month) });
  } catch (error) { next(error); }
});

invoicesRouter.get('/candidates', async (req, res, next) => {
  try {
    const month = monthSchema.parse(req.query.billingMonth);
    sendSuccess({ res, data: await invoicesService.candidates(Number(req.user!.userId), month) });
  } catch (error) { next(error); }
});

invoicesRouter.post('/bulk', async (req, res, next) => {
  try {
    const { billingMonth, rows } = batchSchema.parse(req.body);
    sendSuccess({ res, data: await invoicesService.createBatch(Number(req.user!.userId), billingMonth, rows), message: 'Đã xử lý đợt tạo hóa đơn' });
  } catch (error) { next(error); }
});
