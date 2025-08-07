'use client'

import { useState } from 'react'
import { supabase } from '../../../../lib/supabaseClient'
import { Input } from '../../../../components/ui/input'
import { Button } from '../../../../components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card'
import { Label } from '../../../../components/ui/label'
import { toast } from 'sonner'
import bcrypt from 'bcryptjs'

export default function CreateAdminAccount() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!email || !password) {
      toast.error('Email and password are required.')
      return
    }

    setLoading(true)
    const hash = await bcrypt.hash(password, 10)

    const { error } = await supabase.from('admin_users').insert({
      email,
      password_hash: hash,
    })

    if (error) {
      toast.error('Failed to create admin')
      console.error(error)
    } else {
      toast.success('Admin account created 🎉')
      setEmail('')
      setPassword('')
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
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button onClick={handleCreate} className="w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Create Admin'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
