
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for schema inspection

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars (need SERVICE_ROLE_KEY for schema inspection)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function inspectSchema() {
  console.log('Inspecting task_sessions constraints...')
  
  const { data: constraints, error: cErr } = await supabase.rpc('inspect_table_constraints', { table_name_param: 'task_sessions' })
  
  // If RPC doesn't exist, try a direct query via a sneaky SQL injection if enabled (unlikely)
  // or just use a standard query if we can.
  // Actually, let's try to query information_schema.table_constraints
  
  const { data, error } = await supabase.from('information_schema_table_constraints')
    .select('*')
    .eq('table_name', 'task_sessions')
  
  if (error) {
    console.error('Direct query to information_schema failed (expected if not exposed):', error.message)
    
    // Plan B: Try to run a custom SQL via the dashboard or a migration if possible.
    // But wait, I can just try to insert with a DIFFERENT ID and see if it still 409s.
  } else {
    console.log('Constraints:', data)
  }

  // Check RLS
  const { data: rls, error: rlsErr } = await supabase.from('pg_policies')
    .select('*')
    .eq('tablename', 'task_sessions')
    
  if (rlsErr) {
    console.log('RLS query failed (expected):', rlsErr.message)
  } else {
    console.log('RLS Policies:', rls)
  }
}

inspectSchema()
