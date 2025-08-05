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
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "../lib/utils"

export default function Sidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  function handleNavigation() {
    setIsMobileMenuOpen(false)
  }

  function NavItem({
    href,
    icon: Icon,
    children,
  }: {
    href: string
    icon: React.ComponentType<{ className?: string }>
    children: React.ReactNode
  }) {
    const isActive = pathname === href

    return (
      <Link
        href={href}
        onClick={handleNavigation}
        className={cn(
          "flex items-center px-3 py-2 text-sm rounded-md transition-colors",
          isActive
            ? "bg-gray-100 text-gray-900 dark:bg-[#1F1F23] dark:text-white"
            : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1F1F23]"
        )}
      >
        <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
        {children}
      </Link>
    )
  }

  return (
    <>
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
          "lg:translate-x-0 lg:static lg:w-64 border-r border-gray-200 dark:border-[#1F1F23]",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-full flex flex-col">
          <Link
            href="#"
            className="h-16 px-6 flex items-center border-b border-gray-200 dark:border-[#1F1F23]"
          >
            <div className="flex items-center gap-3">
              <Image
                src="/icons/pinklogo.png"
                alt="Petrosphere Logo"
                width={40}
                height={40}
                className="hidden dark:block"
              />
              <Image
                src="/icons/pinklogo.png"
                alt="Petrosphere Logo"
                width={40}
                height={40}
                className="block dark:hidden"
              />
              <div className="flex flex-col">
                <span className="text-normal font-semibold text-gray-900 dark:text-[#ff7261]">
                  Safety Vitals
                </span>
                <span className="text-[10px] font-normal text-gray-900 dark:text-white">
                  by Petrosphere Incorporated
                </span>
              </div>
            </div>
          </Link>

          <div className="flex-1 overflow-y-auto py-4 px-4 space-y-6">
            <div>
              <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Overview
              </div>
              <div className="space-y-1">
                <NavItem href="/dashboard" icon={Home}>Dashboard</NavItem>
                <NavItem href="/admin/create-survey" icon={PlusCircle}>Create Survey</NavItem>
                <NavItem href="/admin/survey-responses" icon={FileText}>Survey Responses</NavItem>
                <NavItem href="/admin/view-survey" icon={Folder}>View Survey</NavItem>
              </div>
            </div>

            <div>
              <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Management
              </div>
              <div className="space-y-1">
                <NavItem href="/admin/respondents" icon={Users2}>Respondents</NavItem>
              </div>
            </div>
          </div>

          <div className="px-4 py-4 border-t border-gray-200 dark:border-[#1F1F23] space-y-1">
            <NavItem href="/admin/settings" icon={Settings}>Settings</NavItem>
            <NavItem href="/admin/help" icon={HelpCircle}>Help</NavItem>
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
