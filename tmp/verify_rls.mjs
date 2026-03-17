import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 

if (!supabaseUrl || !anonKey) {
  console.error('Missing env vars.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function testAccess() {
  console.table('--- Verification: Cross-Org Exposure ---');
  
  // 1. Fetch ALL templates anonymously
  const { data: tpls, error: tErr } = await supabase.from('task_templates').select('id, title, org_id');
  if (tErr) console.error('Error fetching templates:', tErr.message);
  else {
    console.log(`Anonymously fetched ${tpls.length} templates.`);
    const leaked = tpls.filter(t => t.org_id !== null);
    if (leaked.length > 0) {
      console.warn(`⚠️ SECURITY BREACH: Found ${leaked.length} non-system templates visible anonymously!`);
      console.table(leaked);
    } else {
      console.log('✅ Templates with org_id are protected from anonymous access.');
    }
  }

  // 2. Fetch ALL sessions anonymously
  const { data: sessions, error: sErr } = await supabase.from('task_sessions').select('id, org_id');
  if (sErr) console.error('Error fetching sessions:', sErr.message);
  else {
      console.log(`Anonymously fetched ${sessions.length} sessions.`);
      if (sessions.length > 0) {
          console.warn(`⚠️ SECURITY BREACH: Found ${sessions.length} sessions visible anonymously!`);
          console.table(sessions);
      } else {
          console.log('✅ Sessions are protected from anonymous access.');
      }
  }
}

testAccess();
