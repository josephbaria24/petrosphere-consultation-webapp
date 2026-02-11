// components/TopNav.tsx
"use client"

import Image from "next/image"
import { Bell, ChevronRight } from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "./theme-toggle"
import ProfileDropdown from "./kokonutui/profile-dropdown"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabaseClient"
import { useApp } from "./app/AppProvider"

interface BreadcrumbItem {
  label: string
  href?: string
}

export default function TopNav({ fullName, email }: { fullName: string; email: string }) {
  const router = useRouter()
  const { subscription } = useApp()
  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Safety Vitals", href: "#" },
    { label: "dashboard", href: "#" },
  ]

  const handleLogout = async () => {
    try {
      // 1. Sign out of Supabase (for demo users)
      await supabase.auth.signOut()

      // 2. Clear server-side cookies via API
      await fetch('/api/logout', { method: 'POST' })

      // 3. Client-side fallback for cookies
      const { Cookies } = await import("../lib/cookies-client")
      Cookies.remove('admin_id', { path: '/' })
      Cookies.remove('admin_token', { path: '/' })

      // 4. Redirect
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error("Logout error:", error)
      router.push('/')
    }
  }

  return (
    <nav className="px-3 sm:px-6 flex items-center justify-between bg-gray-100 dark:bg-[#0F0F12] border-0 h-full">
      <div className="font-medium text-sm hidden sm:flex items-center space-x-1 truncate max-w-[300px]">
        {breadcrumbs.map((item, index) => (
          <div key={item.label} className="flex items-center">
            {index > 0 && <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400 mx-1" />}
            {item.href ? (
              <Link
                href={item.href}
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-900 dark:text-gray-100">{item.label}</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 sm:gap-2 ml-auto sm:ml-0 px-1 py-1 rounded-2xl">
        <button
          type="button"
          className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-[#1F1F23] rounded-full transition-colors"
        >
          <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-300" />
        </button>

        <ThemeToggle />

        <div className="ml-2">
          <ProfileDropdown
            data={{
              name: fullName,
              email: email,
              avatar: `https://api.dicebear.com/9.x/glass/svg?seed=${fullName}`,
              subscription: subscription?.plan === "demo" ? "DEMO" : "PRO",
              model: "Safety Insights 2.0"
            }}
            onLogout={handleLogout}
          />
        </div>
      </div>
    </nav>
  )
}
