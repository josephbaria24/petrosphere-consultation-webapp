/**
 * File: app/(main)/admin/survey-responses/page.tsx
 * Description: Survey responses analytics page for Platform Admins.
 * Provides global visibility into all survey results across all organizations on the platform.
 * Functions:
 * - SurveyResponsesPage(): Administrative component for cross-tenant survey data analysis.
 * Connections:
 * - Accessible to Platform Admins via the Sidebar (/admin/survey-responses).
 * - Uses administrative proxy routes (/api/admin/*) to bypass RLS and aggregate data.
 * - Displays organization names to provide context for global responses.
 */
'use client'

import { useEffect, useState, useMemo, useRef, useCallback, startTransition } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { supabase } from '../../../../lib/supabaseClient'
import { toast } from 'sonner'
import { useApp } from '../../../../components/app/AppProvider'
import { Cookies } from "../../../../lib/cookies-client";
import { Alert, AlertDescription, AlertTitle } from '../../../../@/components/ui/alert'
import { Button } from '../../../../components/ui/button'
import { Card, CardContent } from '../../../../components/ui/card'
import { FileText, HelpCircle, Copy, ExternalLink, Link as LinkIcon, Search, User as UserIcon } from "@/components/icons"
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '../../../../@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog'
import { Label } from '../../../../components/ui/label'
import { Input } from '../../../../components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../../../components/ui/select'
import { ExportDialog } from '../../../../components/export-dialog'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { sanitizeDomForPdf } from '../../../../lib/export-utils'
import { buildPublicSurveyUrl } from '../../../../lib/public-survey-url'
import {
  RespondentRow,
  groupAnswersByDimension,
  type ResponseGroup,
} from '../../../../components/survey-responses/respondent-row'

type Survey = {
  id: string
  title: string
  created_at: string
  org_id?: string | null
  organizations?: {
    name: string
  } | null
}

type User = {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  department: string
  site: string
}

