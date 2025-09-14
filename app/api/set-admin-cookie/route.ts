// app/api/set-admin-cookie/route.js
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { adminId } = await request.json()
    
    if (!adminId) {
      return NextResponse.json({ error: 'Admin ID is required' }, { status: 400 })
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