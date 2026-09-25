/**
 * Run raw SQL queries against the database using Prisma's $queryRawUnsafe.
 * Run with: npx tsx scripts/raw-sql.ts [query]
 *
 * If no query is provided, defaults to SELECT * FROM users;
 */
import { prisma, connectDB, disconnectDB } from '../src/config/prisma';

async function main() {
  const query = process.argv[2] ?? 'SELECT * FROM users;';
  await connectDB();
  console.log(`\n📜 Raw SQL:\n   ${query}\n`);

  try {
    const rows = await prisma.$queryRawUnsafe(query);
    console.log(`📊 Result (${Array.isArray(rows) ? rows.length : 1} row(s)):\n`);
    console.table(rows);
  } catch (e) {
    console.error('❌ Error:', (e as Error).message);
  } finally {
    await disconnectDB();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
