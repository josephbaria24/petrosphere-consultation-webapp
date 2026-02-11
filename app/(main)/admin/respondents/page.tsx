'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'

import { Button } from '../../../../components/ui/button'
import { toast } from 'sonner'
import { Mail } from 'lucide-react'
import { Badge } from '../../../../@/components/ui/badge'
import { useApp } from '../../../../components/app/AppProvider'
import { Cookies } from '../../../../lib/cookies-client'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../../../components/ui/select'
import { Building } from 'lucide-react'

type Respondent = {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  department: string
  site: string
  created_at: string
  org_name?: string
}

export default function RespondentsPage() {
  const [respondents, setRespondents] = useState<Respondent[]>([])
  const [organizations, setOrganizations] = useState<{ id: string, name: string }[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const { org } = useApp()
  const isAdminCookie = !!Cookies.get("admin_id")
  const isPlatformAdmin = isAdminCookie;

  useEffect(() => {
    const fetchRespondents = async () => {
      setLoading(true)
      let responseUsers: any[] = []

      if (isPlatformAdmin) {
        const resp = await fetch(`/api/admin/all-respondents?orgId=${selectedOrgId}`)
        if (resp.ok) {
          responseUsers = await resp.json()
        } else {
          console.error("Error fetching all-respondents proxy")
        }
      } else {
        let query = supabase
          .from('responses')
          .select('user_id, org_id')

        if (org?.id) {
          query = query.eq('org_id', org.id)
        }

        const { data, error: responseError } = await query
        if (responseError) {
          toast.error('Failed to fetch user IDs from responses')
          console.error(responseError)
          setLoading(false)
          return
        }
        responseUsers = data || []
      }

      const userIds = Array.from(new Set(responseUsers.map((r) => r.user_id).filter(Boolean)))

      if (userIds.length === 0) {
        setRespondents([])
        setLoading(false)
        return
      }

      let users: Respondent[] = []
      if (isPlatformAdmin) {
        const resp = await fetch('/api/admin/all-users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds })
        })
        if (resp.ok) {
          users = await resp.json()
        } else {
          console.error("Error fetching all-users proxy")
        }
      } else {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .in('id', userIds)
        if (error) {
          toast.error('Failed to fetch respondents')
          console.error(error)
          setLoading(false)
          return
        }
        users = (data as Respondent[]) || []
      }

      setRespondents(users.map(u => ({
        ...u,
        org_name: organizations.find(o => o.id === (responseUsers.find(ru => ru.user_id === u.id)?.org_id))?.name || 'Unknown Org'
      })))
      setLoading(false)
    }

    fetchRespondents()
  }, [selectedOrgId, isPlatformAdmin, org?.id, organizations])

  useEffect(() => {
    if (isPlatformAdmin) {
      const fetchOrgs = async () => {
        const resp = await fetch('/api/admin/all-organizations')
        if (resp.ok) {
          const data = await resp.json()
          setOrganizations(data)
        } else {
          console.error("Error fetching all-organizations proxy")
        }
      }
      fetchOrgs()
    }
  }, [isPlatformAdmin])

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Survey Respondents</h1>
        {isPlatformAdmin && organizations.length > 0 && (
          <div className="w-full md:w-[250px]">
            <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="All Organizations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
                {organizations.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : respondents.length === 0 ? (
        <p>No users have submitted any responses yet.</p>
      ) : (
        <div className="space-y-4">
          {respondents.map((user) => (
            <Card key={user.id} className="border rounded-lg shadow">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-semibold">
                    {user.first_name} {user.last_name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    {isPlatformAdmin && (
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5 flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {user.org_name}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`mailto:${user.email}`, '_blank')}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Button>
              </CardHeader>
              <CardContent className="flex gap-2 flex-wrap text-sm text-muted-foreground">
                <Badge variant="outline">Role: {user.role || 'N/A'}</Badge>
                <Badge variant="outline">Dept: {user.department || 'N/A'}</Badge>
                <Badge variant="outline">Site: {user.site || 'N/A'}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
