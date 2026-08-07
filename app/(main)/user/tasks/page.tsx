import { redirect } from "next/navigation";
import { requireAuth } from "../../../../lib/auth";

export default async function TasksPage() {
  await requireAuth();
  redirect("/user/scheduled-inspection");
}
