import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublicAuthPath = pathname === '/login' || pathname.startsWith('/auth');

  let supabaseResponse = NextResponse.next({
    request,
  });

  // Public auth pages don't require user validation in middleware.
  // This keeps login/signup flows resilient if auth provider is slow.
  if (isPublicAuthPath) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    !user
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    url.pathname = '/login';

    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
