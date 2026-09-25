/**
 * Task 5 — Foundation verification test.
 * Run with: npx tsx tests/foundation.test.ts
 */
import { app } from '../src/app';
import { connectDB, disconnectDB } from '../src/config/prisma';

async function run() {
  console.log('🧪 Starting Backend Foundation Verification...');
  await connectDB();
  console.log('✅ MySQL (Prisma) connected successfully');

  const testPort = 5001;
  const server = app.listen(testPort, async () => {
    console.log(`✅ Server started on port ${testPort}`);
    try {
      // Health check
      const healthRes = await fetch(`http://localhost:${testPort}/api/health`);
      const healthData = await healthRes.json();
      if (
        healthRes.status === 200 &&
        healthData.success === true &&
        healthData.message === 'Server is running'
      ) {
        console.log('✅ Health check passed');
      } else {
        throw new Error(`Health check failed: ${JSON.stringify(healthData)}`);
      }

      // 404
      const nfRes = await fetch(`http://localhost:${testPort}/api/abc`);
      const nfData = await nfRes.json();
      if (
        nfRes.status === 404 &&
        nfData.success === false &&
        nfData.error?.code === 'ROUTE_NOT_FOUND'
      ) {
        console.log('✅ 404 middleware passed');
      } else {
        throw new Error(`404 middleware failed: ${JSON.stringify(nfData)}`);
      }

      console.log('\n🎉 ALL FOUNDATION TESTS PASSED');
    } catch (err) {
      console.error('❌ Failed:', err);
      process.exitCode = 1;
    } finally {
      await disconnectDB();
      server.close(() => console.log('Foundation test server closed.'));
    }
  });
}

run().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
