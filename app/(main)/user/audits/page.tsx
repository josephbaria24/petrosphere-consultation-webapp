import { requireAuth } from "../../../../lib/auth";
import TasksPageClient from "../../../../components/tasks/TasksPageClient";

export default async function AuditsPage() {
  await requireAuth();
  return <TasksPageClient isAdmin={false} workflowKind="audit" />;
}
