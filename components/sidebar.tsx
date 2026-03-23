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
  ClipboardCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "../lib/utils"
import { getClientCookie } from "../lib/cookies-client";
import { useApp } from "./app/AppProvider"
import { Lock } from "lucide-react"
import { Badge } from "../@/components/ui/badge"
import { UpgradeRequiredModal } from "./upgrade-required-modal"
import { LoadingOverlay } from "./ui/loading-overlay"

export default function Sidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const isAdmin = !!getClientCookie("admin_id")
  const basePath = isAdmin ? "/admin" : "/user"
  const { subscription, limits, membership } = useApp()
  const isDemo = subscription?.plan === "demo" && !isAdmin
  const isExportsLocked = !isAdmin && !limits?.allow_exports;
  const isDimensionsLocked = !isAdmin && !limits?.allow_dimensions;
  const isRespondentsLocked = !isAdmin && !limits?.allow_respondents;
  const isIndividualResponsesLocked = !isAdmin && !limits?.allow_individual_responses;
  const isCreateSurveyLocked = !isAdmin && !limits?.allow_create_survey;
  const isTasksLocked = !isAdmin && !limits?.allow_tasks;

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [lockedFeatureName, setLockedFeatureName] = useState("")
  const [isNavigating, setIsNavigating] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Persist collapse state
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved) setIsCollapsed(saved === "true")
  }, [])

  const toggleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem("sidebar-collapsed", String(newState))
  }

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
      } else if (pathname !== href) {
        setIsNavigating(true)
        // Reset navigation state after a reasonable timeout in case of fast transitions
        setTimeout(() => setIsNavigating(false), 2000)
      }
    }

    return (
      <Link
        href={isLocked ? "#" : href}
        onClick={handleClick}
        className={cn(
          "flex items-center px-3 py-2 text-sm rounded-md transition-all duration-200 w-full group relative",
          isActive
            ? "bg-gray-100 text-orange-500 font-semibold dark:bg-[#1F1F23] dark:text-orange-500"
            : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1F1F23]",
          isLocked && "cursor-pointer",
          isCollapsed ? "justify-center px-2" : "px-3"
        )}
      >
        <div className={cn("flex items-center transition-all duration-300", isCollapsed ? "justify-center w-full" : "flex-1")}>
          <Icon className={cn("flex-shrink-0 transition-all duration-300", isCollapsed ? "h-6 w-6 m-0" : "h-4 w-4 mr-3")} />
          {!isCollapsed && (
            <div className="flex items-center justify-between w-full animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="truncate">{children}</span>
              {isLocked && (
                <div className="flex items-center gap-1 ml-auto flex-shrink-0 pl-2">
                  <Lock className="h-3 w-3 text-muted-foreground mr-1" />
                  <Badge variant="outline" className="text-[10px] px-1 h-4 bg-orange-500/10 text-orange-600 border-orange-500/20">Paid</Badge>
                </div>
              )}
            </div>
          )}
        </div>
        {isCollapsed && isActive && (
          <div className="absolute left-0 w-1 h-6 bg-orange-500 rounded-r-full" />
        )}
      </Link>
    )
  }

  function NavGroup({
    title,
    icon: Icon,
    children,
    defaultExpanded = false
  }: {
    title: string
    icon: React.ComponentType<{ className?: string }>
    children: React.ReactNode
    defaultExpanded?: boolean
  }) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded)

    if (isCollapsed) {
      return (
        <div className="flex flex-col items-center gap-1">
          {children}
        </div>
      )
    }

    return (
      <div className="space-y-1">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center px-3 py-2 text-sm rounded-md transition-colors w-full group text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1F1F23]"
        >
          <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
          <div className="flex items-center justify-between w-full">
            <span className="font-medium">{title}</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isExpanded ? "transform rotate-180" : "")} />
          </div>
        </button>
        {isExpanded && (
          <div className="pl-4 space-y-1">
            {children}
          </div>
        )}
      </div>
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
          "fixed inset-y-0 left-0 z-[70] bg-white dark:bg-[#0F0F12] transition-all duration-300 ease-in-out border-r border-border/50",
          isCollapsed ? "lg:w-20" : "lg:w-72",
          "lg:translate-x-0 lg:static border-0 shadow-2xl overflow-hidden",
          isMobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full"
        )}
      >
        <div className="h-full flex flex-col relative overflow-visible">
          <Link
            href="#"
            className={cn("h-16 flex items-center border-0 transition-all px-6", isCollapsed ? "justify-center px-0" : "px-6")}
          >
            <div className={cn("flex flex-col pt-10 items-start gap-1 transition-all", isCollapsed ? "items-center" : "items-start")}>
              {isCollapsed ? (
                <Image
                  src="/icons/logo_trans.png"
                  alt="Petrosphere Logo"
                  width={42}
                  height={42}
                  className="transition-all hover:scale-110 duration-300"
                />
              ) : (
                <div className="flex flex-col">
                  <img src="/logo_trans.png" alt="logo" className="h-auto w-auto" />
                </div>
              )}
            </div>
          </Link>

          <div className={cn("flex-1 overflow-y-auto py-15 px-4 space-y-6 scrollbar-hide", isCollapsed ? "px-2" : "px-4")}>
            <div className={cn("border-0 rounded-2xl p-2 bg-zinc-100 dark:bg-zinc-900 transition-all", isCollapsed ? "p-1 rounded-xl" : "p-2")}>
              {/* <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Overview
              </div> */}
              <div className="space-y-1">
                <div id="tour-sidebar-dashboard">
                  <NavItem href="/dashboard" icon={Home}>Dashboard</NavItem>
                </div>

                <NavGroup title="Survey" icon={FileText} defaultExpanded={true}>
                  <NavItem href={`${basePath}/create-survey`} icon={PlusCircle} isLocked={isCreateSurveyLocked}>Create Survey</NavItem>
                  <NavItem
                    href={`${basePath}/survey-responses`}
                    icon={FileText}
                    isLocked={isIndividualResponsesLocked}
                  >
                    Survey Responses
                  </NavItem>
                  <div id="tour-sidebar-view-survey">
                    <NavItem href={`${basePath}/view-survey`} icon={Folder}>View Survey</NavItem>
                  </div>
                  <NavItem
                    href={`${basePath}/respondents`}
                    icon={Users2}
                    isLocked={isRespondentsLocked}
                  >
                    Respondents
                  </NavItem>
                  <NavItem
                    href={`${basePath}/dimensions`}
                    icon={SquareRoundCorner}
                    isLocked={isDimensionsLocked}
                  >
                    Dimensions
                  </NavItem>
                </NavGroup>

                {isAdmin && (
                  <NavItem href={`${basePath}/organizations`} icon={Building2}>Manage Organizations</NavItem>
                )}

                <NavItem href={`${basePath}/tasks`} icon={ClipboardCheck} isLocked={isTasksLocked}>
                  Tasks
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

          <div className={cn("px-4 py-4 border-t border-border/10 space-y-1", isCollapsed ? "px-2" : "px-4")}>
            <NavItem href={`${basePath}/settings`} icon={Settings}>Settings</NavItem>

            <button
              onClick={toggleCollapse}
              className={cn(
                "flex items-center px-3 py-2 text-sm rounded-md transition-all duration-200 w-full group relative text-gray-600 dark:text-gray-300 hover:text-orange-500 dark:hover:text-orange-500 hover:bg-gray-50 dark:hover:bg-[#1F1F23]",
                isCollapsed ? "justify-center px-2" : "px-3"
              )}
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <div className={cn("flex items-center transition-all duration-300", isCollapsed ? "justify-center w-full" : "flex-1")}>
                {isCollapsed ? (
                  <ChevronRight className="h-6 w-6 flex-shrink-0" />
                ) : (
                  <>
                    <ChevronLeft className="h-4 w-4 mr-3 flex-shrink-0" />
                    <span className="truncate font-medium animate-in fade-in slide-in-from-left-2 duration-300">Collapse Sidebar</span>
                  </>
                )}
              </div>
            </button>
          </div>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[65] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {isNavigating && (
        <LoadingOverlay
          variant="fullscreen"
          message="Navigating..."
          subMessage="Loading your workspace"
        />
      )}
    </>
  )
}
