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
      'Password must be at least 12 characters and contain uppercase, lowercase, number, and special character'
    );
  }
}

async function main() {
  console.log('🌱 Starting seed...');

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const agentEmail = process.env.AGENT_EMAIL;
  const agentPassword = process.env.AGENT_PASSWORD;

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
    // Better Auth expects: accountId = email, accountType = "email", providerId = "credential"
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin User',
        role: Role.ADMIN,
        accounts: {
          create: {
            accountId: adminEmail.toLowerCase(),
            providerId: 'credential',
            accountType: 'email',
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

  // Create agent user if AGENT_EMAIL and AGENT_PASSWORD are provided
  if (agentEmail && agentPassword) {
    const existingAgent = await prisma.user.findUnique({
      where: { email: agentEmail },
    });

    if (!existingAgent) {
      // Validate agent password
      validatePassword(agentPassword);
      const hashedAgentPassword = await bcrypt.hash(agentPassword, 12);

      const agent = await prisma.user.create({
        data: {
          email: agentEmail,
          name: 'Agent User',
          role: Role.AGENT,
          accounts: {
            create: {
              accountId: agentEmail.toLowerCase(),
              providerId: 'credential',
              accountType: 'email',
              password: hashedAgentPassword,
            },
          },
        },
        include: {
          accounts: true,
        },
      });

      console.log(`✅ Agent user created: ${agent.email} (role: ${agent.role})`);
    } else {
      console.log(`ℹ️  Agent user already exists: ${agentEmail}`);
    }
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
