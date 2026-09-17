import { NextResponse } from 'next/server'

const COOKIE_NAME = 'ts_token'

// Routes that are always accessible without a session
const PUBLIC_PATHS = ['/login', '/landing', '/free-programs', '/programs', '/meet-the-team', '/professionals', '/apply', '/macros', '/auth/emergent/callback', '/offline.html', '/manifest.webmanifest', '/sw.js']

export function middleware(request) {
  const { pathname } = request.nextUrl

  // Allow public auth pages
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) {
    // Logged-out visitors landing on the root see the public marketing page
    // (served from /public/landing). Members who log in get the app home at '/'.
    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/landing/index.html', request.url))
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // Preserve an intended deep link such as the next scheduled workout.
    url.searchParams.set('from', `${pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  // Protect everything except API routes, Next internals, and static asset files.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|png|svg|gif|webp|ico|css|js|map|txt|xml|pdf|xlsx|csv|zip|json|mp4|mov|webm)).*)'],
}
