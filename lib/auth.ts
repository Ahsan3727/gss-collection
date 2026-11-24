import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { AdminUser } from '@/lib/models/AdminUser';
import { logAdminAction } from '@/lib/models/AuditLog';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
  secret: process.env.NEXTAUTH_SECRET || 'gss_collection_secret_key_super_secure_2026_dev',
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please provide both email and password.');
        }

        await connectDB();
        const email = credentials.email.toLowerCase().trim();

        // Check if AdminUser exists
        let user = await AdminUser.findOne({ email });

        // Bootstrap fallback: If no admin user exists in DB at all, allow bootstrap with ENV credentials
        const totalAdmins = await AdminUser.countDocuments();
        if (totalAdmins === 0 && email === (process.env.ADMIN_EMAIL || 'admin@gsscollection.com').toLowerCase()) {
          const expectedPass = process.env.ADMIN_PASSWORD || 'admin123';
          if (credentials.password === expectedPass) {
            const hash = await bcrypt.hash(expectedPass, 12);
            user = await AdminUser.create({
              email,
              passwordHash: hash,
              name: 'GSS Store Owner',
              role: 'superadmin',
              lastLoginAt: new Date(),
            });
            await logAdminAction(email, 'admin_bootstrap_created', 'AdminUser', user.id);
            return {
              id: user._id.toString(),
              email: user.email,
              name: user.name,
              role: user.role,
            };
          }
        }

        if (!user) {
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
            await logAdminAction(email, 'admin_locked_out', 'AdminUser', user.id);
          }
          await user.save();
          throw new Error('Invalid credentials.');
        }

        // Successful login: reset attempts and record last login
        user.failedLoginAttempts = 0;
        user.lockoutUntil = undefined;
        user.lastLoginAt = new Date();
        await user.save();

        await logAdminAction(email, 'admin_login_success', 'AdminUser', user.id);

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
        token.role = (user as any).role || 'admin';
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};
