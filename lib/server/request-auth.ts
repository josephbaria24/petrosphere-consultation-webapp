import { createClient } from "../supabase/server";
import { getVerifiedAdminFromCookie } from "./admin-auth";

export type RequestActor =
  | { kind: "user"; userId: string; email: string | null }
  | { kind: "admin"; userId: string; email: string };

export async function getRequestActor(): Promise<RequestActor | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    return {
      kind: "user",
      userId: session.user.id,
      email: session.user.email ?? null,
    };
  }

  const admin = await getVerifiedAdminFromCookie();
  if (admin) {
    return {
      kind: "admin",
      userId: admin.id,
      email: admin.email,
    };
  }

  return null;
}
