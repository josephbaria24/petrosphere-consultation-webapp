import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  try {
    console.log('--- Checking for isolation gaps ---');
    
    const { data: tpls, error: tErr } = await supabase
      .from('task_templates')
      .select('id, title, org_id');
    
    if (tErr) console.error(tErr);
    else {
      const nullOrgTpls = tpls.filter(t => !t.org_id);
      console.log(`Task Templates: ${tpls.length} total, ${nullOrgTpls.length} with NULL org_id (System Templates)`);
      if (nullOrgTpls.length > 0) {
        console.table(nullOrgTpls.slice(0, 5));
      }
    }

    const { data: sessions, error: sErr } = await supabase
      .from('task_sessions')
      .select('id, org_id');
    
    if (sErr) console.error(sErr);
    else {
      const nullOrgSessions = sessions.filter(s => !s.org_id);
      console.log(`Task Sessions: ${sessions.length} total, ${nullOrgSessions.length} with NULL org_id (LEAK)`);
      if (nullOrgSessions.length > 0) {
          console.table(nullOrgSessions.slice(0, 5));
      }
    }

    // Check for "other" orgs
    const orgIds = [...new Set(tpls.map(t => t.org_id).filter(Boolean))];
    console.log(`Unique Organizations with Templates: ${orgIds.length}`);

  } catch (err) {
    console.error('Inspection failed:', err);
  }
}

inspect();
