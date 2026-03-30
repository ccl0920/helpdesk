import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting seed...');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@helpdesk.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
    return;
  }

  // Hash password using bcrypt (10 rounds)
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  // Create admin user with associated account (for email/password auth)
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      name: 'Admin',
      role: Role.ADMIN,
      accounts: {
        create: {
          accountId: adminEmail,
          providerId: 'credential',
          accountType: 'email-password',
          password: hashedPassword,
        },
      },
    },
    include: {
      accounts: true,
    },
  });

  console.log(`✅ Admin user created: ${admin.email} (role: ${admin.role})`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
