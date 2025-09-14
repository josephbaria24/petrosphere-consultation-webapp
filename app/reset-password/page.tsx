'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { toast } from 'sonner'
import bcrypt from 'bcryptjs'
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.email) {
        setUserEmail(session.user.email)
      } else {
        toast.error('Invalid reset link. Please request a new password reset.')
        router.push('/admin-login')
      }
    }
    getSession()
  }, [router])

  const handleReset = async () => {
    // Validation
    if (!newPassword) {
      toast.error('Please enter a new password.')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.')
      return
    }

    if (!confirmPassword) {
      toast.error('Please confirm your password.')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      // Update password in Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (authError) {
        toast.error(authError.message)
        return
      }

      // Hash the new password and update it in your custom admin_users table
      const saltRounds = 10
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds)

      const { error: updateError } = await supabase
        .from('admin_users')
        .update({ password_hash: hashedPassword })
        .eq('email', userEmail)

      if (updateError) {
        console.error('Error updating admin_users table:', updateError)
      }

      // Sign out from Supabase Auth to clear the session
      await supabase.auth.signOut()

      toast.success('Password updated successfully! Redirecting to login...')
      
      // Redirect to login page instead of dashboard
      setTimeout(() => {
        router.push('/admin-login')
      }, 2000)

    } catch (error) {
      console.error('Password reset error:', error)
      toast.error('An error occurred while resetting your password.')
    } finally {
      setLoading(false)
    }
  }

  const getPasswordStrength = (password) => {
    if (password.length === 0) return { strength: 0, text: '', color: '' }
    if (password.length < 6) return { strength: 1, text: 'Too short', color: 'text-red-500' }
    if (password.length < 8) return { strength: 2, text: 'Weak', color: 'text-orange-500' }
    if (password.length < 12) return { strength: 3, text: 'Good', color: 'text-blue-500' }
    return { strength: 4, text: 'Strong', color: 'text-green-500' }
  }

  const passwordStrength = getPasswordStrength(newPassword)
  const passwordsMatch = confirmPassword && newPassword === confirmPassword

  return (
    <div className="flex min-h-screen items-center justify-center bg-orange-50 p-6">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-xl shadow-xl">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-orange-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Reset Your Password</h2>
          {userEmail && (
            <p className="text-sm text-gray-600">Resetting password for: <span className="font-medium">{userEmail}</span></p>
          )}
        </div>
        
        {/* New Password Field */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">New Password</label>
          <div className="relative">
            <Input
              type={showNewPassword ? 'text' : 'password'}
              placeholder="Enter your new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          
          {/* Password Strength Indicator */}
          {newPassword && (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    passwordStrength.strength === 1 ? 'bg-red-500 w-1/4' :
                    passwordStrength.strength === 2 ? 'bg-orange-500 w-2/4' :
                    passwordStrength.strength === 3 ? 'bg-blue-500 w-3/4' :
                    passwordStrength.strength === 4 ? 'bg-green-500 w-full' : 'w-0'
                  }`}
                ></div>
              </div>
              <span className={`text-xs font-medium ${passwordStrength.color}`}>
                {passwordStrength.text}
              </span>
            </div>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Confirm Password</label>
          <div className="relative">
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`pr-10 ${
                confirmPassword ? 
                (passwordsMatch ? 'border-green-500 focus:border-green-500' : 'border-red-500 focus:border-red-500') 
                : ''
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          
          {/* Password Match Indicator */}
          {confirmPassword && (
            <div className={`flex items-center gap-2 text-xs ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
              {passwordsMatch ? (
                <>
                  <CheckCircle size={14} />
                  <span>Passwords match</span>
                </>
              ) : (
                <>
                  <X size={14} />
                  <span>Passwords do not match</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Reset Button */}
        <Button 
          onClick={handleReset} 
          className="w-full bg-black hover:bg-gray-900 text-white py-3"
          disabled={loading || !userEmail || !newPassword || !confirmPassword || !passwordsMatch}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Updating Password...
            </div>
          ) : (
            'Reset Password'
          )}
        </Button>
        
        {/* Info Text */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs text-blue-700 text-center">
            <Lock className="w-4 h-4 inline mr-1" />
            After resetting your password, you'll be redirected to the login page to sign in with your new credentials.
          </p>
        </div>
      </div>
    </div>
  )
}

// Import X icon for the password match indicator
import { X } from 'lucide-react'