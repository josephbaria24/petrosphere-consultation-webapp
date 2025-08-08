import { cookies } from "next/headers"
import { supabase } from "../lib/supabaseClient"
import Profile01 from "./profile-01"


export default async function Profile01Server() {
  const cookieStore = cookies()
  const adminId = (await cookieStore).get("admin_token")?.value

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

  return <Profile01 name={fullName} role={email} />
}
