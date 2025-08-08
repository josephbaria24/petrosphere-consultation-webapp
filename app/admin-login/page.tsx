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
import Cookies from 'js-cookie'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async () => {
    setLoading(true)

    // ✅ Fetch admin by email
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('id, email, password_hash')
      .eq('email', email)
      .single()

    if (error || !admin) {
      toast.error('Admin not found')
      setLoading(false)
      return
    }

    // ✅ Compare passwords
    const match = await bcrypt.compare(password, admin.password_hash)
    if (!match) {
      toast.error('Invalid credentials')
      setLoading(false)
      return
    }

    // ✅ Store admin_id in cookie (1 day expiry)
    Cookies.set('admin_id', admin.id, { expires: 1 })

    toast.success('Logged in successfully')
    router.push('/dashboard')
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
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
          <Button
            onClick={handleLogin}
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
