import { PrismaClient } from '@prisma/client';
import { env } from './env';

// Singleton pattern: reuse PrismaClient instance across hot-reloads in dev
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? (['query', 'info', 'warn', 'error'] as const)
        : (['error'] as const),
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export const connectDB = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log('✅ MySQL (Prisma) connected successfully');
  } catch (error) {
    console.error('❌ MySQL connection error:', error);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    console.log('MySQL disconnected successfully');
  } catch (error) {
    console.error('Error disconnecting MySQL:', error);
  }
};
