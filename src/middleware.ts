import { NextResponse, NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  try {
    // Enhanced session validation with proper error handling
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.warn('[Middleware] Session fetch error:', sessionError.message);
      // If session fetch fails, treat as unauthenticated
    }

    // Get user data with additional validation
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.warn('[Middleware] User fetch error:', userError.message);
      // If user fetch fails, treat as unauthenticated
    }

    const user = userData?.user;
    const session = sessionData?.session;

    // Define all authentication routes that should be accessible without login
    const authRoutes = [
      '/auth/login', 
      '/auth/signup', 
      '/auth/callback',
      '/auth/join',
      '/auth/invite',
      '/auth/onboarding',
    ];
    
    const currentPath = req.nextUrl.pathname;
    const isAuthRoute = authRoutes.some((route) => currentPath.startsWith(route));

    // Enhanced session validation - check both user and session validity
    const hasValidSession = user && session && (
      !session.expires_at || 
      (session.expires_at && new Date(session.expires_at * 1000) > new Date())
    );

    // Handle unauthenticated users trying to access protected routes
    if (!isAuthRoute && !hasValidSession) {
      console.log('[Middleware] Redirecting unauthenticated user to login:', currentPath);
      const loginUrl = new URL('/auth/login', req.url);
      
      // Preserve the original URL for redirect after login (except for logout scenarios)
      if (!req.nextUrl.searchParams.get('signedOut')) {
        loginUrl.searchParams.set('redirectTo', currentPath);
      }
      
      return NextResponse.redirect(loginUrl);
    }

    // Handle authenticated users trying to access auth routes
    if (isAuthRoute && hasValidSession) {
      // Special handling for signedOut parameter - don't redirect if user just logged out
      const signedOut = req.nextUrl.searchParams.get('signedOut');
      if (signedOut === 'true') {
        console.log('[Middleware] User just signed out, allowing access to auth route');

        return res;
      }

      // For other auth routes with valid session, redirect to dashboard
      console.log('[Middleware] Redirecting authenticated user to dashboard from:', currentPath);

      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Allow the request to proceed
    return res;

  } catch (error) {
    console.error('[Middleware] Unexpected error:', error);
    
    // On any unexpected error, allow auth routes but redirect protected routes to login
    const currentPath = req.nextUrl.pathname;
    const authRoutes = [
      '/auth/login', 
      '/auth/signup', 
      '/auth/callback',
      '/auth/join',
      '/auth/invite',
      '/auth/onboarding',
    ];
    
    const isAuthRoute = authRoutes.some((route) => currentPath.startsWith(route));
    
    if (!isAuthRoute) {
      console.log('[Middleware] Error occurred, redirecting to login for safety');

      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
    
    return res;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};