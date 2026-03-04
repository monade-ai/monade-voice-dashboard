import { NextResponse, type NextRequest } from 'next/server';

import { hasBetterAuthSessionCookieFromRequest } from '@/lib/auth/server-auth';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicRoutes = ['/login', '/auth/confirm', '/auth/auth-code-error'];

  // Keep root deterministic and avoid unnecessary auth round-trips.
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';

    return NextResponse.redirect(url);
  }

  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  if (!hasBetterAuthSessionCookieFromRequest(request.cookies)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';

    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
         * Match non-static, non-api pages:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
    '/',
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
