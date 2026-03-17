import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import jsPDF from "jspdf";

export async function POST(request: Request) {
    try {
        const { org_id, date_from, date_to, created_by } = await request.json();
        if (!org_id) {
            return NextResponse.json({ error: "org_id is required" }, { status: 400 });
        }

        const supabase = await createClient();

        // 1. Fetch org details
        const { data: org } = await supabase
            .from("organizations")
            .select("id, name, created_at")
            .eq("id", org_id)
            .single();

        if (!org) {
            return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }

        // 2. Fetch surveys (Strict: Creator)
        let surveyQuery = supabase
            .from("surveys")
            .select("id, title, created_at")
            .eq("org_id", org_id);
        
        if (created_by) {
            surveyQuery = surveyQuery.eq("created_by", created_by);
        }

        const { data: surveys } = await surveyQuery.order("created_at", { ascending: false });
        const surveyIds = surveys?.map(s => s.id) || [];

        // 3. Fetch response totals (only for the user's surveys)
        let responseQuery = supabase
            .from("responses")
            .select("id, user_id, created_at, question_id")
            .eq("org_id", org_id);
        
        // Filter responses to only those linked to the user's surveys
        if (surveyIds.length > 0) {
            // Need to join via survey_questions to be precise, or just filter by question_id if we have them
            // For simplicity, we'll fetch questions first or use a join if possible (responses don't have survey_id directly usually)
            const { data: qIds } = await supabase.from("survey_questions").select("id").in("survey_id", surveyIds);
            const validQIds = qIds?.map(q => q.id) || [];
            if (validQIds.length > 0) {
                responseQuery = responseQuery.in("question_id", validQIds);
            } else {
                // No questions found for these surveys
                responseQuery = responseQuery.eq("id", "00000000-0000-0000-0000-000000000000"); // Force empty
            }
        } else if (created_by) {
            // No surveys found for this user
            responseQuery = responseQuery.eq("id", "00000000-0000-0000-0000-000000000000"); // Force empty
        }

        const { data: responses } = await responseQuery;
        const totalResponses = responses?.length || 0;
        const uniqueRespondents = new Set(responses?.map(r => r.user_id) || []).size;

        // 4. Fetch actions (Strict: Creator)
        let actionQuery = supabase
            .from("actions")
            .select("id, title, status, is_completed, target_date, assigned_to, workflow_stage, evidence_urls, dimension, priority")
            .eq("org_id", org_id);

        if (created_by) {
            actionQuery = actionQuery.eq("created_by", created_by);
        }

        const { data: actions } = await actionQuery;

        const totalActions = actions?.length || 0;
        const openActions = actions?.filter(a => !a.is_completed).length || 0;
        const closedActions = actions?.filter(a => a.is_completed).length || 0;
        const overdueActions = actions?.filter(a => !a.is_completed && a.target_date && new Date(a.target_date) < new Date()).length || 0;

        // 5. Fetch AI insights (if available)
        let aiInsightText = "No AI insights generated yet.";
        if (surveys?.length) {
            const { data: insights } = await supabase
                .from("survey_ai_insights")
                .select("insights")
                .eq("survey_id", surveys[0].id)
                .single();
            if (insights?.insights?.quick_insight) {
                aiInsightText = insights.insights.quick_insight;
            }
        }

        // 6. Fetch overdue view data
        const { data: overdueData } = await supabase
            .from("v_org_action_overdue")
            .select("*")
            .eq("org_id", org_id)
            .single();

        // Generate PDF
        const pdf = new jsPDF("p", "mm", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 20;
        const contentWidth = pageWidth - margin * 2;
        let y = margin;

        // --- Header ---
        pdf.setFillColor(30, 58, 138); // Deep blue
        pdf.rect(0, 0, pageWidth, 40, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(20);
        pdf.setFont("helvetica", "bold");
        pdf.text("Safety Compliance Report", margin, 18);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, margin, 28);
        pdf.text(`Organization: ${org.name}`, margin, 34);
        y = 50;

        // --- Section helper ---
        const addSectionHeader = (title: string) => {
            if (y > 260) { pdf.addPage(); y = margin; }
            pdf.setFillColor(241, 245, 249);
            pdf.rect(margin, y, contentWidth, 8, "F");
            pdf.setTextColor(30, 58, 138);
            pdf.setFontSize(12);
            pdf.setFont("helvetica", "bold");
            pdf.text(title, margin + 3, y + 6);
            y += 14;
            pdf.setTextColor(51, 51, 51);
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(10);
        };

        // --- 1. Organization Summary ---
        addSectionHeader("Organization Summary");
        pdf.text(`Name: ${org.name}`, margin, y); y += 6;
        pdf.text(`Joined: ${new Date(org.created_at).toLocaleDateString()}`, margin, y); y += 6;
        pdf.text(`Total Surveys: ${surveys?.length || 0}`, margin, y); y += 12;

        // --- 2. Survey Listing ---
        addSectionHeader("Surveys");
        if (surveys?.length) {
            surveys.slice(0, 10).forEach((s: any) => {
                if (y > 270) { pdf.addPage(); y = margin; }
                pdf.text(`• ${s.title}  (${new Date(s.created_at).toLocaleDateString()})`, margin + 3, y);
                y += 6;
            });
            if (surveys.length > 10) {
                pdf.text(`... and ${surveys.length - 10} more`, margin + 3, y);
                y += 6;
            }
        } else {
            pdf.text("No surveys found.", margin + 3, y); y += 6;
        }
        y += 6;

        // --- 3. Response Totals ---
        addSectionHeader("Response Summary");
        pdf.text(`Total Responses: ${totalResponses}`, margin, y); y += 6;
        pdf.text(`Unique Respondents: ${uniqueRespondents}`, margin, y); y += 6;
        y += 6;

        // --- 4. AI Insight ---
        addSectionHeader("AI Risk Assessment");
        const lines = pdf.splitTextToSize(aiInsightText, contentWidth - 6);
        pdf.text(lines, margin + 3, y);
        y += lines.length * 5 + 8;

        // --- 5. Actions Summary ---
        addSectionHeader("Actions Summary");
        pdf.text(`Total Actions: ${totalActions}`, margin, y); y += 6;
        pdf.text(`Open: ${openActions}`, margin, y); y += 6;
        pdf.text(`Closed: ${closedActions}`, margin, y); y += 6;
        pdf.setTextColor(220, 38, 38);
        pdf.text(`Overdue: ${overdueActions}`, margin, y); y += 6;
        if (overdueData?.overdue_pct) {
            pdf.text(`Overdue Rate: ${overdueData.overdue_pct}%`, margin, y); y += 6;
        }
        pdf.setTextColor(51, 51, 51);
        y += 6;

        // --- 6. Completed Actions with Evidence ---
        addSectionHeader("Completed Actions (with Evidence)");
        const completedWithEvidence = actions?.filter(a => a.is_completed && a.evidence_urls?.length) || [];
        if (completedWithEvidence.length > 0) {
            completedWithEvidence.forEach((a: any, idx: number) => {
                if (y > 260) { pdf.addPage(); y = margin; }
                pdf.setFont("helvetica", "bold");
                pdf.text(`${idx + 1}. ${a.title}`, margin + 3, y); y += 5;
                pdf.setFont("helvetica", "normal");
                pdf.text(`   Dimension: ${a.dimension} | Priority: ${a.priority}`, margin + 3, y); y += 5;
                pdf.text(`   Evidence: ${a.evidence_urls.length} attachment(s)`, margin + 3, y); y += 5;
                a.evidence_urls.slice(0, 3).forEach((url: string) => {
                    const truncUrl = url.length > 70 ? url.substring(0, 67) + "..." : url;
                    pdf.setTextColor(59, 130, 246);
                    pdf.text(`     → ${truncUrl}`, margin + 3, y); y += 5;
                    pdf.setTextColor(51, 51, 51);
                });
                y += 3;
            });
        } else {
            pdf.text("No completed actions with evidence found.", margin + 3, y); y += 6;
        }

        // --- Footer ---
        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            pdf.text(`Safety Vitals Compliance Report — ${org.name} — Page ${i} of ${totalPages}`, pageWidth / 2, 290, { align: "center" });
        }

        // Return PDF as binary
        const pdfBuffer = pdf.output("arraybuffer");
        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="compliance-report-${org.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf"`,
            },
        });
    } catch (error: any) {
        console.error("Compliance report error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
