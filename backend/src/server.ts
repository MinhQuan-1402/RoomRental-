import { app } from './app';
import { env } from './config/env';
import { connectDB, disconnectDB } from './config/prisma';

const startServer = async (): Promise<void> => {
  try {
    // 1. Connect to database
    await connectDB();

    // 2. Khởi động server
    const server = app.listen(env.PORT, () => {
      console.log(`🚀 Server is running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      console.log(`📡 Health check available at: http://localhost:${env.PORT}/api/health`);
    });

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        console.log('HTTP server closed');
        await disconnectDB();
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
