import { requireAuth } from "../../../../lib/auth";
import TasksPageClient from "../../../../components/tasks/TasksPageClient";

export default async function AdminScheduledInspectionPage() {
  await requireAuth();
  return (
    <TasksPageClient isAdmin={true} workflowKind="scheduled_inspection" />
  );
}
