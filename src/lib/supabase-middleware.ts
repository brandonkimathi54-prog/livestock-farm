import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect authenticated users away from /auth or /login to /dashboard
  if (user && (request.nextUrl.pathname === '/auth' || request.nextUrl.pathname === '/login')) {
    const dashboardUrl = new URL('/dashboard', request.url);
    if (request.nextUrl.pathname !== dashboardUrl.pathname) {
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // Protect /dashboard and /inventory routes
  if (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/inventory')) {
    if (!user) {
      const authUrl = new URL('/auth', request.url);
      if (request.nextUrl.pathname !== authUrl.pathname) {
        return NextResponse.redirect(authUrl);
      }
    }
  }

  return response;
}
