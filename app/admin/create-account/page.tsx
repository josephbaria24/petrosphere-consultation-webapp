'use client'

import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { Input } from '../../../components/ui/input'
import { Button } from '../../../components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card'
import { Label } from '../../../components/ui/label'
import { toast } from 'sonner'
import bcrypt from 'bcryptjs'
import { Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function CreateAdminAccount() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const router = useRouter()

  const handleCreate = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      toast.error('All fields are required.')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    setLoading(true)

    // 🔍 Check if email already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', email)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows found in supabase
      toast.error('Something went wrong while checking email.')
      console.error(checkError)
      setLoading(false)
      return
    }

    if (existingUser) {
      toast.error('Email is already in use.')
      setLoading(false)
      return
    }

    const hash = await bcrypt.hash(password, 10)

    const { error } = await supabase.from('admin_users').insert({
      full_name: fullName,
      email,
      password_hash: hash,
    })

    if (error) {
      toast.error('Failed to create admin')
      console.error(error)
    } else {
      toast.success('Admin account created 🎉')
      setTimeout(() => {
        router.push('/admin-login') // change path if needed
      }, 1000)
    }

    setLoading(false)
  }

  return (
    <div className="max-w-sm mx-auto mt-20 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Create Admin Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>

          <div className="relative">
            <Label>Password</Label>
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="relative">
            <Label>Confirm Password</Label>
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <Button onClick={handleCreate} className="w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Create Admin'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
