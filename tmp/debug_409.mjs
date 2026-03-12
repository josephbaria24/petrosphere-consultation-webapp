
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugInsert() {
  console.log('Testing insert into task_sessions...')
  
  // Try to find a template first to get valid IDs
  const { data: templates, error: tErr } = await supabase.from('task_templates').select('id').limit(1)
  if (tErr) {
    console.error('Error fetching templates:', tErr)
    return
  }
  
  if (!templates || templates.length === 0) {
    console.error('No templates found. Cannot test insert.')
    return
  }
  
  const templateId = templates[0].id
  
  // Find a checklist for this template
  const { data: checklists, error: cErr } = await supabase
    .from('checklist_templates')
    .select('id')
    .eq('task_template_id', templateId)
    .limit(1)
    
  if (cErr || !checklists?.length) {
    console.error('No checklists found for template:', templateId)
    return
  }
  
  const checklistId = checklists[0].id

  // We need a valid org_id and user_id. 
  // Let's try to find them from the database since we don't have the current session.
  const { data: orgs } = await supabase.from('organizations').select('id').limit(1)
  const { data: users } = await supabase.from('users').select('id').limit(1)
  
  if (!orgs?.length || !users?.length) {
    console.error('Could not find existing orgs or users to test with.')
    return
  }
  
  const orgId = orgs[0].id
  const userId = users[0].id

  console.log(`Using IDs: template=${templateId}, checklist=${checklistId}, org=${orgId}, user=${userId}`)

  const { data, error } = await supabase
    .from('task_sessions')
    .insert({
      task_template_id: templateId,
      checklist_id: checklistId,
      org_id: orgId,
      user_id: userId,
      status: 'in_progress'
    })
    .select()

  if (error) {
    console.error('FULL ERROR OBJECT:')
    console.dir(error, { depth: null })
  } else {
    console.log('Insert successful:', data)
  }
}

debugInsert()
