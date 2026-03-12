import { requireAuth } from "../../../../lib/auth";
import TasksPageClient from "../../../../components/tasks/TasksPageClient";

export default async function AdminTasksPage() {
  await requireAuth();
  return <TasksPageClient isAdmin={true} />;
}
