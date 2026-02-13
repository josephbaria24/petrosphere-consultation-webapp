/**
 * File: components/sidebar.tsx
 * Description: Primary navigation component for the application.
 * Dynamically renders navigation links based on user roles (Admin vs. User) and handles mobile visibility.
 * Functions:
 * - Sidebar(): Main component managing navigation state and layout.
 * - NavItem({ href, icon, children }): Sub-component for individual navigation links with active state detection.
 * - handleNavigation(): Closes the mobile menu upon link selection.
 * Connections:
 * - Integrated into (main)/layout.tsx.
 * - Uses AppProvider for subscription plan detection (isDemo).
 * - Reads admin_id cookie to determine the base navigation path (/admin vs /user).
 */
"use client"

import {
  Folder,
  Users2,
  Settings,
  HelpCircle,
  Menu,
  PlusCircle,
  FileText,
  Home,
  SquareRoundCorner,
  Building2,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "../lib/utils"
import { getClientCookie } from "../lib/cookies-client";
import { useApp } from "./app/AppProvider"
import { Lock } from "lucide-react"
import { Badge } from "../@/components/ui/badge"
import { UpgradeRequiredModal } from "./upgrade-required-modal"

export default function Sidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const isAdmin = !!getClientCookie("admin_id")
  const basePath = isAdmin ? "/admin" : "/user"
  const { subscription } = useApp()
  const isDemo = subscription?.plan === "demo" && !isAdmin

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [lockedFeatureName, setLockedFeatureName] = useState("")

  function handleNavigation() {
    setIsMobileMenuOpen(false)
  }

  function NavItem({
    href,
    icon: Icon,
    children,
    isLocked = false,
  }: {
    href: string
    icon: React.ComponentType<{ className?: string }>
    children: React.ReactNode
    isLocked?: boolean
  }) {
    const isActive = pathname === href

    const handleClick = (e: React.MouseEvent) => {
      handleNavigation() // Always close mobile menu first
      if (isLocked) {
        e.preventDefault()
        setLockedFeatureName(children as string)
        setUpgradeModalOpen(true)
      }
    }

    return (
      <Link
        href={isLocked ? "#" : href}
        onClick={handleClick}
        className={cn(
          "flex items-center px-3 py-2 text-sm rounded-md transition-colors w-full group",
          isActive
            ? "bg-gray-100 text-orange-500 font-semibold dark:bg-[#1F1F23] dark:text-orange-500"
            : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1F1F23]",
          isLocked && "cursor-pointer"
        )}
      >
        <div className="flex items-center flex-1">
          <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
          <div className="flex items-center justify-between w-full">
            <span>{children}</span>
            {isLocked && (
              <div className="flex items-center gap-1 ml-auto">
                <Lock className="h-3 w-3 text-muted-foreground mr-1" />
                <Badge variant="outline" className="text-[10px] px-1 h-4 bg-orange-500/10 text-orange-600 border-orange-500/20">Paid</Badge>
              </div>
            )}
          </div>
        </div>
      </Link>
    )
  }


  return (
    <>
      <UpgradeRequiredModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        title={lockedFeatureName ? `${lockedFeatureName} Restricted` : "Upgrade Required"}
      />

      <button
        type="button"
        className="lg:hidden fixed top-4 left-4 z-[70] p-2 rounded-lg bg-white dark:bg-[#0F0F12] shadow-md"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      </button>

      <nav
        className={cn(
          "fixed inset-y-0 left-0 z-[70] w-64 bg-white dark:bg-[#0F0F12] transform transition-transform duration-200 ease-in-out",
          "lg:translate-x-0 lg:static lg:w-55 border-0 shadow-2xl ",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-full flex flex-col">
          <Link
            href="#"
            className="h-16 px-6 flex items-center border-0"
          >
            <div className="flex flex-col pt-2 items-start gap-1">
              <Image
                src="/icons/logo.png"
                alt="Petrosphere Logo"
                width={60}
                height={60}
                className="hidden dark:block"
              />
              <Image
                src="/icons/logo.png"
                alt="Petrosphere Logo"
                width={60}
                height={60}
                className="block dark:hidden"
              />
              <div className="flex flex-col">
                <img src="/logo_trans.png" alt="logo" />

              </div>
            </div>
          </Link>

          <div className="flex-1 overflow-y-auto py-15 px-4 space-y-6">
            <div className="border-0 rounded-2xl p-2 bg-zinc-100 dark:bg-zinc-900">
              {/* <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Overview
              </div> */}
              <div className="space-y-1">
                <div id="tour-sidebar-dashboard">
                  <NavItem href="/dashboard" icon={Home}>Dashboard</NavItem>
                </div>
                <NavItem href={`${basePath}/create-survey`} icon={PlusCircle}>Create Survey</NavItem>
                <NavItem
                  href={`${basePath}/survey-responses`}
                  icon={FileText}
                  isLocked={isDemo}
                >
                  Survey Responses
                </NavItem>
                <div id="tour-sidebar-view-survey">
                  <NavItem href={`${basePath}/view-survey`} icon={Folder}>View Survey</NavItem>
                </div>
                {isAdmin && (
                  <NavItem href={`${basePath}/organizations`} icon={Building2}>Manage Organizations</NavItem>
                )}
                <NavItem
                  href={`${basePath}/respondents`}
                  icon={Users2}
                  isLocked={isDemo}
                >
                  Respondents
                </NavItem>
                <NavItem
                  href={`${basePath}/dimensions`}
                  icon={SquareRoundCorner}
                  isLocked={isDemo}
                >
                  Dimensions
                </NavItem>
              </div>
            </div>

            <div>
              {/* <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Management
              </div> */}
              <div className="space-y-1">

              </div>
            </div>
          </div>

          <div className="px-4 py-4 border-0 space-y-1">
            <NavItem href={`${basePath}/settings`} icon={Settings}>Settings</NavItem>
            {/* <NavItem href={`${basePath}/help`} icon={HelpCircle}>Help</NavItem> */}
          </div>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[65] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}
