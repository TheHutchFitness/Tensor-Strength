import { NextResponse } from 'next/server'

const COOKIE_NAME = 'ts_token'

const PUBLIC_PATHS = ['/login', '/checkout', '/free-programs', '/programs', '/meet-the-team', '/professionals', '/apply', '/macros', '/auth/emergent/callback', '/offline.html', '/manifest.webmanifest', '/sw.js']

export function middleware(request) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    if (pathname !== '/') {
      url.searchParams.set('from', `${pathname}${request.nextUrl.search}`)
    }
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|png|svg|gif|webp|ico|css|js|map|txt|xml|pdf|xlsx|csv|zip|json|mp4|mov|webm)).*)'],
}
