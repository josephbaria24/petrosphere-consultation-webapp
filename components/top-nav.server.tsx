// components/TopNav.server.tsx
import { cookies } from "next/headers"
import { supabase } from "../lib/supabaseClient"
import TopNav from "./top-nav"


export default async function TopNavServer() {
  const cookieStore = await cookies()
  const adminId = cookieStore.get("admin_token")?.value

  let fullName = ""
  let email = ""

  if (adminId) {
    const { data } = await supabase
      .from("admin_users")
      .select("full_name, email")
      .eq("id", adminId)
      .single()

    if (data) {
      fullName = data.full_name || ""
      email = data.email || ""
    }
  }

  return <TopNav fullName={fullName} email={email} />
}
