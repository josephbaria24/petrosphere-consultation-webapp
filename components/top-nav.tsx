// components/TopNav.tsx
"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Bell, ChevronRight, HelpCircle } from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "./theme-toggle"
import ProfileDropdown from "./kokonutui/profile-dropdown"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabaseClient"
import { useApp } from "./app/AppProvider"
import { getClientCookie, Cookies } from "../lib/cookies-client"
import { Button } from "./ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "./ui/tooltip"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"

interface Notification {
  id: string;
  user_id: string;
  timestamp: string;
  type: 'response';
  org_id?: string;
}

interface BreadcrumbItem {
  label: string
  href?: string
}

export default function TopNav({ fullName, email }: { fullName: string; email: string }) {
  const router = useRouter()
  const { subscription, resetTour, org } = useApp()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Detect admin cookie
  const isAdminId = !!getClientCookie("admin_id");
  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Safety Vitals", href: "#" },
    { label: "dashboard", href: "#" },
  ]

  useEffect(() => {
    const channel = supabase
      .channel('header_responses')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'responses',
        },
        (payload) => {
          // If not platform admin, only notify for current org
          if (!isAdminId && org?.id && payload.new.org_id !== org.id) return;

          const newNotif: Notification = {
            id: payload.new.id,
            user_id: payload.new.user_id,
            timestamp: new Date().toISOString(),
            type: 'response',
            org_id: payload.new.org_id
          };

          setNotifications(prev => [newNotif, ...prev].slice(0, 10));
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdminId, org?.id]);

  const handleLogout = async () => {
    try {
      // 1. Sign out of Supabase (for demo users)
      await supabase.auth.signOut()

      // 2. Clear server-side cookies via API
      await fetch('/api/logout', { method: 'POST' })

      // 3. Client-side fallback for cookies
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-[#1F1F23] rounded-full transition-colors"
                onClick={() => {
                  resetTour();
                  toast.success("Tutorial restarted! Starting from Step 1.");
                  router.refresh();
                }}
              >
                <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-300" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="font-bold uppercase tracking-widest text-[10px]">
              Restart Tutorial
            </TooltipContent>
          </Tooltip>

          <DropdownMenu onOpenChange={(open) => { if (open) setUnreadCount(0); }}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-[#1F1F23] rounded-full transition-colors relative"
                  >
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-300" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-background">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-bold uppercase tracking-widest text-[10px]">
                Notifications
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent 
              align="center" 
              sideOffset={12}
              className="w-[calc(100vw-1rem)] sm:w-80 p-0 overflow-hidden rounded-xl border-gray-200 dark:border-zinc-800 shadow-xl"
            >
              <DropdownMenuLabel className="p-4 bg-muted/50 dark:bg-zinc-900/50">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Notifications</span>
                  {notifications.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-[11px] hover:bg-transparent hover:text-blue-600"
                      onClick={() => setNotifications([])}
                    >
                      Clear All
                    </Button>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="m-0" />
              <div className="max-h-[350px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                    <Bell className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-sm">No new notifications</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <DropdownMenuItem 
                      key={notif.id} 
                      className="p-4 focus:bg-gray-50 dark:focus:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800/50 last:border-0 cursor-pointer"
                    >
                      <div className="flex gap-4 w-full">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                          <Image
                            src={`https://api.dicebear.com/9.x/glass/svg?seed=${notif.user_id}`}
                            alt="Respondent"
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                        </div>
                        <div className="flex flex-col gap-1 overflow-hidden">
                          <p className="text-sm font-medium leading-none">
                            New Survey Response
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            A participant has submitted a response to your safety survey.
                          </p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipProvider>

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
