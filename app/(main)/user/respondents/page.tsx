'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'

import { Button } from '../../../../components/ui/button'
import { toast } from 'sonner'
import { Mail } from 'lucide-react'
import { Badge } from '../../../../@/components/ui/badge'
import { GatedFeature } from '../../../../components/gated-feature'
import { useApp } from '../../../../components/app/AppProvider'
import { Cookies } from '../../../../lib/cookies-client'

type Respondent = {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  department: string
  site: string
  created_at: string
}

export default function RespondentsPage() {
  const [respondents, setRespondents] = useState<Respondent[]>([])
  const [loading, setLoading] = useState(true)
  const { org, subscription } = useApp()
  const isAdmin = !!Cookies.get("admin_id")
  const isRestricted = subscription?.plan === "demo" && !isAdmin




  useEffect(() => {
    const fetchRespondents = async () => {
      let query = supabase
        .from('responses')
        .select('user_id')

      if (org?.id) {
        query = query.eq('org_id', org.id)
      }

      const { data: responseUsers, error: responseError } = await query

      if (responseError) {
        toast.error('Failed to fetch user IDs from responses')
        console.error(responseError)
        setLoading(false)
        return
      }

      const userIds = Array.from(new Set(responseUsers?.map((r) => r.user_id) || []))

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

      setRespondents(data || [])
      setLoading(false)
    }

    fetchRespondents()
  }, [org?.id])

  return (
    <GatedFeature
      isRestricted={isRestricted}
      featureName="Respondent List"
    >
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">Survey Respondents</h1>

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
                    <p className="text-sm text-muted-foreground">{user.email}</p>
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
    </GatedFeature>
  )
}
