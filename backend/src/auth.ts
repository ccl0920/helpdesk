import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins';
import bcrypt from 'bcrypt';
import prisma from './lib/prisma.js';

export const auth = betterAuth({
  appName: 'Helpdesk',
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: process.env.NODE_ENV === 'production',
    disableSignUp: true,
    password: {
      minLength: 12,
      hash: async (password) => {
        return await bcrypt.hash(password, 12);
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
  cookies: {
    session: {
      name: 'better-auth.session-token',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  },
  trustedOrigins: (process.env.TRUSTED_ORIGINS || '')
    .split(',')
    .filter(Boolean)
    .map((origin) => origin.trim()),
  plugins: [
    admin({
      adminUserIds: process.env.ADMIN_USER_IDS?.split(',') || [],
    }),
  ],
});

export type Auth = typeof auth;
