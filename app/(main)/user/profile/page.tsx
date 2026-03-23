'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { 
  User, 
  Mail, 
  Building2, 
  ShieldCheck, 
  Save, 
  Loader2,
  Camera,
  LogOut,
  ChevronRight,
  Rocket
} from 'lucide-react'
import { useApp } from '../../../../components/app/AppProvider'
import { Input } from '../../../../components/ui/input'
import { Button } from '../../../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Separator } from '../../../../components/ui/separator'
import { useRouter } from 'next/navigation'
import { Cookies } from '../../../../lib/cookies-client'
import { supabase } from '../../../../lib/supabaseClient'

export default function ProfilePage() {
  const { user, org, membership, subscription, refresh } = useApp()
  const [fullName, setFullName] = useState('')
  const [updating, setUpdating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '')
    }
  }, [user])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Basic validation
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/user/profile-picture', {
        method: 'POST',
        body: formData
      })
      if (res.ok) {
        toast.success('Profile picture updated')
        await refresh()
      } else {
        const data = await res.json()
        toast.error(`${data.error}: ${data.details || ''}`)
      }
    } catch (err) {
      toast.error('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName
        })
      })
      
      if (res.ok) {
        toast.success('Profile updated successfully')
        await refresh()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to update profile')
      }
    } catch (err) {
      toast.error('An unexpected error occurred')
    } finally {
      setUpdating(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      await fetch('/api/logout', { method: 'POST' })
      Cookies.remove('admin_id', { path: '/' })
      Cookies.remove('admin_token', { path: '/' })
      router.push('/')
      router.refresh()
    } catch (error) {
      router.push('/')
    }
  }

  if (!user) return null

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <input 
              type="file" 
              id="avatar-upload" 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
            />
            <div 
              className="w-24 h-24 rounded-3xl bg-gradient-to-br from-orange-400 to-pink-500 p-1 shadow-lg cursor-pointer"
              onClick={() => document.getElementById('avatar-upload')?.click()}
            >
              <div className="w-full h-full rounded-[20px] overflow-hidden bg-white dark:bg-zinc-900 flex items-center justify-center relative">
                {uploading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                ) : (
                  <>
                    <img 
                      src={user.avatar_url || `https://api.dicebear.com/9.x/glass/svg?seed=${user.full_name || user.email}`}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-4 border-white dark:border-zinc-950 rounded-full shadow-sm" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {user.full_name || 'Your Account'}
            </h1>
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Mail className="w-4 h-4" />
              <span className="text-sm font-medium">{user.email}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="bg-orange-50 text-orange-600 border border-orange-200 py-1 px-3 rounded-full text-[10px] font-bold uppercase tracking-wider">
            {subscription.plan} Plan
          </span>
          <span className="bg-slate-50 text-slate-600 border border-slate-200 py-1 px-3 rounded-full text-[10px] font-bold uppercase tracking-wider">
            {membership.role}
          </span>
        </div>
      </div>

      <Separator className="bg-slate-200/60 dark:bg-zinc-800/60" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200/60 dark:border-zinc-800/60 shadow-sm overflow-hidden rounded-2xl">
            <CardHeader className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-slate-200/60 dark:border-zinc-800/60">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-orange-500" />
                Personal Information
              </CardTitle>
              <CardDescription>Update your public information and how others see you.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Full Name</label>
                    <Input 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="rounded-xl border-slate-200 py-6 focus:ring-orange-500/20"
                    />
                  </div>
                  <div className="space-y-2 opacity-60 grayscale cursor-not-allowed">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Email Address (Managed by SSO)</label>
                    <Input 
                      value={user.email}
                      disabled
                      className="rounded-xl border-slate-200 py-6 bg-slate-50"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button 
                    type="submit" 
                    disabled={updating || fullName === user.full_name}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-8 py-6 font-bold shadow-lg shadow-slate-900/10 gap-2 transition-all active:scale-95"
                  >
                    {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-slate-200/60 dark:border-zinc-800/60 shadow-sm overflow-hidden rounded-2xl">
            <CardHeader className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-slate-200/60 dark:border-zinc-800/60">
              <CardTitle className="text-lg flex items-center gap-2 text-red-600">
                <LogOut className="w-5 h-5" />
                Account Security
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-slate-500 mb-6 font-medium">
                Want to switch accounts or sign out of your current session?
              </p>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 py-6 px-8 font-bold gap-2"
              >
                Sign Out from All Devices
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Info Cards */}
        <div className="space-y-6">
          <Card className="border-slate-200/60 dark:border-zinc-800/60 shadow-sm overflow-hidden rounded-2xl bg-slate-900 text-white">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Building2 className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white/60 tracking-wider">ORGANIZATION</h3>
                  <p className="font-bold text-lg">{org.name}</p>
                </div>
              </div>
              <Separator className="bg-white/10" />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white/60 tracking-wider">SECURITY LEVEL</h3>
                  <p className="font-bold text-lg uppercase">{membership.role}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-orange-800 flex items-center gap-2">
              <Rocket className="w-4 h-4" />
              UPGRADE YOUR EXPERIENCE
            </h3>
            <p className="text-sm text-orange-700 leading-relaxed font-medium">
              Join the professional tier to unlock AI safety insights, custom reporting, and priority support.
            </p>
            <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-md border-0 py-5 font-bold">
              View Plans
              <ChevronRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
