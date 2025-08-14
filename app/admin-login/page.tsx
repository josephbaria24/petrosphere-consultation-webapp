'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabaseClient'
import bcrypt from 'bcryptjs'
import { Label } from '../../@/components/ui/label'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import Cookies from 'js-cookie'
import { Eye, EyeOff } from 'lucide-react'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const handleLogin = async () => {
    setLoading(true)

    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('id, email, password_hash')
      .eq('email', email)
      .single()

    if (error || !admin) {
      toast.error('User not found in Safety Vitals system')
      setLoading(false)
      return
    }

    const match = await bcrypt.compare(password, admin.password_hash)
    if (!match) {
      toast.error('Invalid Safety Vitals credentials')
      setLoading(false)
      return
    }

    Cookies.set('admin_id', admin.id, { expires: 1 })
    toast.success('Welcome to Safety Vitals')
    router.push('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-green-50">
      <div className="flex w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl bg-white/70 backdrop-blur-lg">
        {/* Left side - form */}
        <div className="w-full md:w-1/2 p-10 flex flex-col justify-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Safety Vitals</h1>
          <p className="text-gray-600 mb-8">
            Sign in to access Petrosphere’s safety monitoring dashboard and keep our operations incident-free.
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

          <a href="#" className="text-sm text-green-600 mb-6">Forgot your password?</a>

          <Button
            onClick={handleLogin}
            className="w-full bg-black hover:bg-gray-900 text-white rounded-lg"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Access Dashboard'}
          </Button>

          <p className="mt-8 text-sm text-gray-500">
            For assistance, contact <br />
            <a href="mailto:safetyvitals@petrosphere.com" className="text-green-600">is@petrosphere.com.ph</a>
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
  )
}
