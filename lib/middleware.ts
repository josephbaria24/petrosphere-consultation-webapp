// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value // use cookies instead of localStorage for security
  const url = req.nextUrl.clone()

  // Protect dashboard and other admin pages
  if (url.pathname.startsWith('/dashboard') && !token) {
    url.pathname = '/admin-login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}
export const config = {
    matcher: ['/dashboard', '/dashboard/:path*', '/other-protected-route/:path*'],
  }
  