const DELETE_CONFIRMATION = "Delete this user responses"
export default function SurveyResponsesPage() {
  const appData = useApp() // Use appData to access all context values
  const { user, org, membership, subscription } = appData
  const [isAdminCookie, setIsAdminCookie] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);

  useEffect(() => {
    const adminId = Cookies.get("admin_id");
    setIsAdminCookie(!!adminId);
    setAdminChecked(true);
  }, []);

  // Determine if restricted (not a full admin)
  const isPlatformAdmin = isAdminCookie;
  const sub = appData?.subscription;
  const mem = appData?.membership;
  const isRestrictedToAuthored = !isPlatformAdmin && (sub?.plan === 'demo' || (mem?.role !== 'admin' && (mem?.role as string) !== 'super-admin'));

  const [surveys, setSurveys] = useState<Survey[]>([])
  const [organizations, setOrganizations] = useState<{ id: string, name: string }[]>([])
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('')
  const [selectedOrgId, setSelectedOrgId] = useState<string>('all')
  const [responseGroups, setResponseGroups] = useState<ResponseGroup[]>([])
  const [loadingSurveys, setLoadingSurveys] = useState(true)
  const [loadingResponses, setLoadingResponses] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ResponseGroup | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [editTarget, setEditTarget] = useState<ResponseGroup | null>(null)
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role: "",
    department: "",
    site: "",
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [openRespondentId, setOpenRespondentId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const responsesContentRef = useRef<HTMLDivElement>(null)
  const listParentRef = useRef<HTMLDivElement>(null)

  const handleExportResults = async () => {
    if (!responsesContentRef.current) return;

    setIsExportingPdf(true);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    try {
      const canvas = await html2canvas(responsesContentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          sanitizeDomForPdf(clonedDoc)
        }
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      const pageHeight = pdf.internal.pageSize.getHeight();
      const totalPdfHeight = (imgHeight * pdfWidth) / imgWidth;

      if (totalPdfHeight < pageHeight) {
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, totalPdfHeight);
      } else {
        let heightLeft = totalPdfHeight;
        let position = 0;

        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, totalPdfHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - totalPdfHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, pdfWidth, totalPdfHeight);
          heightLeft -= pageHeight;
        }
      }

      pdf.save(`Survey-Results-${selectedSurveyTitle}.pdf`);
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("Failed to generate PDF");
      throw error;
    } finally {
      setIsExportingPdf(false);
    }
  };

  useEffect(() => {
    const fetchSurveys = async () => {
      // Don't fetch until we've checked admin status
      if (!adminChecked) return;

      // For non-admins, wait for org.id
      if (!isPlatformAdmin && !org?.id) return;

      setLoadingSurveys(true) // Set loading true when starting fetch

      try {
        let data: any[] | null = null;
        let error: any = null;

        if (isPlatformAdmin) {
          const resp = await fetch('/api/admin/all-surveys')
          if (resp.ok) {
            data = await resp.json()
          } else {
            error = { message: 'Failed to fetch all-surveys proxy' }
          }
        } else {
          let query = supabase
            .from('surveys')
            .select('id, title, created_at, org_id, organizations(name)')
            .order('created_at', { ascending: false })

          const DEFAULT_SURVEY_ID = '67813802-0821-4013-8b96-ddc5ba288c60';
          if (org?.id) {
            if (isRestrictedToAuthored) {
              query = query.or(`and(org_id.eq.${org.id},created_by.eq.${user?.id || ''}),id.eq.${DEFAULT_SURVEY_ID}`)
            } else {
              query = query.or(`org_id.eq.${org.id},id.eq.${DEFAULT_SURVEY_ID}`)
            }
          }
          const { data: sData, error: sError } = await query
          data = sData
          error = sError
        }

        if (error) throw error

        if (data) {
          const DEFAULT_SURVEY_ID = '67813802-0821-4013-8b96-ddc5ba288c60';
          // Normalize organizations to handling both array and object from different fetch paths
          const normalized = data.map((s: any) => ({
            ...s,
            organizations: Array.isArray(s.organizations) ? s.organizations[0] : s.organizations
          })) as Survey[];

          const sorted = [...normalized].sort((a, b) => {
            if (a.id === DEFAULT_SURVEY_ID) return -1;
            if (b.id === DEFAULT_SURVEY_ID) return 1;
            return 0;
          });

          setSurveys(sorted as Survey[])
          if (sorted.length > 0) {
            setSelectedSurveyId(sorted[0].id)
          }
        }
      } catch (error) {
        console.error('Error fetching surveys:', error)
        toast.error('Failed to load surveys')
      } finally {
        setLoadingSurveys(false)
      }
    }
    fetchSurveys()

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
  }, [org?.id, adminChecked, isPlatformAdmin, isRestrictedToAuthored, user?.id])

  // 2. Fetch Responses when Survey Changes
  useEffect(() => {
    if (!selectedSurveyId) {
      setResponseGroups([])
      return
    }

    const fetchData = async () => {
      setLoadingResponses(true)
      try {
        // A. Get Questions for this survey to filter responses
        const { data: questions, error: questionsError } = await supabase
          .from('survey_questions')
          .select('id, question_text, dimension, question_type')
          .eq('survey_id', selectedSurveyId)

        if (questionsError) throw questionsError
        if (!questions || questions.length === 0) {
          setResponseGroups([])
          return
        }

        const questionIds = questions.map(q => q.id)
        const questionMap = new Map(questions.map(q => [q.id, q]))

        // B. Get Responses for these questions
        let responses: any[] = [];
        if (isPlatformAdmin) {
          const resp = await fetch('/api/admin/all-responses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questionIds, orgId: selectedOrgId })
          })
          if (resp.ok) {
            responses = await resp.json()
          } else {
            console.error("Error fetching all-responses proxy")
          }
        } else {
          let responseQuery = supabase
            .from('responses')
            .select('*')
            .in('question_id', questionIds)
            .order('created_at', { ascending: false })

          if (org?.id) {
            responseQuery = responseQuery.eq('org_id', org.id)
          }

          const { data: rData, error: rError } = await responseQuery
          if (rError) throw rError
          responses = rData || []
        }

        if (!responses || responses.length === 0) {
          setResponseGroups([])
          return
        }

        // C. Get Users for these responses
        const userIds = Array.from(new Set(responses.map(r => r.user_id).filter(Boolean)))

        let usersMap = new Map<string, User>()
        if (userIds.length > 0) {
          let users: User[] = [];
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
            const { data: uData, error: usersError } = await supabase
              .from('users')
              .select('id, first_name, last_name, email, role, department, site')
              .in('id', userIds)
            if (usersError) {
              console.error("Error fetching users", usersError)
            } else {
              users = (uData as User[]) || []
            }
          }
          users.forEach(u => usersMap.set(u.id, u))
        }

        // D. Group Responses by User (Session)
        // Note: Assuming one submission per user per survey for simplicity, 
        // or we group by user_id. If a user can submit multiple times, we might need a session_id or grouping by time window.
        // Here we group by user_id as a simpler 'Respondent' view.

        const groupedMap = new Map<string, ResponseGroup>()

        responses.forEach(r => {
          const userId = r.user_id || 'anonymous'
          if (!groupedMap.has(userId)) {
            const user = usersMap.get(r.user_id) || null
            groupedMap.set(userId, {
              user_id: userId,
              user,
              metadata: {
                department: user?.department || r.department || 'Unknown', // Fallback if reaction has metadata
                site: user?.site || r.site || 'Unknown',
                role: user?.role || r.role || 'Unknown',
                created_at: r.created_at,
                org_name: organizations.find(o => o.id === r.org_id)?.name || 'Unknown Org',
                org_id: r.org_id || null,
              },
              answers: [],
              answersByDimension: [],
            })
          }

          const group = groupedMap.get(userId)!
          // Prefer older submission time if multiple, or newest? Usually newest is 'latest' submission.
          // But we sorted desc, so first one is latest. 
          // Actually metadata is per-response row repeated typically? 
          // We just take the first row's time.

          const qInfo = questionMap.get(r.question_id)
          group.answers.push({
            question: qInfo?.question_text || r.question || 'Unknown Question',
            answer: r.answer,
            dimension: qInfo?.dimension || r.dimension || 'Uncategorized',
            question_type: qInfo?.question_type
          })
        })

        setResponseGroups(
          Array.from(groupedMap.values()).map((group) => ({
            ...group,
            answersByDimension: groupAnswersByDimension(group.answers),
          }))
        )
        setOpenRespondentId(null)

      } catch (error) {
        console.error('Error fetching responses:', error)
        toast.error('Failed to load responses for this survey')
      } finally {
        setLoadingResponses(false)
      }
    }

    fetchData()
  }, [selectedSurveyId, org?.id, isPlatformAdmin, isRestrictedToAuthored, selectedOrgId, organizations])


  const selectedSurveyTitle = useMemo(() =>
    surveys.find(s => s.id === selectedSurveyId)?.title || 'Survey',
    [selectedSurveyId, surveys])

  const selectedSurvey = useMemo(
    () => surveys.find((s) => s.id === selectedSurveyId) || null,
    [selectedSurveyId, surveys]
  )

  const selectedSurveyUrl = useMemo(() => {
    if (!selectedSurveyId) return ''
    const orgIdForLink =
      selectedOrgId !== 'all'
        ? selectedOrgId
        : selectedSurvey?.org_id || null
    return buildPublicSurveyUrl({
      surveyId: selectedSurveyId,
      orgId: orgIdForLink,
    })
  }, [selectedSurveyId, selectedSurvey, selectedOrgId])

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return responseGroups
    return responseGroups.filter((g) => {
      const name = g.user
        ? `${g.user.first_name} ${g.user.last_name}`.toLowerCase()
        : ""
      const email = (g.user?.email || "").toLowerCase()
      const role = (g.metadata.role || "").toLowerCase()
      const department = (g.metadata.department || "").toLowerCase()
      const site = (g.metadata.site || "").toLowerCase()
      const orgName = (g.metadata.org_name || "").toLowerCase()
      return (
        name.includes(q) ||
        email.includes(q) ||
        role.includes(q) ||
        department.includes(q) ||
        site.includes(q) ||
        orgName.includes(q)
      )
    })
  }, [responseGroups, searchQuery])

  const rowVirtualizer = useVirtualizer({
    count: isExportingPdf ? 0 : filteredGroups.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 104,
    overscan: 6,
    measureElement:
      typeof window !== "undefined" &&
      navigator.userAgent.indexOf("Firefox") === -1
        ? (el) => el.getBoundingClientRect().height
        : undefined,
  })

  const toggleRespondent = useCallback((id: string) => {
    startTransition(() => {
      setOpenRespondentId((prev) => (prev === id ? null : id))
    })
  }, [])

  useEffect(() => {
    rowVirtualizer.measure()
  }, [openRespondentId, filteredGroups.length, rowVirtualizer])

  const onSurveyChange = (id: string) => {
    setLoadingResponses(true)
    setOpenRespondentId(null)
    setSearchQuery("")
    startTransition(() => setSelectedSurveyId(id))
  }

  const onOrgChange = (id: string) => {
    setLoadingResponses(true)
    setOpenRespondentId(null)
    startTransition(() => setSelectedOrgId(id))
  }

  const copySurveyLink = async () => {
    if (!selectedSurveyUrl) return
    try {
      await navigator.clipboard.writeText(selectedSurveyUrl)
      toast.success('Survey link copied')
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const closeDeleteDialog = () => {
    if (deleting) return
    setDeleteTarget(null)
    setDeleteConfirmText("")
  }

  const openEditDialog = (group: ResponseGroup) => {
    if (!group.user_id || group.user_id === "anonymous") {
      toast.error("This respondent cannot be edited.")
      return
    }
    setEditForm({
      first_name: group.user?.first_name || "",
      last_name: group.user?.last_name || "",
      email: group.user?.email || "",
      role:
        group.metadata.role !== "Unknown"
          ? group.metadata.role
          : group.user?.role || "",
      department:
        group.metadata.department !== "Unknown"
          ? group.metadata.department
          : group.user?.department || "",
      site:
        group.metadata.site !== "Unknown"
          ? group.metadata.site
          : group.user?.site || "",
    })
    setEditTarget(group)
  }

  const closeEditDialog = () => {
    if (savingEdit) return
    setEditTarget(null)
  }

  const handleSaveRespondent = async () => {
    if (!editTarget || !selectedSurveyId) return
    if (!editTarget.user_id || editTarget.user_id === "anonymous") {
      toast.error("This respondent cannot be edited.")
      return
    }

    const payload = {
      first_name: editForm.first_name.trim(),
      last_name: editForm.last_name.trim(),
      email: editForm.email.trim(),
      role: editForm.role.trim(),
      department: editForm.department.trim(),
      site: editForm.site.trim(),
    }

    if (
      !payload.first_name ||
      !payload.last_name ||
      !payload.role ||
      !payload.department ||
      !payload.site
    ) {
      toast.error("Please fill in name, role, department, and site.")
      return
    }

    setSavingEdit(true)
    try {
      const orgIdForUpdate =
        selectedOrgId !== "all"
          ? selectedOrgId
          : editTarget.metadata.org_id || undefined

      if (isPlatformAdmin) {
        const resp = await fetch("/api/admin/update-respondent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: editTarget.user_id,
            surveyId: selectedSurveyId,
            orgId: orgIdForUpdate,
            ...payload,
          }),
        })
        const result = await resp.json().catch(() => ({}))
        if (!resp.ok) {
          throw new Error(result.error || "Failed to update respondent")
        }
      } else {
        const { error: userError } = await supabase
          .from("users")
          .update({
            first_name: payload.first_name,
            last_name: payload.last_name,
            ...(payload.email ? { email: payload.email } : {}),
            role: payload.role,
            department: payload.department,
            site: payload.site,
          })
          .eq("id", editTarget.user_id)
        if (userError) throw userError

        const { data: questions, error: qErr } = await supabase
          .from("survey_questions")
          .select("id")
          .eq("survey_id", selectedSurveyId)
        if (qErr) throw qErr

        const questionIds = (questions || []).map((q) => q.id).filter(Boolean)
        if (questionIds.length > 0) {
          let updateQuery = supabase
            .from("responses")
            .update({
              role: payload.role,
              department: payload.department,
              site: payload.site,
            })
            .eq("user_id", editTarget.user_id)
            .in("question_id", questionIds)

          if (orgIdForUpdate) {
            updateQuery = updateQuery.eq("org_id", orgIdForUpdate)
          }

          const { error: respError } = await updateQuery
          if (respError) {
            const msg = String(respError.message || "").toLowerCase()
            if (msg.includes("department") || msg.includes("site")) {
              let fallback = supabase
                .from("responses")
                .update({ role: payload.role })
                .eq("user_id", editTarget.user_id)
                .in("question_id", questionIds)
              if (orgIdForUpdate) fallback = fallback.eq("org_id", orgIdForUpdate)
              const retry = await fallback
              if (retry.error) throw retry.error
            } else {
              throw respError
            }
          }
        }
      }

      setResponseGroups((prev) =>
        prev.map((g) => {
          if (g.user_id !== editTarget.user_id) return g
          return {
            ...g,
            user: {
              id: g.user_id,
              first_name: payload.first_name,
              last_name: payload.last_name,
              email: payload.email || g.user?.email || "",
              role: payload.role,
              department: payload.department,
              site: payload.site,
            },
            metadata: {
              ...g.metadata,
              role: payload.role,
              department: payload.department,
              site: payload.site,
            },
          }
        })
      )

      toast.success("Respondent info updated")
      setEditTarget(null)
    } catch (error: any) {
      console.error("Update respondent error:", error)
      toast.error(error?.message || "Failed to update respondent")
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteResponses = async () => {
    if (!deleteTarget || !selectedSurveyId) return
    if (deleteConfirmText.trim() !== DELETE_CONFIRMATION) {
      toast.error(`Type "${DELETE_CONFIRMATION}" to confirm.`)
      return
    }
    if (!deleteTarget.user_id || deleteTarget.user_id === "anonymous") {
      toast.error("This respondent cannot be deleted.")
      return
    }

    setDeleting(true)
    try {
      const orgIdForDelete =
        selectedOrgId !== "all"
          ? selectedOrgId
          : deleteTarget.metadata.org_id || undefined

      if (isPlatformAdmin) {
        const resp = await fetch("/api/admin/delete-responses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: deleteTarget.user_id,
            surveyId: selectedSurveyId,
            orgId: orgIdForDelete,
            confirmation: deleteConfirmText.trim(),
          }),
        })
        const payload = await resp.json().catch(() => ({}))
        if (!resp.ok) {
          throw new Error(payload.error || "Failed to delete responses")
        }
      } else {
        const { data: questions, error: qErr } = await supabase
          .from("survey_questions")
          .select("id")
          .eq("survey_id", selectedSurveyId)
        if (qErr) throw qErr
        const questionIds = (questions || []).map((q) => q.id)
        if (questionIds.length === 0) {
          toast.success("No answers to delete")
          setDeleteTarget(null)
          setDeleteConfirmText("")
          return
        }
        let query = supabase
          .from("responses")
          .delete()
          .eq("user_id", deleteTarget.user_id)
          .in("question_id", questionIds)
        if (org?.id) query = query.eq("org_id", org.id)
        const { error } = await query
        if (error) throw error
      }

      const removedId = deleteTarget.user_id
      setResponseGroups((prev) => prev.filter((g) => g.user_id !== removedId))
      setOpenRespondentId((prev) => (prev === removedId ? null : prev))
      setDeleteTarget(null)
      setDeleteConfirmText("")
      toast.success("Respondent answers deleted")
    } catch (error) {
      console.error("Delete responses error:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to delete responses"
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Survey Responses</h1>
          <p className="text-muted-foreground">
            View and analyze individual respondent data.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          {isPlatformAdmin && organizations.length > 0 && (
            <Select value={selectedOrgId} onValueChange={onOrgChange}>
              <SelectTrigger className="w-full md:w-[200px] bg-background">
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
          )}

          <div className="w-full md:w-[300px]">
            {loadingSurveys ? (
              <div className="h-10 w-full animate-pulse bg-muted rounded-md" />
            ) : surveys.length > 0 ? (
              <Select value={selectedSurveyId} onValueChange={onSurveyChange}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Select a survey" />
                </SelectTrigger>
                <SelectContent>
                  {surveys.map((survey) => (
                    <SelectItem key={survey.id} value={survey.id}>
                      {survey.title} {survey.organizations?.name ? `(${survey.organizations.name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-muted-foreground border p-2 rounded">No surveys found</div>
            )}
          </div>
        </div>
      </div>

      {loadingSurveys ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 w-full animate-pulse bg-muted rounded-xl" />)}
        </div>
      ) : surveys.length === 0 ? (
        <Alert>
          <HelpCircle className="h-4 w-4" />
          <AlertTitle>No Surveys Found</AlertTitle>
          <AlertDescription>Create and publish a survey to start collecting responses.</AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Stats / Info Bar - EXCLUDED FROM EXPORT CONTAINER */}
          <div className="flex flex-col gap-3 bg-muted/30 p-4 rounded-xl border">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Viewing <strong>{responseGroups.length}</strong> respondents for</span>
                <span className="font-semibold text-foreground">"{selectedSurveyTitle}"</span>
              </div>
              <ExportDialog
                type="results"
                title={selectedSurveyTitle}
                onExport={handleExportResults}
              />
            </div>
            {selectedSurveyUrl && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-1 rounded-md border bg-background px-3 py-2">
                  <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <a
                    href={selectedSurveyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-sm text-primary hover:underline"
                    title={selectedSurveyUrl}
                  >
                    {selectedSurveyUrl}
                  </a>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={copySurveyLink}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    asChild
                  >
                    <a href={selectedSurveyUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div ref={responsesContentRef} className="space-y-6 relative">
            {(loadingResponses || isExportingPdf) && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-xl bg-background/70 backdrop-blur-[1px]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">
                  {isExportingPdf ? "Preparing PDF export…" : "Loading response data…"}
                </p>
              </div>
            )}

            {loadingResponses ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                <p className="text-muted-foreground text-sm">Loading response data...</p>
              </div>
            ) : responseGroups.length === 0 ? (
              <Card className="border-dashed bg-muted/5">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <UserIcon className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <h3 className="font-semibold text-lg">No Responses Yet</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mt-1">
                    This survey hasn't received any submissions yet. Share the survey link to get started.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setOpenRespondentId(null)
                    }}
                    placeholder="Search by name, email, role, department, or site…"
                    className="pl-9 bg-background"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Showing {filteredGroups.length} of {responseGroups.length} respondents
                  {openRespondentId ? " · open one card at a time for faster browsing" : ""}
                </p>

                {isExportingPdf ? (
                  <div className="space-y-3">
                    {filteredGroups.map((group) => (
                      <RespondentRow
                        key={group.user_id}
                        group={group}
                        isOpen
                        isPlatformAdmin={isPlatformAdmin}
                        onToggle={() => {}}
                        onEdit={() => {}}
                        onDelete={() => {}}
                      />
                    ))}
                  </div>
                ) : filteredGroups.length === 0 ? (
                  <Card className="border-dashed bg-muted/5">
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                      No respondents match “{searchQuery.trim()}”.
                    </CardContent>
                  </Card>
                ) : (
                  <div
                    ref={listParentRef}
                    className="h-[min(70vh,720px)] overflow-y-auto rounded-xl border bg-muted/10 p-2"
                  >
                    <div
                      className="relative w-full"
                      style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                    >
                      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const group = filteredGroups[virtualRow.index]
                        return (
                          <div
                            key={group.user_id}
                            data-index={virtualRow.index}
                            ref={rowVirtualizer.measureElement}
                            className="absolute top-0 left-0 w-full"
                            style={{
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                          >
                            <RespondentRow
                              group={group}
                              isOpen={openRespondentId === group.user_id}
                              isPlatformAdmin={isPlatformAdmin}
                              onToggle={() => toggleRespondent(group.user_id)}
                              onEdit={() => openEditDialog(group)}
                              onDelete={() => {
                                setDeleteConfirmText("")
                                setDeleteTarget(group)
                              }}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) closeEditDialog()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit respondent info</DialogTitle>
            <DialogDescription>
              Update profile details used for analytics (role, department, site).
              Changes apply to this respondent and their answers on the selected survey.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-first-name">First name</Label>
                <Input
                  id="edit-first-name"
                  value={editForm.first_name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, first_name: e.target.value }))
                  }
                  disabled={savingEdit}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-last-name">Last name</Label>
                <Input
                  id="edit-last-name"
                  value={editForm.last_name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, last_name: e.target.value }))
                  }
                  disabled={savingEdit}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, email: e.target.value }))
                }
                disabled={savingEdit}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-role">Role</Label>
              <Input
                id="edit-role"
                value={editForm.role}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, role: e.target.value }))
                }
                disabled={savingEdit}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-department">Department</Label>
              <Input
                id="edit-department"
                value={editForm.department}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, department: e.target.value }))
                }
                disabled={savingEdit}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-site">Site</Label>
              <Input
                id="edit-site"
                value={editForm.site}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, site: e.target.value }))
                }
                disabled={savingEdit}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeEditDialog}
              disabled={savingEdit}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSaveRespondent()}
              disabled={savingEdit}
            >
              {savingEdit ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) closeDeleteDialog()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user responses</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes every answer for{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.user
                  ? `${deleteTarget.user.first_name} ${deleteTarget.user.last_name}`.trim()
                  : "this respondent"}
              </span>
              {deleteTarget?.user?.email ? ` (${deleteTarget.user.email})` : ""} on{" "}
              <span className="font-medium text-foreground">"{selectedSurveyTitle}"</span>.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Type <span className="font-mono text-foreground">{DELETE_CONFIRMATION}</span> to confirm.
            </p>
            <Input
              autoFocus
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={DELETE_CONFIRMATION}
              disabled={deleting}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting || deleteConfirmText.trim() !== DELETE_CONFIRMATION}
              onClick={() => void handleDeleteResponses()}
            >
              {deleting ? "Deleting…" : "Delete responses"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
