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

/**
 * Validate password strength
 * Requirements: 12+ chars, uppercase, lowercase, number, special character
 */
function validatePassword(password: string): void {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;
  if (!passwordRegex.test(password)) {
    throw new Error(
      'ADMIN_PASSWORD must be at least 12 characters and contain uppercase, lowercase, number, and special character'
    );
  }
}

async function main() {
  console.log('🌱 Starting seed...');

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  // Require environment variables
  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required');
  }

  // Validate password strength
  validatePassword(adminPassword);

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    // Hash password using bcrypt (12 rounds)
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

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
  } else {
    console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
