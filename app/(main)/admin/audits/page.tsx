import { requireAuth } from "../../../../lib/auth";
import TasksPageClient from "../../../../components/tasks/TasksPageClient";

export default async function AdminAuditsPage() {
  await requireAuth();
  return <TasksPageClient isAdmin={true} workflowKind="audit" />;
}
