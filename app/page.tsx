/**
 * File: app/page.tsx
 * Description: High-conversion professional landing page for Safety Vitals.
 * Featuring a hero section with background imagery, wavy transition, and feature highlight cards.
 * Functions:
 * - Home(): Main landing page component.
 * Connections:
 * - Provides entry points to /demo and /login.
 * - Redirects to /admin-login based on URL direct access.
 */

import Link from "next/link";
import { Button } from "../components/ui/button";
import { LayoutDashboard, ShieldCheck, ClipboardList, BarChart3, Users, Zap } from "lucide-react";
import Image from "next/image";
import { HeroRotatingText } from "../components/landing/HeroRotatingText";

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center text-white overflow-hidden py-20 lg:py-10">
        {/* Background Image with Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center z-0 scale-105"
          style={{ backgroundImage: "url('/images/landing-bg.png')" }}
        />
        <div className="absolute inset-0 bg-black/60 z-10" />

        {/* Content */}
        <div className="relative z-20 max-w-6xl mx-auto px-6 text-center mb-20 md:text-left flex flex-col md:flex-row items-center justify-between gap-12 pb-20 md:pb-0">
          <div className="flex-1 space-y-6 md:space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF7A40]/20 border border-[#FF7A40]/30 text-white text-sm font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Safety Culture Assessment Platform</span>
            </div>

            <HeroRotatingText />

            <p className="text-lg sm:text-xl text-gray-300 max-w-2xl leading-relaxed text-center md:text-left">
              Petrosphere Safety Vitals empowers organizations to assess, monitor, and improve
              the core health of their operational safety environment through real-time data insights.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <div className="relative group w-full sm:w-auto p-[2px] rounded-2xl overflow-hidden shadow-2xl shadow-[#FF7A40]/10">
                {/* Border Beam Animation Container */}
                <div className="absolute inset-0 z-0">
                  {/* Rotating Shiny Line (Border Beam) */}
                  <div className="absolute inset-[-100%] aspect-square bg-[conic-gradient(from_0deg,transparent_60%,#FF7A40,transparent_90%)] animate-[spin_4s_linear_infinite]" />
                </div>

                {/* Animated Background Blob (Behind the glassy button) */}
                <div className="absolute -inset-4 bg-gradient-to-r from-[#FF7A40]/30 to-orange-400/20 rounded-2xl blur-2xl opacity-0 group-hover:opacity-100 transition duration-1000 animate-pulse z-0" />

                <Link href="/demo" className="relative w-full sm:w-auto block z-10">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-black/40 backdrop-blur-xl border-0 hover:bg-black/50 text-white cursor-pointer px-8 h-14 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                  >
                    <span>Try Demo Now</span>
                    <Zap className="w-5 h-5 text-[#FF7A40]" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Subtle Visual Element (Floating Stats or Illustration) */}
          <div className="hidden lg:flex flex-1 justify-end animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="bg-white/10 backdrop-blur-xl border-0 border-white/20 p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#FF7A40]/20 rounded-full blur-3xl group-hover:bg-[#FF7A40]/30 transition-all duration-500" />
              <div className="space-y-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#FF7A40] rounded-2xl shadow-lg shadow-[#FF7A40]/30">
                    <Image
                      src="/icons/analytics.svg"
                      width={32}
                      height={32}
                      alt="Users"
                      className="w-8 h-8 text-white"
                    />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Real-time Data</h3>
                    <p className="text-sm text-gray-400">Instant safety climate pulse</p>
                  </div>
                </div>
                <div className="h-px bg-white/10 w-full" />
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30">
                    <Image
                      src="/icons/users-w.svg"
                      width={32}
                      height={32}
                      alt="Users"
                      className="w-8 h-8 text-white"
                    />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Multi-tenant</h3>
                    <p className="text-sm text-gray-400">Secure organization isolation</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wavy Divider */}
        {/* Smooth Curve Divider */}
        <div className="absolute bottom-[-1px] left-0 w-full overflow-hidden leading-none z-30">
          <svg
            className="block w-full h-[90px] md:h-[140px]"
            viewBox="0 0 1440 150"
            preserveAspectRatio="none"
          >
            <path
              d="M0,95 C240,35 480,35 720,95 C960,155 1200,155 1440,95 L1440,150 L0,150 Z"
              fill="white"
            />
          </svg>
        </div>


      </section>

      {/* Feature Highlight Section */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-extrabold text-[#231f20] mb-6">
              What is <span className="text-[#FF7A40]">Safety Vitals</span> for?
            </h2>
            <div className="w-24 h-1.5 bg-[#FF7A40] mx-auto rounded-full" />
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {/* Card 1 */}
            <div className="group p-8 bg-white border border-gray-100 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF7A40]/5 rounded-bl-[4rem] z-0 group-hover:bg-[#FF7A40]/10 transition-all" />
              <div className="relative z-10">
                <div className="w-16 h-16 bg-[#FF7A40] rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-[#FF7A40]/30 transition-transform group-hover:rotate-6">
                  <ClipboardList className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-[#231f20] mb-4">Survey Intelligence</h3>
                <p className="text-gray-600 leading-relaxed">
                  Easily create and deploy professional safety climate surveys. Customizable questions
                  and multi-language support ensure you capture the voice of every employee.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="group p-8 bg-[#FF7A40] rounded-[2rem] shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-[4rem] z-0" />
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-black/10 transition-transform group-hover:-rotate-6">
                  <Zap className="w-8 h-8 text-[#FF7A40]" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Proactive Safety</h3>
                <p className="text-white/90 leading-relaxed">
                  Identify high-risk areas and declining safety trends before they lead to incidents.
                  Safety Vitals gives you the early warning signals needed for proactive intervention.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="group p-8 bg-white border border-gray-100 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-[4rem] z-0 group-hover:bg-blue-500/10 transition-all" />
              <div className="relative z-10">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-blue-500/30 transition-transform group-hover:rotate-6">
                  <LayoutDashboard className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-[#231f20] mb-4">Data-Driven Culture</h3>
                <p className="text-gray-600 leading-relaxed">
                  Transform raw survey data into clear, actionable safety plans. Track progress
                  across sites and departments to build a truly resilient safety culture.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer / Copyright */}
      <footer className="py-12 bg-gray-50 border-t border-gray-100 mt-20">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex gap-2">       <Image
            src="/icons/pinklogo.png"
            width={50}
            height={50}
            alt="Safety Vitals Logo"
            className="w-15 h-15"
          />
            <div className="flex flex-col items-center md:items-start">
              <span className="text-xl font-bold text-[#231f20]">Safety Vitals</span>
              <span className="text-xs text-gray-400">by Petrosphere Incorporated</span>
            </div>
          </div>
          <div className="flex items-center gap-8 text-sm text-gray-500 font-medium">
            <Link href="/admin-login" className="hover:text-[#FF7A40] transition-colors">Admin Portal</Link>
            <span>© 2026 Petrosphere Incorporated</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
