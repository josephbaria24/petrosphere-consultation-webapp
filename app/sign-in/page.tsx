'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabaseClient'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { Eye, EyeOff, X, Mail, Loader2, UserPlus, LogIn, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SignInPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboard')
      }
    }
    checkSession()
  }, [router])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)

  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin
    }
    return process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_SITE_URL || 'https://safetyvitals.petros-global.com'
      : 'http://localhost:3000'
  }

  // --- Google SSO ---
  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${getBaseUrl()}/auth/callback`,
        },
      })
      if (error) {
        toast.error(error.message || 'Failed to initiate Google login')
        setGoogleLoading(false)
      }
    } catch (err) {
      toast.error('An unexpected error occurred')
      setGoogleLoading(false)
    }
  }

  // --- Email/Password Registration ---
  const handleRegister = async () => {
    if (!email || !password) {
      toast.error('Please fill in all required fields.')
      return
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName || undefined },
          emailRedirectTo: `${getBaseUrl()}/auth/callback`,
        },
      })
      if (error) {
        toast.error(error.message)
      } else if (data.user && !data.session) {
        toast.success('Account created! Please check your email for a confirmation link.')
      } else if (data.session) {
        toast.success('Account created! Redirecting...')
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 500)
      }
    } catch (err) {
      toast.error('An error occurred during registration')
    } finally {
      setLoading(false)
    }
  }

  // --- Email/Password Login ---
  const handleEmailLogin = async () => {
    if (!email || !password) {
      toast.error('Please enter your email and password.')
      return
    }
    setLoading(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (!authError && authData.session) {
        toast.success('Welcome back!')
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 500)
        return
      }

      toast.error(authError?.message || 'Invalid email or password')
    } catch (error) {
      console.error('Login error:', error)
      toast.error('An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      toast.error('Please enter your email address.')
      return
    }
    setForgotLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${getBaseUrl()}/reset-password`,
    })
    if (error) {
      toast.error(error.message || 'Failed to send password reset email')
    } else {
      toast.success('Password reset link sent! Check your email.')
      setShowForgotModal(false)
      setForgotEmail('')
    }
    setForgotLoading(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'register') {
      handleRegister()
    } else {
      handleEmailLogin()
    }
  }

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-orange-50/30">
        <div className="flex w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl bg-white/70 backdrop-blur-lg mx-4">
          {/* Left side - form */}
          <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col justify-center">
            {/* Back to home */}
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-6 w-fit"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </Link>

            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-gray-500 mb-6 text-sm">
              {mode === 'login'
                ? 'Sign in to access your safety monitoring dashboard.'
                : 'Get started with Safety Vitals for free.'}
            </p>

            {/* Google SSO Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full mb-4 py-5 rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700 font-medium text-sm gap-3 transition-all hover:shadow-sm"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              Continue with Google
            </Button>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white/70 px-3 text-gray-400 uppercase tracking-wider font-medium">
                  or continue with email
                </span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'register' && (
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full name"
                  className="bg-white text-gray-900 rounded-xl border-gray-200 py-5"
                />
              )}
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="bg-white text-gray-900 rounded-xl border-gray-200 py-5"
                required
              />
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Create a password (min 6 chars)' : 'Password'}
                  className="bg-white text-gray-900 rounded-xl border-gray-200 py-5 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {mode === 'login' && (
                <button
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-orange-600 hover:text-orange-700 transition-colors font-medium"
                  type="button"
                >
                  Forgot your password?
                </button>
              )}

              <Button
                type="submit"
                className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-xl py-5 font-semibold text-sm transition-all"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : mode === 'register' ? (
                  <UserPlus className="w-4 h-4 mr-2" />
                ) : (
                  <LogIn className="w-4 h-4 mr-2" />
                )}
                {loading
                  ? (mode === 'register' ? 'Creating account...' : 'Signing in...')
                  : (mode === 'register' ? 'Create Free Account' : 'Sign In')}
              </Button>
            </form>

            {/* Toggle Login / Register */}
            <p className="mt-6 text-center text-sm text-gray-500">
              {mode === 'login' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    onClick={() => { setMode('register'); setPassword(''); }}
                    className="text-orange-600 hover:text-orange-700 font-semibold transition-colors"
                    type="button"
                  >
                    Sign up free
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    onClick={() => { setMode('login'); setPassword(''); }}
                    className="text-orange-600 hover:text-orange-700 font-semibold transition-colors"
                    type="button"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>

            <p className="mt-6 text-xs text-gray-400 text-center">
              For assistance, contact{' '}
              <a href="mailto:is@petrosphere.com.ph" className="text-orange-600 hover:text-orange-700">
                is@petrosphere.com.ph
              </a>
            </p>
          </div>

          {/* Right side - image with overlay text */}
          <div className="hidden md:flex w-1/2 relative">
            <Image
              src="/loginpic.jpg"
              alt="Safety equipment"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10 flex items-end p-8">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Safety is our highest priority
                </h2>
                <p className="text-sm text-white/80 leading-relaxed">
                  Safety Vitals monitors incident reports, hazard alerts, and compliance checks in real time — ensuring every site remains safe and operational.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-gray-900">Reset Password</h3>
              </div>
              <button
                onClick={() => {
                  setShowForgotModal(false)
                  setForgotEmail('')
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-gray-600 mb-4 text-sm">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>

            <div className="mb-4">
              <Input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="Enter your email"
                className="bg-gray-50 text-gray-900 rounded-lg border border-gray-300"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowForgotModal(false)
                  setForgotEmail('')
                }}
                variant="outline"
                className="flex-1"
                disabled={forgotLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleForgotPassword}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                disabled={forgotLoading || !forgotEmail}
              >
                {forgotLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
