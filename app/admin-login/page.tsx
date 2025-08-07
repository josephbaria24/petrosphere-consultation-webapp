'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'

import { toast } from 'sonner'
import { supabase } from '../../lib/supabaseClient'
import bcrypt from 'bcryptjs'
import { Label } from '../../@/components/ui/label'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('admin_users')
      .select('id, email, password_hash')
      .eq('email', email)
      .single()

    if (error || !data) {
      toast.error('Admin not found')
      setLoading(false)
      return
    }

    const match = await bcrypt.compare(password, data.password_hash)

    if (!match) {
      toast.error('Invalid credentials')
      setLoading(false)
      return
    }

    // Set auth state in localStorage (or cookie)
    localStorage.setItem('admin_token', data.id)
    toast.success('Logged in successfully')
    router.push('/dashboard') // or any route
  }

  return (
    <div className="max-w-sm mx-auto mt-20 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button onClick={handleLogin} className="w-full" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
