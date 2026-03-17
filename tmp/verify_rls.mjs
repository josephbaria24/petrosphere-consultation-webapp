
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyRLS() {
  const tables = [
    'task_templates',
    'checklist_templates',
    'checklist_items',
    'task_sessions',
    'task_responses',
    'task_evidence'
  ]

  console.log('Verifying RLS status for task tables...')
  
  for (const table of tables) {
    const { data, error } = await supabase.rpc('inspect_rls_status', { table_name_param: table })
    
    if (error) {
      // If RPC fails, try a direct query to pg_tables via a service role if possible
      // or just assume it needs checking in the dashboard.
      console.log(`Checking ${table} via pg_tables...`)
      const { data: pgData, error: pgErr } = await supabase
        .from('pg_tables' as any)
        .select('rowsecurity')
        .eq('schemaname', 'public')
        .eq('tablename', table)
        .single()
      
      if (pgErr) {
        console.error(`Could not verify ${table}:`, pgErr.message)
      } else {
        console.log(`${table} RLS Enabled: ${pgData.rowsecurity}`)
      }
    } else {
      console.log(`${table} RLS Enabled: ${data}`)
    }
  }

  console.log('\nChecking policies...')
  const { data: policies, error: polErr } = await supabase
    .from('pg_policies' as any)
    .select('*')
    .in('tablename', tables)
  
  if (polErr) {
    console.error('Could not fetch policies:', polErr.message)
  } else {
    policies.forEach(p => {
      console.log(`- [${p.tablename}] Policy: ${p.policyname} (${p.cmd})`)
    });
  }
}

verifyRLS()
