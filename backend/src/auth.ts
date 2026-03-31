import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import bcrypt from 'bcrypt';
import prisma from './lib/prisma.js';

export const auth = betterAuth({
  appName: 'Helpdesk',
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    disableSignUp: true,
    password: {
      hash: async (password) => {
        return await bcrypt.hash(password, 10);
      },
      verify: async ({ hash, password }) => {
        return await bcrypt.compare(password, hash);
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day (session refresh interval)
  },
  user: {
    modelName: 'user',
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        defaultValue: 'AGENT',
        returned: true,
      },
    },
  },
  trustedOrigins: (process.env.TRUSTED_ORIGINS || '')
    .split(',')
    .filter(Boolean)
    .map((origin) => origin.trim()),
});

export type Auth = typeof auth;
