import { redirect } from "next/navigation";
import { requireAuth } from "../../../../lib/auth";

export default async function AdminTasksPage() {
  await requireAuth();
  redirect("/admin/scheduled-inspection");
}
