import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { AdminUser } from '@/lib/models/AdminUser';
import { logAdminAction } from '@/lib/models/AuditLog';
import { rateLimit } from '@/lib/ratelimit';
import { isAdminRole } from '@/lib/roles';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
  useSecureCookies:
    process.env.NODE_ENV === 'production' &&
    !(process.env.NEXTAUTH_URL || '').startsWith('http://'),
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Admin Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'admin@gsscollection.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please provide both email and password.');
        }

        const headers = (req?.headers || {}) as Record<string, string | string[] | undefined>;
        const forwarded = headers['x-forwarded-for'];
        const realIp = headers['x-real-ip'];
        const ip =
          (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim() ||
          (Array.isArray(realIp) ? realIp[0] : realIp)?.trim() ||
          'unknown';

        const ipLimit = await rateLimit(`login:${ip}`, 10, 900);
        if (!ipLimit.success) {
          throw new Error('Too many login attempts from this network. Please retry later.');
        }

        await connectDB();
        const email = credentials.email.toLowerCase().trim();

        let user = await AdminUser.findOne({ email });

        // First login only: create the owner when the admin collection is empty.
        const totalAdmins = await AdminUser.countDocuments();
        const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
        const expectedPass = process.env.ADMIN_PASSWORD;
        if (totalAdmins === 0 && adminEmail && expectedPass && email === adminEmail) {
          if (credentials.password === expectedPass) {
            const hash = await bcrypt.hash(expectedPass, 12);
            user = await AdminUser.create({
              email,
              passwordHash: hash,
              name: 'GSS Store Owner',
              role: 'superadmin',
              lastLoginAt: new Date(),
            });
            await logAdminAction(email, 'admin_bootstrap_created', 'AdminUser', user.id, undefined, ip);
            return {
              id: user._id.toString(),
              email: user.email,
              name: user.name,
              role: user.role,
            };
          }
        }

        if (!user || !isAdminRole(user.role)) {
          throw new Error('Invalid credentials.');
        }

        // Check lockout
        if (user.lockoutUntil && user.lockoutUntil > new Date()) {
          const remainingMinutes = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000);
          throw new Error(`Account temporarily locked. Please retry in ${remainingMinutes} minute(s).`);
        }

        const isMatch = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isMatch) {
          user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
          if (user.failedLoginAttempts >= 5) {
            user.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
            await logAdminAction(email, 'admin_locked_out', 'AdminUser', user.id, undefined, ip);
          }
          await user.save();
          throw new Error('Invalid credentials.');
        }

        user.failedLoginAttempts = 0;
        user.lockoutUntil = undefined;
        user.lastLoginAt = new Date();
        await user.save();

        await logAdminAction(email, 'admin_login_success', 'AdminUser', user.id, undefined, ip);

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role || '';
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        const sUser = session.user as { id?: string; role?: string };
        sUser.id = typeof token.id === 'string' ? token.id : '';
        // Never default a missing role to admin.
        sUser.role = typeof token.role === 'string' ? token.role : '';
      }
      return session;
    },
  },
};
