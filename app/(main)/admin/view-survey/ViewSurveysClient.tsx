'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Cookies from "js-cookie";
import {
  Card,
  CardContent,
  CardHeader,
} from '../../../../components/ui/card'
import { Badge } from '../../../../@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { Button } from '../../../../components/ui/button'
import { ClipboardCopy, Eye, EyeOff } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../../../@/components/ui/accordion'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../../../@/components/ui/alert-dialog'
import { Input } from '../../../../components/ui/input'

const supabase = createClientComponentClient();

type SurveyQuestion = {
  id: string
  survey_id: string
  question_text: string
  question_type: 'text' | 'multiple-choice'
  options: string[] | null
  order_index: number
  is_required: boolean
  created_at: string
}

type Survey = {
  slug: string
  id: string
  title: string
  description: string
  created_at: string
  is_published: boolean
  created_by: string | null
  users: {
    first_name: string
    last_name: string
    email: string
  } | null
  survey_questions: SurveyQuestion[]
}


export default function ViewSurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSurveys = async () => {
      const { data, error } = await supabase
        .from('surveys')
        .select(`
          id,
          slug,
          title,
          description,
          created_at,
          is_published,
          created_by,
          users:created_by (
            first_name,
            last_name,
            email
          ),
          survey_questions (
            id,
            question_text,
            question_type,
            options,
            order_index,
            is_required,
            created_at
          )
        `)

      if (error) {
        toast.error('Error fetching surveys')
        console.error(error)
      } else if (data) {
        const normalized = data.map((survey) => ({
          ...survey,
          users: Array.isArray(survey.users) ? survey.users[0] ?? null : survey.users,
        }))
        
      
        setSurveys(normalized as Survey[])
      }
      

      setLoading(false)
    }

    fetchSurveys()
  }, [])

  function DeleteSurveyDialog({ surveyId, onDelete }: { surveyId: string, onDelete: (id: string, password: string) => void }) {
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
  
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-red-500">
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Please enter your password to confirm deleting this survey. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
  
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
  
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(surveyId, password)
                setPassword("")
              }}
            >
              Delete Survey
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  const handleDeleteSurvey = async (id: string, password: string) => {
    if (!password) {
      toast.error("Password is required.");
      return;
    }
  
    // ✅ Get admin_id from cookie
    const adminId = Cookies.get("admin_id");
  
    if (!adminId) {
      toast.error("You are not logged in.");
      return;
    }
  
    // ✅ Fetch admin password hash from DB
    const { data: admin, error: adminError } = await supabase
      .from("admin_users")
      .select("password_hash")
      .eq("id", adminId)
      .single();
  
    if (adminError || !admin) {
      toast.error("Unable to verify admin.");
      return;
    }
  
    // ✅ Compare entered password with stored hash
    const bcrypt = await import("bcryptjs");
    const isMatch = await bcrypt.compare(password, admin.password_hash);
  
    if (!isMatch) {
      toast.error("Incorrect password.");
      return;
    }
  
    // ✅ Delete survey
    const { error } = await supabase.from("surveys").delete().eq("id", id);
  
    if (error) {
      toast.error("Failed to delete survey");
    } else {
      toast.success("Survey deleted");
      setSurveys((prev) => prev.filter((s) => s.id !== id));
    }
  };
  
  
  

// Inside component:
const router = useRouter()

const handleEditSurvey = (id: string) => {
  router.push(`/admin/edit-survey/${id}`)
}


return (
  <div className="max-w-5xl mx-auto p-6 space-y-4">
    <h1 className="text-2xl font-bold">All Surveys</h1>

    {loading ? (
      <p>Loading...</p>
    ) : surveys.length === 0 ? (
      <p>No surveys found.</p>
    ) : (
      <Accordion type="multiple" className="space-y-4">
        {surveys.map((survey) => (
          <AccordionItem value={survey.id} key={survey.id}>
            <AccordionTrigger className="text-left">
              <div className="flex flex-col gap-1 w-full">
                <span className="font-semibold">{survey.title}</span>
                <span className="text-xs text-muted-foreground">
                  Created by: {survey.users?.first_name || 'Unknown'} {survey.users?.last_name || 'Unknown'} ({survey.users?.email || 'N/A'}) ·{' '}
                  {survey.is_published ? (
                    <Badge variant="default">Published</Badge>
                  ) : (
                    <Badge variant="secondary">Draft</Badge>
                  )}
                </span>
              </div>
            </AccordionTrigger>

            <AccordionContent>
              <Card>
                <CardHeader className="flex flex-col md:flex-row md:justify-between gap-2">
                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditSurvey(survey.id)}
                      className="text-blue-500"
                    >
                      Edit
                    </Button>
                    <DeleteSurveyDialog surveyId={survey.id} onDelete={handleDeleteSurvey} />

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        const baseUrl =
                          typeof window !== 'undefined'
                            ? window.location.origin
                            : 'http://safety-vitals.vercel.app'
                        const link = survey.slug
                          ? `${baseUrl}/survey/${survey.slug}`
                          : `${baseUrl}/survey/${survey.id}`
                      
                        try {
                          if (navigator.clipboard && navigator.clipboard.writeText) {
                            await navigator.clipboard.writeText(link)
                            toast.success('Link copied to clipboard!')
                          } else {
                            throw new Error('Clipboard API not supported')
                          }
                        } catch {
                          toast.error('Something went wrong.')
                        } {
                          const confirmed = window.prompt('Copy the link below:', link)
                          if (confirmed !== null) {
                            toast.success('You can now paste the link manually.')
                          }
                        }
                      }}
                      
                    >
                      <ClipboardCopy className="w-4 h-4 mr-1" />
                      Copy Link
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground">{survey.description}</p>
                  <p className="text-xs text-gray-400">
                    Created at: {new Date(survey.created_at).toLocaleString()}
                  </p>

                  {survey.survey_questions?.length > 0 && (
                    <div className="space-y-2 mt-2">
                      <h4 className="font-semibold">Questions:</h4>
                      <ul className="list-disc pl-5 space-y-1">
                        {survey.survey_questions.map((q, index) => (
                          <li key={q.id}>
                            <span className="font-medium">{index + 1}. {q.question_text}</span>{' '}
                            <span className="ml-1 text-sm italic text-muted-foreground">
                              ({q.question_type})
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    )}
  </div>
)

}
