/**
 * Quick DB inspector — shows all users currently in MySQL.
 * Run with: npx tsx scripts/inspect-users.ts
 */
import { prisma, connectDB, disconnectDB } from '../src/config/prisma';

async function main() {
  await connectDB();
  const users = await prisma.user.findMany({
    orderBy: { id: 'asc' },
  });

  console.log(`\n📊 Found ${users.length} user(s) in MySQL:\n`);
  console.log('─'.repeat(120));

  for (const u of users) {
    console.log(`ID         : ${u.id}`);
    console.log(`Email      : ${u.email}`);
    console.log(`Full Name  : ${u.fullName}`);
    console.log(`Phone      : ${u.phone ?? '(null)'}`);
    console.log(`Role       : ${u.role}`);
    console.log(`Active     : ${u.isActive}`);
    console.log(`Pwd Hash   : ${u.passwordHash.slice(0, 25)}... (bcrypt $2)`);
    console.log(`Refresh Tkn: ${u.refreshToken ? u.refreshToken.slice(0, 30) + '...' : '(null)'}`);
    console.log(`Created    : ${u.createdAt.toISOString()}`);
    console.log(`Updated    : ${u.updatedAt.toISOString()}`);
    console.log('─'.repeat(120));
  }

  await disconnectDB();
}

main().catch((e) => { console.error(e); process.exit(1); });
