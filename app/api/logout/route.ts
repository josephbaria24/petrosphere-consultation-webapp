import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    const cookieStore = await cookies()

    // Delete administrative cookies with the same options they were set with
    cookieStore.delete('admin_id')
    cookieStore.delete('admin_token')

    // Clear common Supabase-related cookies
    const supabaseProjectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/(.*?)\.supabase\.co/)?.[1]
    if (supabaseProjectRef) {
      cookieStore.delete(`sb-${supabaseProjectRef}-auth-token`)
      cookieStore.delete(`sb-${supabaseProjectRef}-auth-token-code-verifier`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Failed to logout' }, { status: 500 })
  }
}
