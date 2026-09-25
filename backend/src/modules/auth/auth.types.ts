import { UserRole, UserResponse } from '../users/user.types';

/** Roles that can be self-registered by the public. */
export const PUBLIC_ROLES = ['LANDLORD', 'TENANT'] as const;

export interface RegisterDTO {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  role: 'LANDLORD' | 'TENANT';
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RefreshDTO {
  refreshToken: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JWTPayload {
  userId: string;
  role: UserRole;
  email: string;
}

export interface AuthResponse {
  user: UserResponse;
  tokens: AuthTokens;
}

/**
 * Google OAuth login DTO.
 * - `idToken`: Google ID token returned by Google Identity Services (gsi).
 * - `role`: optional, only used when creating a NEW account from Google.
 *   If user already exists, role is ignored.
 */
export interface GoogleLoginDTO {
  idToken: string;
  role?: 'LANDLORD' | 'TENANT';
}
