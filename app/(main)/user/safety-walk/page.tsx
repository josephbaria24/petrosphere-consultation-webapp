import { requireAuth } from "../../../../lib/auth";
import TasksPageClient from "../../../../components/tasks/TasksPageClient";

export default async function SafetyWalkPage() {
  await requireAuth();
  return (
    <TasksPageClient isAdmin={false} workflowKind="safety_walk" />
  );
}
