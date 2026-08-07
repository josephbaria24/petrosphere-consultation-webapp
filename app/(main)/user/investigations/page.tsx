import { redirect } from "next/navigation";
import { requireAuth } from "../../../../lib/auth";

export default async function UserInvestigationsPage() {
  await requireAuth();
  redirect("/user/inspection-reports");
}
