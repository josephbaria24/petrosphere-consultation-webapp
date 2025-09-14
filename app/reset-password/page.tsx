'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const accessToken = searchParams.get('access_token')

  const handleReset = async () => {
    if (!newPassword) {
      toast.error('Please enter a new password.')
      return
    }

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password updated successfully')
      router.push('/admin-login') // or your preferred route
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-orange-50 p-6">
      <div className="max-w-md w-full space-y-6 bg-white p-6 rounded-xl shadow-xl">
        <h2 className="text-xl font-bold text-gray-800">Reset Your Password</h2>
        <Input
          type="password"
          placeholder="Enter your new password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Button onClick={handleReset} className="w-full bg-black text-white">
          Reset Password
        </Button>
      </div>
    </div>
  )
}
