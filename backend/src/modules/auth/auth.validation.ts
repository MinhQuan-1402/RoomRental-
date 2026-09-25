import { z } from 'zod';

// Public registration is ONLY allowed for LANDLORD or TENANT.
// ADMIN must never be assigned through this endpoint.
export const PUBLIC_REGISTRATION_ROLES = ['LANDLORD', 'TENANT'] as const;

const passwordSchema = z
  .string({ message: 'Mật khẩu là bắt buộc' })
  .min(8, 'Mật khẩu tối thiểu 8 ký tự')
  .max(100, 'Mật khẩu tối đa 100 ký tự')
  .regex(/[A-Za-z]/, 'Mật khẩu phải chứa ít nhất 1 chữ cái')
  .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất 1 chữ số');

const emailSchema = z
  .string({ message: 'Email là bắt buộc' })
  .trim()
  .toLowerCase()
  .email('Email không đúng định dạng')
  .max(255, 'Email tối đa 255 ký tự');

/**
 * Register schema — public registration endpoint.
 *
 * Client-controlled fields are intentionally restricted:
 * - `isActive`, `refreshToken`, `createdAt`, `updatedAt` are NOT accepted.
 * - `role` is restricted to PUBLIC_REGISTRATION_ROLES only.
 *   To prevent mass-assignment, the service layer strips any extra fields
 *   before passing to Prisma.
 */
export const registerSchema = z
  .object({
    fullName: z
      .string({ message: 'Họ và tên là bắt buộc' })
      .trim()
      .min(2, 'Họ và tên tối thiểu 2 ký tự')
      .max(100, 'Họ và tên tối đa 100 ký tự'),
    email: emailSchema,
    password: passwordSchema,
    phone: z
      .string()
      .trim()
      .min(8, 'Số điện thoại tối thiểu 8 ký tự')
      .max(20, 'Số điện thoại tối đa 20 ký tự')
      .regex(/^[0-9+\-\s()]+$/, 'Số điện thoại không hợp lệ')
      .optional(),
    role: z.enum(PUBLIC_REGISTRATION_ROLES, {
      message: 'Vai trò chỉ có thể là LANDLORD hoặc TENANT',
    }),
  })
  .strict(); // reject unknown fields (mass-assignment protection)

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z
      .string({ message: 'Mật khẩu là bắt buộc' })
      .min(1, 'Mật khẩu không được để trống'),
  })
  .strict();

export const refreshTokenSchema = z
  .object({
    refreshToken: z
      .string({ message: 'Refresh token là bắt buộc' })
      .min(1, 'Refresh token không được để trống'),
  })
  .strict();

/**
 * Google login schema — accepts a Google ID token (JWT) from the client.
 * `role` is optional; only consumed when the Google account has no existing
 * local user (new account creation).
 */
export const googleLoginSchema = z
  .object({
    idToken: z
      .string({ message: 'Google ID token là bắt buộc' })
      .min(1, 'Google ID token không được để trống'),
    role: z.enum(PUBLIC_REGISTRATION_ROLES).optional(),
  })
  .strict();
