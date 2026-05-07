// app/api/set-admin-cookie/route.js
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getVerifiedAdminFromCookie } from '../../../../lib/server/admin-auth'

export async function POST(request) {
  try {
    const admin = await getVerifiedAdminFromCookie()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { adminId } = await request.json()

    if (!adminId) {
      return NextResponse.json({ error: 'Admin ID is required' }, { status: 400 })
    }
    if (adminId !== admin.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const cookieStore = await cookies()

    // Set the cookie with proper options for server-side recognition
    cookieStore.set('admin_id', adminId, {
      httpOnly: false, // Allow client-side access
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error setting admin cookie:', error)
    return NextResponse.json({ error: 'Failed to set cookie' }, { status: 500 })
  }
}