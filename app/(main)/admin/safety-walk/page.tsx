import { requireAuth } from "../../../../lib/auth";
import TasksPageClient from "../../../../components/tasks/TasksPageClient";

export default async function AdminSafetyWalkPage() {
  await requireAuth();
  return <TasksPageClient isAdmin={true} workflowKind="safety_walk" />;
}
