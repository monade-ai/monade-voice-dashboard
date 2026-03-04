import { NextRequest, NextResponse } from 'next/server';

const CONFIG_SERVER_BASE =
  process.env.NEXT_PUBLIC_CONFIG_SERVER_URL
  || process.env.NEXT_PUBLIC_MONADE_API_BASE_URL
  || process.env.MONADE_API_BASE_URL
  || 'https://service.monade.ai/db_services';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const nextPath = searchParams.get('next') ?? '/login';
  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = nextPath;

  // Proxy Better Auth callback query params to config-server auth callback endpoint.
  const callbackUrl = new URL(`${CONFIG_SERVER_BASE}/api/auth/callback`);
  searchParams.forEach((value, key) => {
    callbackUrl.searchParams.set(key, value);
  });

  try {
    const response = await fetch(callbackUrl.toString(), {
      method: 'GET',
      headers: {
        Cookie: request.headers.get('cookie') || '',
      },
      redirect: 'manual',
      cache: 'no-store',
    });

    if (response.ok || (response.status >= 300 && response.status < 400)) {
      return NextResponse.redirect(redirectTo);
    }
  } catch (error) {
    console.error('[Auth Confirm] callback proxy failed:', error);
  }

  redirectTo.pathname = '/auth/auth-code-error';

  return NextResponse.redirect(redirectTo);
}
