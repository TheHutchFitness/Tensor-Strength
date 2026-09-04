import { NextResponse } from 'next/server'

const COOKIE_NAME = 'ts_token'

// Routes that are always accessible without a session
const PUBLIC_PATHS = ['/login']

export function middleware(request) {
  const { pathname } = request.nextUrl

  // Allow public auth pages
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  // Protect everything except API routes, Next internals, and static asset files.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|png|svg|gif|webp|ico|css|js|map|txt|xml)).*)'],
}
