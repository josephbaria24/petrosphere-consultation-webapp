import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { token } = await req.json()
  const res = NextResponse.json({ success: true })

  res.cookies.set('admin_token', token, {
    path: '/',
    maxAge: 60 * 60, // 1 hour
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  })

  return res
}
