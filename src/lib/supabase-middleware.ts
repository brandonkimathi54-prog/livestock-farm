import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // This refreshes the session if it's expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log('Middleware Path:', request.nextUrl.pathname, 'User:', user?.id)

  // Only redirect to /auth if accessing /dashboard and no user
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      const authUrl = new URL('/auth', request.url);
      if (request.nextUrl.pathname !== authUrl.pathname) {
        return NextResponse.redirect(authUrl);
      }
    }
  }

  return response
}
