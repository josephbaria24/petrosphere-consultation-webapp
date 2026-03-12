
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

const GLOBAL_ORG_ID = "939f6864-0f36-4740-9509-a654b453c9d9"

async function checkOrg() {
  const { data, error } = await supabase.from('organizations').select('id, name').eq('id', GLOBAL_ORG_ID).single()
  
  if (error) {
    console.log('Global Org not found or error:', error.message)
    
    // Try to find ANY org to see if the table exists
    const { data: anyOrg } = await supabase.from('organizations').select('id, name').limit(1)
    console.log('Available orgs:', anyOrg)
  } else {
    console.log('Global Org exists:', data)
  }
}

checkOrg()
