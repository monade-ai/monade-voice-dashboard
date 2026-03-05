import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = '/login';
  redirectTo.searchParams.set(
    'message',
    'Email OTP confirmation is deprecated. Please use backend auth sign-in flow.',
  );
  return NextResponse.redirect(redirectTo);
}
