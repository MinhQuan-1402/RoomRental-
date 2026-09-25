import bcryptjs from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../../utils/app-error';
import { userRepository, UserRepository } from '../users/user.repository';
import { AuthProvider, UserResponse } from '../users/user.types';
import {
  AuthResponse,
  AuthTokens,
  GoogleLoginDTO,
  JWTPayload,
  LoginDTO,
  RegisterDTO,
} from './auth.types';
import { verifyGoogleIdToken } from './google.service';

export class AuthService {
  constructor(private userRepo: UserRepository = userRepository) {}

  /**
   * Register a new user account (OWNER or TENANT)
   */
  async register(dto: RegisterDTO): Promise<UserResponse> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // 1. Check if email already exists
    const existingUser = await this.userRepo.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new AppError('Email đã được sử dụng', 409, 'EMAIL_ALREADY_EXISTS');
    }

    // 2. Hash password with bcrypt
    const saltRounds = 10;
    const passwordHash = await bcryptjs.hash(dto.password, saltRounds);

    // 3. Create user in database
    const user = await this.userRepo.create({
      fullName: dto.fullName.trim(),
      email: normalizedEmail,
      passwordHash,
      phone: dto.phone?.trim() ?? null,
      role: dto.role,
    });

    return this.toUserResponse(user);
  }

  /**
   * Authenticate user with email and password
   */
  async login(dto: LoginDTO): Promise<AuthResponse> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // 1. Find user by email
    const user = await this.userRepo.findByEmail(normalizedEmail);
    if (!user) {
      throw new AppError('Email hoặc mật khẩu không chính xác', 401, 'INVALID_CREDENTIALS');
    }

    // 2. Check if account is active
    if (!user.isActive) {
      throw new AppError('Tài khoản đã bị vô hiệu hóa', 403, 'ACCOUNT_INACTIVE');
    }

    // 2.5. Google-only accounts have no password — they must sign in with Google
    if (!user.passwordHash) {
      throw new AppError(
        'Tài khoản này được đăng ký bằng Google. Vui lòng đăng nhập bằng Google.',
        400,
        'USE_GOOGLE_LOGIN',
      );
    }

    // 3. Compare password
    const isPasswordValid = await bcryptjs.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Email hoặc mật khẩu không chính xác', 401, 'INVALID_CREDENTIALS');
    }

    // 4. Generate Access & Refresh tokens
    const payload: JWTPayload = {
      userId: user.id.toString(),
      role: user.role,
      email: user.email,
    };

    const tokens = this.generateTokens(payload);

    // 5. Store refresh token in user record
    await this.userRepo.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.toUserResponse(user),
      tokens,
    };
  }

  /**
   * Generate new access token using a valid refresh token
   */
  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    let payload: JWTPayload;

    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('Refresh token đã hết hạn', 401, 'TOKEN_EXPIRED');
      }
      throw new AppError('Refresh token không hợp lệ', 401, 'INVALID_TOKEN');
    }

    // Verify user exists and token matches
    const user = await this.userRepo.findById(Number(payload.userId));
    if (!user) {
      throw new AppError('Người dùng không tồn tại', 401, 'UNAUTHORIZED');
    }

    if (!user.isActive) {
      throw new AppError('Tài khoản đã bị vô hiệu hóa', 403, 'ACCOUNT_INACTIVE');
    }

    if (!user.refreshToken || user.refreshToken !== refreshToken) {
      throw new AppError('Refresh token không hợp lệ hoặc đã bị thu hồi', 401, 'INVALID_TOKEN');
    }

    // Generate new access token
    const newAccessToken = this.generateAccessToken({
      userId: user.id.toString(),
      role: user.role,
      email: user.email,
    });

    return { accessToken: newAccessToken };
  }

  /**
   * Invalidate refresh token for logout
   */
  async logout(userId: string): Promise<void> {
    await this.userRepo.updateRefreshToken(Number(userId), null);
  }

  /**
   * Authenticate (or register + authenticate) a user via Google ID token.
   *
   * Flow:
   * 1. Verify the Google ID token with Google's public keys.
   * 2. Look up an existing user by googleId; if found, log them in.
   * 3. Else look up by email:
   *    - If a LOCAL account exists with the same email, LINK the Google ID
   *      to that account (account linking), then log them in.
   *    - Otherwise create a new LOCAL-equivalent user with authProvider=GOOGLE.
   *      Default role is TENANT (caller can override via dto.role).
   */
  async loginWithGoogle(dto: GoogleLoginDTO): Promise<AuthResponse> {
    const profile = await verifyGoogleIdToken(dto.idToken);

    if (!profile.emailVerified) {
      throw new AppError(
        'Email Google chưa được xác minh',
        401,
        'GOOGLE_EMAIL_NOT_VERIFIED',
      );
    }

    // 1. Already linked? Log in directly.
    let user = await this.userRepo.findByGoogleId(profile.googleId);

    // 2. Not linked yet — try to match by email (account linking).
    if (!user) {
      const existingByEmail = await this.userRepo.findByEmail(profile.email);
      if (existingByEmail) {
        user = await this.userRepo.linkGoogleAccount(
          existingByEmail.id,
          profile.googleId,
          profile.avatarUrl,
        );
      }
    }

    // 3. Brand new user — create an account.
    if (!user) {
      const role = dto.role ?? 'TENANT';
      user = await this.userRepo.create({
        fullName: profile.fullName,
        email: profile.email,
        passwordHash: null, // Google users don't have a password
        phone: null,
        role,
        googleId: profile.googleId,
        authProvider: 'GOOGLE',
        avatarUrl: profile.avatarUrl,
      });
    }

    if (!user.isActive) {
      throw new AppError('Tài khoản đã bị vô hiệu hóa', 403, 'ACCOUNT_INACTIVE');
    }

    const payload: JWTPayload = {
      userId: user.id.toString(),
      role: user.role,
      email: user.email,
    };
    const tokens = this.generateTokens(payload);
    await this.userRepo.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.toUserResponse(user),
      tokens,
    };
  }

  /**
   * Get current authenticated user profile
   */
  async getMe(userId: string): Promise<UserResponse> {
    const user = await this.userRepo.findById(Number(userId));
    if (!user) {
      throw new AppError('Người dùng không tồn tại', 404, 'NOT_FOUND');
    }

    return this.toUserResponse(user);
  }

  // --- Helper methods ---

  generateTokens(payload: JWTPayload): AuthTokens {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    return { accessToken, refreshToken };
  }

  generateAccessToken(payload: JWTPayload): string {
    const options: SignOptions = {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as unknown as NonNullable<SignOptions['expiresIn']>,
    };
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
  }

  generateRefreshToken(payload: JWTPayload): string {
    const options: SignOptions = {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as unknown as NonNullable<SignOptions['expiresIn']>,
    };
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
  }

  toUserResponse(user: { id: number; fullName: string; email: string; phone: string | null; role: string; isActive: boolean; authProvider: AuthProvider; avatarUrl: string | null; createdAt: Date; updatedAt: Date }): UserResponse {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role as UserResponse['role'],
      isActive: user.isActive,
      authProvider: user.authProvider,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export const authService = new AuthService();
