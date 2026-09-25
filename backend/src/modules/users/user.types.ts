export type UserRole = 'LANDLORD' | 'TENANT' | 'ADMIN';
export type AuthProvider = 'LOCAL' | 'GOOGLE';

export interface UserResponse {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  authProvider: AuthProvider;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  fullName: string;
  email: string;
  passwordHash: string | null;
  phone?: string | null;
  role: UserRole;
  googleId?: string | null;
  authProvider?: AuthProvider;
  avatarUrl?: string | null;
}

export interface UserWhereUnique {
  id?: number;
  email?: string;
  googleId?: string;
}
