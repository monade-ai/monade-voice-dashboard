import { NextResponse, NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Refresh the session
  await supabase.auth.getSession();

  const { data: { user } } = await supabase.auth.getUser();

  const protectedRoutes = ["/dashboard"];
  const authRoutes = ["/auth/login", "/auth/signup"];
  const isProtectedRoute = protectedRoutes.includes(req.nextUrl.pathname);
  const isAuthRoute = authRoutes.includes(req.nextUrl.pathname);

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/dashboard", "/auth/login", "/auth/signup", "/auth/callback"], 
};
