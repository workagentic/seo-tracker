import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname
  const isLoginRoute = pathname.startsWith('/login')
  const isApiRoute = pathname.startsWith('/api/')

  if (!user && !isLoginRoute) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isLoginRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Role-based page gating (CLAUDE.md Section 14, migration 0028_role_rename.sql). API routes
  // are excluded -- each one does its own getCurrentProfile()-based check, and the Tasks page
  // itself calls several /api/tasks/* endpoints that a reviewer-role redirect below would
  // otherwise incorrectly block.
  if (user && !isApiRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const role = profile?.role

    if (pathname.startsWith('/admin')) {
      // /admin/users stays admin-only even for senior, who gets every other /admin/* sub-page.
      const isUsersPage = pathname.startsWith('/admin/users')
      const allowed = isUsersPage ? role === 'admin' : role === 'admin' || role === 'senior'
      if (!allowed) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }

    if (pathname.startsWith('/leads') && role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // Reviewer (Adeela) only ever sees the Tasks page -- a hard restriction, not just a
    // sidebar hide, since a reviewer typing /dashboard (or any other URL) directly would
    // otherwise still load it.
    if (role === 'reviewer' && !pathname.startsWith('/tasks')) {
      const url = request.nextUrl.clone()
      url.pathname = '/tasks'
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
