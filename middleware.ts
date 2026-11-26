import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isAdminRole } from '@/lib/roles';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === '/admin/login' || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json(
          { error: 'Unauthorized: Admin authentication required' },
          { status: 401 }
        );
      }
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    const token = await getToken({
      req,
      secret,
      secureCookie:
        process.env.NODE_ENV === 'production' &&
        !(process.env.NEXTAUTH_URL || '').startsWith('http://'),
    });

    if (!token) {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json(
          { error: 'Unauthorized: Admin authentication required' },
          { status: 401 }
        );
      }
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!isAdminRole(token.role)) {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json(
          { error: 'Forbidden: Administrator role required' },
          { status: 403 }
        );
      }
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('error', 'AccessDenied');
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
