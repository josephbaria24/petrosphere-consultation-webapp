import type { ReactNode } from "react"
import { cookies } from "next/headers"
import { supabase } from "../../../lib/supabaseClient"
import Sidebar from "../../../components/sidebar"
import TopNav from "../../../components/top-nav"

interface LayoutProps {
  children: ReactNode
}

export default async function Layout({ children }: LayoutProps) {
  const cookieStore = cookies()
  const adminId = (await cookieStore).get("admin_id")?.value

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
    <div className="flex h-screen">
      <Sidebar />
      <div className="w-full flex flex-1 flex-col">
        <header className="h-16 border-0 ">
          <TopNav fullName={fullName} email={email} />
        </header>
        <main className="flex-1 overflow-auto p-6 bg-gray-100 dark:bg-[#0F0F12]">
          {children}
        </main>
      </div>
    </div>
  )
}
