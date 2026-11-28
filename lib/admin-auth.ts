import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';

export interface AdminSessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

type SessionUserShape = {
  id?: string;
  email?: string | null;
  name?: string | null;
  role?: string;
};

export async function getAdminSession(): Promise<AdminSessionUser | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUserShape | undefined;
  if (!user?.email || !isAdminRole(user.role)) return null;

  return {
    id: user.id || '',
    email: user.email,
    name: user.name || 'Admin',
    role: user.role,
  };
}

export async function requireAdmin(): Promise<AdminSessionUser> {
  const admin = await getAdminSession();
  if (!admin) {
    throw new Error('Unauthorized: Admin authentication required');
  }
  return admin;
}

export async function requireAdminPage(): Promise<AdminSessionUser> {
  const admin = await getAdminSession();
  if (!admin) {
    redirect('/admin/login');
  }
  return admin;
}

export async function requireAdminApi(): Promise<
  { user: AdminSessionUser } | { errorResponse: NextResponse }
> {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUserShape | undefined;

  if (!user?.email) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Unauthorized. Please sign in as an administrator.' },
        { status: 401 }
      ),
    };
  }

  if (!isAdminRole(user.role)) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Forbidden. Administrator role required.' },
        { status: 403 }
      ),
    };
  }

  return {
    user: {
      id: user.id || '',
      email: user.email,
      name: user.name || 'Admin',
      role: user.role,
    },
  };
}
