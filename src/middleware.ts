import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { jwtVerify } from 'jose'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Admin dashboard — separate auth, only protect /admin/dashboard
  if (pathname.startsWith('/admin/dashboard')) {
    const adminToken = request.cookies.get('admin-session')?.value
    if (!adminToken) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    try {
      const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET)
      await jwtVerify(adminToken, secret)
      return NextResponse.next()
    } catch {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // Public pages — redirect to /app if already logged in
  const publicAuthPages = ['/', '/login', '/register', '/pricing']
  if (publicAuthPages.includes(pathname)) {
    const useSecureCookie = !!(process.env.NEXTAUTH_URL?.startsWith('https://') || process.env.AUTH_URL?.startsWith('https://'))
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: useSecureCookie,
    })

    if (token) {
      return NextResponse.redirect(new URL('/app', request.url))
    }

    return NextResponse.next()
  }

  // App routes — NextAuth session
  const useSecureCookie = !!(process.env.NEXTAUTH_URL?.startsWith('https://') || process.env.AUTH_URL?.startsWith('https://'))
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: useSecureCookie,
  })

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/app/:path*', '/admin/dashboard/:path*', '/', '/login', '/register', '/pricing'],
}
