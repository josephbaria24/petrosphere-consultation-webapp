import { requireAuth } from "../../../../lib/auth";
import TasksPageClient from "../../../../components/tasks/TasksPageClient";

export default async function ScheduledInspectionPage() {
  await requireAuth();
  return (
    <TasksPageClient isAdmin={false} workflowKind="scheduled_inspection" />
  );
}
