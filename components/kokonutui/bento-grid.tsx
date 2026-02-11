"use client"

import React from "react"
import { motion } from "framer-motion"
import {
  Bot,
  Brain,
  Cpu,
  Zap,
  Activity,
  Search,
  MessageSquare,
  Sparkles,
  SearchCode,
  ShieldCheck,
  Globe,
  Database,
  Target,
  Type,
  ImageIcon,
  Layout,
  Code2
} from "lucide-react"
import { cn } from "@/lib/utils"

interface BentoItemProps {
  title: string
  description: string
  icon: React.ReactNode
  className?: string
  delay?: number
}

const BentoItem = ({ title, description, icon, className, delay = 0 }: BentoItemProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className={cn(
      "group relative overflow-hidden rounded-3xl border border-border/50 bg-card p-6 hover:border-primary/50 transition-all duration-300",
      className
    )}
  >
    <div className="relative z-10">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-bold tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
    <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/5 blur-3xl transition-all duration-500 group-hover:bg-primary/10" />
    <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-primary/5 blur-3xl transition-all duration-500 group-hover:bg-primary/10" />
  </motion.div>
)

export function HeroBentoGrid() {
  const items = [
    {
      title: "Executive Insights",
      description: "Harness our advanced AI to decode complex safety sentiments across your entire organization automatically.",
      icon: <Sparkles className="h-6 w-6" />,
      className: "md:col-span-2 md:row-span-2",
      delay: 0.1,
    },
    {
      title: "Real-time Metrics",
      description: "Live tracking of safety vitals and cultural shifts with precision analytics.",
      icon: <Activity className="h-6 w-6" />,
      className: "md:col-span-2",
      delay: 0.2,
    },
    {
      title: "Predictive Guard",
      description: "Safety-first AI models optimized for identifying leading indicators before they become lagging events.",
      icon: <ShieldCheck className="h-6 w-6" />,
      className: "md:col-span-1",
      delay: 0.3,
    },
    {
      title: "Global Benchmark",
      description: "Scale your safety consultations globally with automated multi-lingual support and cultural normalization.",
      icon: <Globe className="h-6 w-6" />,
      className: "md:col-span-1",
      delay: 0.4,
    },
    {
      title: "Data Integrity",
      description: "Enterprise-grade security and data isolation for sensitive safety consultation data.",
      icon: <Database className="h-6 w-6" />,
      className: "md:col-span-2",
      delay: 0.5,
    },
  ]

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container relative z-10">
        <div className="mb-16 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-black tracking-tight sm:text-5xl mb-4 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70"
          >
            Engineered for <span className="text-primary italic">Precision</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mx-auto max-w-2xl text-lg text-muted-foreground leading-extended"
          >
            Petrosphere combines industry-leading expertise with cutting-edge artificial intelligence to revolutionize how you perceive organizational safety.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[200px]">
          {items.map((item, idx) => (
            <BentoItem key={idx} {...item} />
          ))}
        </div>
      </div>

      {/* Background Orbs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] -z-10 animate-pulse transition-all duration-1000" />
    </section>
  )
}

export function FeaturesBentoGrid() {
  const items = [
    {
      title: "AI Analysis",
      description: "State-of-the-art Natural Language Processing for safety sentiment decoding.",
      icon: <Brain className="h-6 w-6" />,
    },
    {
      title: "Smart Search",
      description: "Contextual search across thousands of safety responses and action plans.",
      icon: <SearchCode className="h-6 w-6" />,
    },
    {
      title: "Auto-Reporting",
      description: "One-click professional PDF report generation with stakeholder-ready charts.",
      icon: <Layout className="h-6 w-6" />,
    },
    {
      title: "Collaborative Actions",
      description: "Real-time synchronization of action plans across multi-disciplinary teams.",
      icon: <MessageSquare className="h-6 w-6" />,
    },
    {
      title: "High Precision",
      description: "Statistical normalization ensures reliable cultural benchmarking.",
      icon: <Target className="h-6 w-6" />,
    },
    {
      title: "Custom Dashboards",
      description: "Tailored visualization grids for every organizational level.",
      icon: <ImageIcon className="h-6 w-6" />,
    },
    {
      title: "API Integration",
      description: "Seamlessly connect your existing safety systems with our robust API.",
      icon: <Code2 className="h-6 w-6" />,
    },
    {
      title: "Fast Iteration",
      description: "Deploy and analyze safety surveys in minutes, not months.",
      icon: <Zap className="h-6 w-6" />,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: idx * 0.05 }}
          className="group p-6 rounded-3xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-300"
        >
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
            {item.icon}
          </div>
          <h4 className="font-bold mb-1">{item.title}</h4>
          <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
        </motion.div>
      ))}
    </div>
  )
}
