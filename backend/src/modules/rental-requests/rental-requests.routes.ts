import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { authorizeRoles } from '../../middlewares/role.middleware';
import { AppError } from '../../utils/app-error';
import { sendSuccess } from '../../utils/response';

export const rentalRequestsRouter = Router();
const router = rentalRequestsRouter;
const idSchema = z.coerce.number().int().positive();
const createSchema = z.object({ roomId: z.number().int().positive(), phone: z.string().trim().regex(/^\+?[0-9 ()-]{8,20}$/), expectedPrice: z.number().nonnegative() });
const approveSchema = z.object({ startDate: z.iso.date(), endDate: z.iso.date(), deposit: z.number().min(0).max(9999999999), billingDay: z.number().int().min(1).max(28) }).refine(v => v.endDate > v.startDate, 'Ngày kết thúc phải sau ngày bắt đầu');
const include = { room: { select: { roomNumber: true, address: true } }, user: { select: { fullName: true } } };
router.use(authMiddleware, authorizeRoles('TENANT', 'LANDLORD'));

router.get('/', async (req, res, next) => {
  try {
    const userId = Number(req.user!.userId);
    const data = await prisma.rentalRequest.findMany({ where: req.user!.role === 'TENANT' ? { userId } : { landlordId: userId }, include, orderBy: { createdAt: 'desc' } });
    sendSuccess({ res, data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === 'P2034' || (e.code === 'P2010' && ['1213', '1205'].includes(String(e.meta?.code))))) {
      next(new AppError('Yêu cầu đang được xử lý đồng thời. Vui lòng tải lại danh sách và thử lại.', 409, 'REQUEST_CONFLICT'));
    } else next(e);
  }
});

router.post('/', authorizeRoles('TENANT'), async (req, res, next) => {
  try {
    const input = createSchema.parse(req.body);
    const userId = Number(req.user!.userId);
    const data = await prisma.$transaction(async tx => {
      // Serialize submissions and approvals for the same tenant and room.
      await tx.$queryRaw`SELECT id FROM rooms WHERE id = ${input.roomId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const room = await tx.room.findUnique({ where: { id: input.roomId } });
      if (!room || room.status !== 'AVAILABLE') throw new AppError('Phòng không còn trống. Vui lòng chọn phòng khác.', 409, 'ROOM_UNAVAILABLE');
      if (Number(room.price) !== input.expectedPrice) throw new AppError('Giá phòng đã thay đổi. Vui lòng tải lại trang và kiểm tra trước khi gửi.', 409, 'PRICE_CHANGED');
      if (await tx.contract.findFirst({ where: { tenant: { userId }, status: 'ACTIVE' } })) throw new AppError('Bạn đang có hợp đồng thuê phòng hiệu lực.', 409, 'ACTIVE_CONTRACT');
      const existing = await tx.rentalRequest.findFirst({ where: { userId, status: 'PENDING' } });
      if (existing) throw new AppError('Bạn đã có yêu cầu chờ duyệt. Xem hoặc hủy yêu cầu đó trước khi chọn phòng khác.', 409, 'REQUEST_PENDING');
      return tx.rentalRequest.create({ data: { userId, landlordId: room.landlordId, roomId: room.id, phone: input.phone, rentPrice: room.price }, include });
    }, { isolationLevel: 'ReadCommitted' });
    sendSuccess({ res, statusCode: 201, data, message: 'Đã gửi yêu cầu thuê phòng' });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === 'P2034' || (e.code === 'P2010' && ['1213', '1205'].includes(String(e.meta?.code))))) {
      next(new AppError('Yêu cầu đang được xử lý đồng thời. Vui lòng tải lại danh sách và thử lại.', 409, 'REQUEST_CONFLICT'));
    } else next(e);
  }
});

router.post('/:id/:action', async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const action = z.enum(['approve', 'reject', 'cancel']).parse(req.params.action);
    const actor = Number(req.user!.userId);
    const tenantAction = action === 'cancel';
    if (req.user!.role !== (tenantAction ? 'TENANT' : 'LANDLORD')) throw new AppError('Bạn không có quyền thực hiện thao tác này.', 403, 'FORBIDDEN');
    const terms = action === 'approve' ? approveSchema.parse(req.body) : null;
    const data = await prisma.$transaction(async tx => {
      const scoped = await tx.rentalRequest.findFirst({ where: { id, ...(tenantAction ? { userId: actor } : { landlordId: actor }) } });
      if (!scoped) throw new AppError('Không tìm thấy yêu cầu.', 404, 'NOT_FOUND');
      await tx.$queryRaw`SELECT id FROM rooms WHERE id = ${scoped.roomId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${scoped.userId} FOR UPDATE`;
      const request = await tx.rentalRequest.findUniqueOrThrow({ where: { id } });
      if (request.status !== 'PENDING') throw new AppError('Yêu cầu đã được xử lý. Vui lòng tải lại danh sách.', 409, 'REQUEST_PROCESSED');
      if (action !== 'approve') return tx.rentalRequest.update({ where: { id }, data: { status: action === 'cancel' ? 'CANCELLED' : 'REJECTED' } });
      const room = await tx.room.findUniqueOrThrow({ where: { id: request.roomId } });
      if (room.status !== 'AVAILABLE' || await tx.contract.findFirst({ where: { roomId: room.id, status: { in: ['ACTIVE', 'PENDING'] } } })) throw new AppError('Phòng không còn khả dụng để duyệt thuê.', 409, 'ROOM_UNAVAILABLE');
      if (await tx.contract.findFirst({ where: { tenant: { userId: request.userId }, status: 'ACTIVE' } })) throw new AppError('Người thuê đã có hợp đồng hiệu lực.', 409, 'ACTIVE_CONTRACT');
      const user = await tx.user.findUniqueOrThrow({ where: { id: request.userId } });
      let tenant = await tx.tenant.findFirst({ where: { userId: user.id, landlordId: actor } });
      if (!tenant) tenant = await tx.tenant.create({ data: { landlordId: actor, userId: user.id, fullName: user.fullName, email: user.email, phone: request.phone } });
      const contract = await tx.contract.create({ data: { landlordId: actor, roomId: room.id, tenantId: tenant.id, startDate: new Date(terms!.startDate), endDate: new Date(terms!.endDate), rentPrice: request.rentPrice, deposit: terms!.deposit, billingDay: terms!.billingDay, status: 'ACTIVE' } });
      await tx.room.update({ where: { id: room.id }, data: { status: 'OCCUPIED' } });
      await tx.rentalRequest.updateMany({ where: { roomId: room.id, status: 'PENDING', id: { not: id } }, data: { status: 'REJECTED' } });
      return tx.rentalRequest.update({ where: { id }, data: { status: 'APPROVED', contractId: contract.id } });
    }, { isolationLevel: 'ReadCommitted' });
    sendSuccess({ res, data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === 'P2034' || (e.code === 'P2010' && ['1213', '1205'].includes(String(e.meta?.code))))) {
      next(new AppError('Yêu cầu đang được xử lý đồng thời. Vui lòng tải lại danh sách và thử lại.', 409, 'REQUEST_CONFLICT'));
    } else next(e);
  }
});
