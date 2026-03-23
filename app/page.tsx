"use client";

import { Header } from "@/components/header-1";
import { HeroSection, LogosSection } from "@/components/hero-1";
import Image from "next/image";
import Link from "next/link";
import { ClipboardList, LayoutDashboard, Zap, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ContactSalesDialog } from "@/components/contact-sales-dialog";

export default function Home() {
  const [isContactOpen, setIsContactOpen] = useState(false);
  return (
    <div className="min-h-screen font-sans">
      <Header />

      <main>
        <HeroSection />

        <div className="mx-auto max-w-5xl px-4 py-8">
          <LogosSection />
        </div>

        {/* Feature Highlight Section */}
        <section id="features" className="py-24 scroll-mt-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black text-foreground mb-4 tracking-tight">
                Powerful <span className="text-[#FF7A40]">Features</span>
              </h2>
              <p className="text-muted-foreground font-medium max-w-2xl mx-auto">
                Everything you need to monitor and improve your organization's safety climate in one professional platform.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Compact Card 1 */}
              <div className="group p-8 bg-card/50 backdrop-blur-sm border border-border/50 rounded-3xl shadow-sm hover:shadow-xl hover:border-[#FF7A40]/30 transition-all duration-500">
                <div className="w-12 h-12 bg-[#FF7A40]/10 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110">
                  <ClipboardList className="w-6 h-6 text-[#FF7A40]" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">Survey Intelligence</h3>
                <p className="text-muted-foreground text-sm leading-relaxed font-medium">
                  Deploy professional safety climate surveys with ease. Multi-language support and custom templates included.
                </p>
              </div>

              {/* Compact Card 2 */}
              <div className="group p-8 bg-card/50 backdrop-blur-sm border border-border/50 rounded-3xl shadow-sm hover:shadow-xl hover:border-[#FF7A40]/30 transition-all duration-500">
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">Proactive Safety</h3>
                <p className="text-muted-foreground text-sm leading-relaxed font-medium">
                  Identify high-risk areas before incidents occur. Real-time alerts keep your leadership informed and ready.
                </p>
              </div>

              {/* Compact Card 3 */}
              <div className="group p-8 bg-card/50 backdrop-blur-sm border border-border/50 rounded-3xl shadow-sm hover:shadow-xl hover:border-[#FF7A40]/30 transition-all duration-500">
                <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110">
                  <LayoutDashboard className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">Data AI Culture</h3>
                <p className="text-muted-foreground text-sm leading-relaxed font-medium">
                  Transform raw data into actionable insights. Build a truly resilient safety culture driven by evidence.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 bg-muted/30 scroll-mt-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black text-foreground mb-4 tracking-tight">
                Simple, <span className="text-[#FF7A40]">Transparent</span> Pricing
              </h2>
              <p className="text-muted-foreground font-medium max-w-2xl mx-auto">
                Choose the plan that fits your organization's scale and safety goals.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Basic */}
              <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm flex flex-col">
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-foreground mb-2">Basic</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-foreground">$0</span>
                    <span className="text-muted-foreground font-semibold text-sm">/month</span>
                  </div>
                </div>
                <ul className="space-y-4 mb-10 flex-1">
                  {['1 Organization', '100 Responses/month', 'Basic Analytics', 'Standard Support'].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-foreground/50" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/demo" className="w-full">
                  <Button variant="outline" className="w-full h-12 rounded-2xl border-border">Start Free</Button>
                </Link>
              </div>

              {/* Pro */}
              <div className="bg-[#231f20] p-8 rounded-[2.5rem] shadow-2xl shadow-zinc-900/20 flex flex-col relative overflow-hidden transform md:scale-105 z-10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[4rem] z-0" />
                <div className="relative z-10 mb-8">
                  <div className="bg-[#FF7A40] text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full w-fit mb-4">Most Popular</div>
                  <h3 className="text-lg font-bold text-white mb-2">Professional</h3>
                  <div className="flex items-baseline gap-1 text-white">
                    <span className="text-4xl font-black">$49</span>
                    <span className="text-zinc-500 font-semibold text-sm">/month</span>
                  </div>
                </div>
                <ul className="space-y-4 mb-10 flex-1 relative z-10">
                  {['Up to 10 Organizations', 'Unlimited Responses', 'Advanced AI Insights', 'Export (PDF/Excel)', 'Priority Support'].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm font-medium text-zinc-300">
                      <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-[#FF7A40]" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full h-12 rounded-2xl bg-[#FF7A40] hover:bg-[#ff7a40]/90 text-white font-bold border-0 shadow-lg shadow-[#FF7A40]/20"
                  onClick={() => setIsContactOpen(true)}
                >
                  Subscribe
                </Button>
              </div>

              {/* Enterprise */}
              <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm flex flex-col">
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-foreground mb-2">Enterprise</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-foreground">Custom</span>
                  </div>
                </div>
                <ul className="space-y-4 mb-10 flex-1">
                  {['Unlimited Organizations', 'Advanced Security', 'Dedicated Account Manager', '24/7 Premium Support', 'White-labeling'].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-foreground/50" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  className="w-full h-12 rounded-2xl border-border"
                  onClick={() => setIsContactOpen(true)}
                >
                  Contact Sales
                </Button>
              </div>
            </div>

            <ContactSalesDialog open={isContactOpen} onOpenChange={setIsContactOpen} />
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-24 scroll-mt-20 overflow-hidden relative">
          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF7A40]/10 border border-[#FF7A40]/20 text-[#FF7A40] text-xs font-black uppercase tracking-widest mb-8">
              Our Mission
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-foreground mb-8 tracking-tight">
              Beyond <span className="text-[#FF7A40]">Boundaries</span> for Safety
            </h2>
            <div className="space-y-6 text-muted-foreground font-medium text-lg leading-relaxed">
              <p>
                SafetyVitals is a comprehensive safety culture assessment platform developed by <span className="text-foreground font-bold underline decoration-[#FF7A40]/30">PetroCoreX</span>.
                We specialize in transforming qualitative safety sentiments into quantitative, actionable data.
              </p>
              <p>
                Our mission is to help organizations build resilient safety environments through
                real-time monitoring, AI-driven insights, and proactive interventions that save lives and improve performance.
              </p>
            </div>

            <div className="mt-12 flex justify-center gap-12 items-center opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              <Image src="/icons/pinklogo.png" width={60} height={60} alt="Branding" className="w-12 h-12" />
            </div>
          </div>
        </section>
      </main>

      {/* Footer / Copyright */}
      <footer className="py-12 border-t border-border bg-background/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex gap-4 items-center">
            <Image
              src="/icons/pinklogo.png"
              width={40}
              height={40}
              alt="Safety Vitals Logo"
              className="w-10 h-10"
            />
            <div className="flex flex-col items-start">
              <span className="text-lg font-black text-foreground tracking-tight leading-none mb-1">SafetyVitals</span>
              <span className="text-[10px] text-muted-foreground font-bold tracking-wider">by PetroCoreX</span>
            </div>
          </div>
          <div className="flex items-center gap-8 text-xs text-muted-foreground font-bold tracking-widest">
            {/* <Link href="/admin-login" className="hover:text-[#FF7A40] transition-colors">Admin Portal</Link> */}
            <span className="opacity-50">© 2026 PetroCoreX</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
