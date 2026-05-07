import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "../../../lib/auth";

export default async function UserRoutesLayout({ children }: { children: ReactNode }) {
  const user = await requireAuth();
  if (user.isAdmin) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
