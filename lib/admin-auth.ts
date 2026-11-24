import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export interface AdminSessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export async function getAdminSession(): Promise<AdminSessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return {
    id: (session.user as any).id || '',
    email: session.user.email,
    name: session.user.name || 'Admin',
    role: (session.user as any).role || 'admin',
  };
}

export async function requireAdmin(): Promise<AdminSessionUser> {
  const admin = await getAdminSession();
  if (!admin) {
    throw new Error('Unauthorized: Admin authentication required');
  }
  return admin;
}

export async function requireAdminApi(): Promise<{ user: AdminSessionUser } | { errorResponse: NextResponse }> {
  const admin = await getAdminSession();
  if (!admin) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Unauthorized. Please sign in as an administrator.' },
        { status: 401 }
      ),
    };
  }
  return { user: admin };
}
