import { requireAuth } from "../../../../lib/auth";
import TasksPageClient from "../../../../components/tasks/TasksPageClient";

export default async function TasksPage() {
  await requireAuth();
  return <TasksPageClient isAdmin={false} />;
}
