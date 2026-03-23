import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const email = "josephbaria24@gmail.com"; 
  
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  const user = users.find(u => u.email === email);
  
  if (!user) {
    console.log("User not found in Auth");
    return;
  }
  
  console.log(`User ID: ${user.id}`);
  
  const { data: membership } = await supabase
    .from("memberships")
    .select("org_id, role")
    .eq("user_id", user.id)
    .single();
    
  console.log("Membership:", JSON.stringify(membership, null, 2));
  
  if (membership) {
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("org_id", membership.org_id)
      .maybeSingle();
      
    console.log("Subscription:", JSON.stringify(subscription, null, 2));
    
    const { data: org } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", membership.org_id)
      .single();
      
    console.log("Organization:", JSON.stringify(org, null, 2));
  }
}

check().catch(console.error);
