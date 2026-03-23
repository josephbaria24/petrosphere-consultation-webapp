'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Rocket, Building2, User, CheckCircle2, ArrowRight, Loader2, PartyPopper } from 'lucide-react'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { useBootstrap } from '../../lib/hooks/useBootstrap'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [orgName, setOrgName] = useState('')
  const [fullName, setFullName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { data: bootstrap, loading, refresh } = useBootstrap()
  const router = useRouter()

  useEffect(() => {
    if (!loading && bootstrap?.user.is_onboarded) {
      router.push('/dashboard')
    }
    if (!loading && bootstrap) {
      setFullName(bootstrap.user.full_name || '')
      setOrgName(bootstrap.org.name.replace("'s Organization", ""))
    }
  }, [bootstrap, loading, router])

  const handleComplete = async () => {
    if (!orgName.trim()) {
      toast.error('Organization name is required')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: orgName,
          fullName: fullName
        })
      })
      const data = await res.json()
      if (res.ok) {
        setStep(3)
        await refresh()
        setTimeout(() => {
          router.push('/dashboard')
        }, 3000)
      } else {
        toast.error(data.error || 'Failed to complete onboarding')
      }
    } catch (err) {
      toast.error('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/30 flex flex-col items-center justify-center p-4">
      {/* Progress Indicator */}
      {step < 3 && (
        <div className="max-w-md w-full mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Step {step} of 2</span>
            <span className="text-xs font-semibold text-orange-500">{step === 1 ? '50%' : '100%'} Complete</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-orange-500"
              initial={{ width: '0%' }}
              animate={{ width: step === 1 ? '50%' : '100%' }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      <div className="max-w-md w-full">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/70 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-white/50"
            >
              <div className="p-3 bg-orange-100 rounded-2xl w-fit mb-6">
                <Building2 className="w-6 h-6 text-orange-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome to Safety Vitals</h1>
              <p className="text-slate-500 mb-8">Let&apos;s start by setting up your organization profile. What is your company name?</p>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 ml-1">Organization Name</label>
                  <Input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="rounded-xl border-slate-200 py-6 text-lg"
                    autoFocus
                  />
                </div>
                <Button
                  onClick={() => setStep(2)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-6 font-semibold gap-2 mt-4"
                >
                  Next Step
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/70 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-white/50"
            >
              <div className="p-3 bg-orange-100 rounded-2xl w-fit mb-6">
                <User className="w-6 h-6 text-orange-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Complete your profile</h1>
              <p className="text-slate-500 mb-8">How should we address you in the dashboard?</p>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 ml-1">Your Full Name</label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="rounded-xl border-slate-200 py-6 text-lg"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 mt-4">
                  <Button
                    variant="ghost"
                    onClick={() => setStep(1)}
                    className="flex-1 rounded-xl py-6"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleComplete}
                    disabled={submitting}
                    className="flex-[2] bg-orange-600 hover:bg-orange-700 text-white rounded-xl py-6 font-semibold gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Complete Setup
                        <CheckCircle2 className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center p-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: 360 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-green-100/50"
              >
                <PartyPopper className="w-12 h-12 text-green-600" />
              </motion.div>
              <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">You&apos;re all set!</h1>
              <p className="text-xl text-slate-500 mb-12 max-w-sm mx-auto">
                Setting up your environment for <span className="text-orange-600 font-bold">{orgName}</span>...
              </p>
              <div className="flex items-center justify-center gap-2 text-slate-400 font-medium">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Redirecting to your dashboard...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Decorative background elements */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-100/30 rounded-full blur-[120px] -z-10" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-slate-200/30 rounded-full blur-[120px] -z-10" />
    </div>
  )
}
