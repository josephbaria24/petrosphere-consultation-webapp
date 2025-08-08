// app/(main)/admin/create-survey/page.tsx (server component)
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { supabase } from "../../../../lib/supabaseClient"
import CreateSurveyPageClient from "./CreateSurveyPageClient"

export default async function CreateSurveyPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_id")?.value

  if (!token) {
    redirect("/admin-login")
  }

  const { data } = await supabase
    .from("admin_users")
    .select("id")
    .eq("id", token)
    .single()

  if (!data) {
    redirect("/admin-login")
  }

  // ✅ If we're here, the admin is verified
  return <CreateSurveyPageClient />
}
