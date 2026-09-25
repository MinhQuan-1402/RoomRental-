import { z } from 'zod';
import { ROOM_STATUSES } from './rooms.types';

const roomNumberSchema = z
  .string({ message: 'Số phòng là bắt buộc' })
  .trim()
  .min(1, 'Số phòng tối thiểu 1 ký tự')
  .max(50, 'Số phòng tối đa 50 ký tự');

const priceSchema = z.coerce
  .number({ message: 'Giá phòng là bắt buộc' })
  .positive('Giá phòng phải lớn hơn 0')
  .max(999999999.99, 'Giá phòng quá lớn');

const areaSchema = z.coerce
  .number()
  .positive('Diện tích phải lớn hơn 0')
  .max(99999.99, 'Diện tích quá lớn')
  .optional();

const floorSchema = z.coerce
  .number()
  .int('Tầng phải là số nguyên')
  .min(-10, 'Tầng tối thiểu -10')
  .max(200, 'Tầng tối đa 200')
  .optional();

const statusSchema = z.enum(ROOM_STATUSES).optional();

const descriptionSchema = z
  .string()
  .trim()
  .max(1000, 'Mô tả tối đa 1000 ký tự')
  .optional();

export const createRoomSchema = z.object({
  roomNumber: roomNumberSchema,
  address: z
    .string({ message: 'Địa chỉ là bắt buộc' })
    .trim()
    .min(1, 'Địa chỉ không được để trống')
    .max(500, 'Địa chỉ tối đa 500 ký tự'),
  floor: floorSchema,
  price: priceSchema,
  area: areaSchema,
  status: statusSchema,
  description: descriptionSchema,
});

export const updateRoomSchema = z
  .object({
    roomNumber: roomNumberSchema.optional(),
    address: z
      .string()
      .trim()
      .min(1, 'Địa chỉ không được để trống')
      .max(500, 'Địa chỉ tối đa 500 ký tự')
      .optional(),
    floor: floorSchema,
    price: priceSchema.optional(),
    area: areaSchema,
    status: statusSchema,
    description: descriptionSchema,
  })
  .refine(
    (data) =>
      data.roomNumber !== undefined ||
      data.address !== undefined ||
      data.floor !== undefined ||
      data.price !== undefined ||
      data.area !== undefined ||
      data.status !== undefined ||
      data.description !== undefined,
    { message: 'Cần cung cấp ít nhất một trường để cập nhật' }
  );

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
