/**
 * File: lib/supabaseClient.ts
 * Description: Supabase client initialization.
 * Provides a configured client for database and auth interactions on the client-side.
 * Connections:
 * - Used globally across the application for direct database queries and auth state management.
 */
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
