'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabaseClient'
import bcrypt from 'bcryptjs'
import { Label } from '../../@/components/ui/label'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import Cookies from 'js-cookie'
import { Eye, EyeOff, X, Mail } from 'lucide-react'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const router = useRouter()

  // Clear any existing Supabase sessions when component mounts
  useEffect(() => {
    const clearSupabaseSession = async () => {
      await supabase.auth.signOut()
    }
    clearSupabaseSession()
  }, [])

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      toast.error('Please enter your email address.')
      return
    }

    setForgotLoading(true)
  
    const { data, error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${location.origin}/reset-password`,
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

  const setCookieServerSide = async (adminId) => {
    try {
      const response = await fetch('/api/set-admin-cookie', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminId }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to set cookie')
      }
    } catch (error) {
      console.error('Error setting cookie:', error)
      Cookies.set('admin_id', adminId, { 
        expires: 1,
        secure: true,
        sameSite: 'strict'
      })
    }
  }

  const handleLogin = async () => {
    setLoading(true)

    try {
      await supabase.auth.signOut()
      
      const { data: admin, error } = await supabase
        .from('admin_users')
        .select('id, email, password_hash')
        .eq('email', email)
        .single()

      if (error || !admin) {
        toast.error('User not found in Safety Vitals system')
        return
      }

      const match = await bcrypt.compare(password, admin.password_hash)
      if (!match) {
        toast.error('Invalid Safety Vitals credentials')
        return
      }

      Cookies.remove('admin_id')
      await setCookieServerSide(admin.id)
      
      Cookies.set('admin_id', admin.id, { 
        expires: 1,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      })
      
      toast.success('Welcome to Safety Vitals')
      
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 500)

    } catch (error) {
      console.error('Login error:', error)
      toast.error('An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-orange-50">
        <div className="flex w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl bg-white/70 backdrop-blur-lg">
          {/* Left side - form */}
          <div className="w-full md:w-1/2 p-10 flex flex-col justify-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Safety Vitals</h1>
            <p className="text-gray-600 mb-8">
              Sign in to access Petrosphere's safety monitoring dashboard and keep our operations incident-free.
            </p>

            <div className="mb-4">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your work email"
                className="bg-white text-gray-900 rounded-lg border border-gray-300"
              />
            </div>

            <div className="mb-2 relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="bg-white text-gray-900 rounded-lg border border-gray-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              onClick={() => setShowForgotModal(true)}
              className="text-sm text-orange-600 mb-6 text-left hover:text-orange-700 transition-colors"
              type="button"
            >
              Forgot your password?
            </button>

            <Button
              onClick={handleLogin}
              className="w-full bg-black hover:bg-gray-900 text-white rounded-lg"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Access Dashboard'}
            </Button>

            <p className="mt-8 text-sm text-gray-500">
              For assistance, contact <br />
              <a href="mailto:is@petrosphere.com.ph" className="text-orange-600 hover:text-orange-700">is@petrosphere.com.ph</a>
            </p>
          </div>

          {/* Right side - image with overlay text */}
          <div className="hidden md:flex w-1/2 relative">
            <img
              src="/loginpic.jpg"
              alt="Safety equipment"
              className="object-cover w-full h-full"
            />
            <div className="absolute inset-0 bg-black/10 flex items-center p-8">
              <div className="bg-white/40 p-6 rounded-xl max-w-sm">
                <div className="w-6 h-6 border-2 border-white rounded-full animate-spin mb-4"></div>
                <h2 className="text-lg font-semibold text-white">
                  Safety is our highest priority
                </h2>
                <p className="text-sm text-white mt-2">
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
              Enter your email address and we'll send you a link to reset your password.
            </p>
            
            <div className="mb-4">
              <Input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="Enter your work email"
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