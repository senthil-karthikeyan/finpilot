import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME } from '@finpilot/shared';
import { getSafeRedirectUrl } from '@/lib/auth-error-handler';

export function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const { pathname, search } = request.nextUrl;

  // 1. If user is accessing /login
  if (pathname === '/login') {
    if (token) {
      const nextParam = request.nextUrl.searchParams.get('next');
      const targetUrl = getSafeRedirectUrl(nextParam, '/customers');
      return NextResponse.redirect(new URL(targetUrl, request.url));
    }
    return NextResponse.next();
  }

  // 2. For root path '/', redirect to /customers if authenticated, else /login
  if (pathname === '/') {
    if (token) {
      return NextResponse.redirect(new URL('/customers', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. For protected routes (/customers, /admin, etc.), require session cookie
  if (!token) {
    const nextPath = encodeURIComponent(`${pathname}${search}`);
    const loginUrl = new URL(`/login?next=${nextPath}`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api routes (/api/*)
     * - logout route (/logout)
     */
    '/((?!_next/static|_next/image|favicon.ico|api|logout).*)',
  ],
};
