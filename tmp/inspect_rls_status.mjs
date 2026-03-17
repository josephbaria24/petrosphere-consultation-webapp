import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectRLS() {
  try {
    const tableNames = ['task_templates', 'checklist_templates', 'checklist_items', 'task_sessions', 'task_responses', 'task_evidence'];
    
    // Query pg_class to check relrowsecurity
    const { data, error } = await supabase
      .from('pg_class')
      .select('relname, relrowsecurity')
      .in('relname', tableNames);
    
    if (error) {
       console.log('Direct pg_class query failed. Trying via RPC...');
       // If no RPC, we can try to guess by checking policy names in pg_policy
       const { data: policies, error: pErr } = await supabase.rpc('get_table_policies', { t_names: tableNames });
       if (pErr) {
           console.log('RPC failed. Trying to check if we can insert blindly with anon key.');
       } else {
           console.table(policies);
       }
    } else {
      console.log('--- RLS Status (relrowsecurity: true means ENABLED) ---');
      console.table(data);
    }

    // Checking for any "public" or "anonymous" policies
    const { data: publicPolicies, error: pubErr } = await supabase.from('pg_policy').select('polname, polrelid::regclass, polroles');
    if (!pubErr) {
       console.log('\n--- Existing Policies ---');
       console.table(publicPolicies.filter(p => p.polname.includes('task') || p.polname.includes('checklist')));
    }

  } catch (err) {
    console.error('Inspection failed:', err);
  }
}

inspectRLS();
