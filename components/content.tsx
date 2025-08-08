import { LucidePercentSquare, TrendingUpIcon } from "lucide-react"
import List01 from "./list-01"
import List02 from "./list-02"
import { cookies } from "next/headers"
import { supabase } from "../lib/supabaseClient"


export default async function Content() {
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

  return (
    <div className="space-y-4">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 flex flex-col border border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-left flex items-center gap-2 ">
            <LucidePercentSquare className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
            Scores
          </h2>
          <div className="flex-1">
            <List01 className="h-full" />
          </div>
        </div>
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 flex flex-col border border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-left flex items-center gap-2">
            <TrendingUpIcon className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
            Trends
          </h2>
          <div className="flex-1">
            <List02 className="h-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
