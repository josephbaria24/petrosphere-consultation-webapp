import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSubscriptions() {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, organizations(name)')
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (error) {
    console.error('Error fetching subscriptions:', error)
  } else {
    console.log('Recent Subscriptions:', JSON.stringify(data, null, 2))
  }
}

checkSubscriptions()
