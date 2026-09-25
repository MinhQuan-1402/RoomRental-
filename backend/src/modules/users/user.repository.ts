import { User, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { CreateUserData } from './user.types';

export class UserRepository {
  /**
   * Find a user by unique filter (id, email, or googleId)
   */
  async findUnique(
    where: Prisma.UserWhereUniqueInput
  ): Promise<User | null> {
    return prisma.user.findUnique({ where });
  }

  /**
   * Find a user by email (case-insensitive)
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  }

  /**
   * Find a user by Google ID
   */
  async findByGoogleId(googleId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { googleId } });
  }

  /**
   * Find a user by id
   */
  async findById(id: number): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  /**
   * Create a new user
   */
  async create(data: CreateUserData): Promise<User> {
    return prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase().trim(),
      },
    });
  }

  /**
   * Update user's refresh token
   */
  async updateRefreshToken(
    userId: number,
    refreshToken: string | null
  ): Promise<User | null> {
    return prisma.user.update({
      where: { id: userId },
      data: { refreshToken },
    });
  }

  /**
   * Link a Google account to an existing user (by id)
   * Used when a LOCAL user signs in with Google using the same email.
   */
  async linkGoogleAccount(
    userId: number,
    googleId: string,
    avatarUrl: string | null
  ): Promise<User | null> {
    return prisma.user.update({
      where: { id: userId },
      data: {
        googleId,
        avatarUrl: avatarUrl ?? undefined,
        authProvider: 'GOOGLE',
      },
    });
  }

  /**
   * Update user's active status
   */
  async updateStatus(
    userId: number,
    isActive: boolean
  ): Promise<User | null> {
    return prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });
  }

  /**
   * Delete a user by id
   */
  async delete(id: number): Promise<User | null> {
    return prisma.user.delete({ where: { id } });
  }
}

export const userRepository = new UserRepository();
