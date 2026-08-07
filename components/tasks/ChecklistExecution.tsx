"use client";

import PremisesInspectionForm from "./PremisesInspectionForm";
import { FIELD_WORKFLOW_BY_KIND, getFieldWorkflowFromPathname, type FieldWorkflowKind } from "../../lib/field-workflows";
import { usePathname } from "next/navigation";
import { getClientCookie } from "../../lib/cookies-client";

interface ChecklistExecutionProps {
  session: { id: string; checklist_id: string; org_id: string };
  template: { title: string; description?: string; template_kind?: FieldWorkflowKind };
  onFinish: () => void;
  onCancel: () => void;
  onGoToReports?: () => void;
}

export default function ChecklistExecution({
  session,
  template,
  onFinish,
  onCancel,
}: ChecklistExecutionProps) {
  const pathname = usePathname();
  const isAdmin = !!getClientCookie("admin_id");
  const basePath = isAdmin ? "/admin" : "/user";
  const fromPath = getFieldWorkflowFromPathname(pathname);
  const workflow =
    fromPath ??
    (template.template_kind
      ? FIELD_WORKFLOW_BY_KIND[template.template_kind]
      : FIELD_WORKFLOW_BY_KIND.scheduled_inspection);

  return (
    <PremisesInspectionForm
      session={session}
      template={template}
      workflow={workflow}
      reportsHref={`${basePath}/inspection-reports`}
      onFinish={onFinish}
      onCancel={onCancel}
    />
  );
}
