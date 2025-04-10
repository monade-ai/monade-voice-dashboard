import { NextResponse, NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Refresh the session
  await supabase.auth.getSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const authRoutes = ["/auth/login", "/auth/signup", "/auth/callback"];
  const currentPath = req.nextUrl.pathname;
  const isAuthRoute = authRoutes.some((route) =>
    currentPath.startsWith(route)
  );

  if (!isAuthRoute && !user) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
