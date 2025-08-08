import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function Home() {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_token")?.value

  if (token) {
    redirect("/dashboard")
  } else {
    redirect("/admin-login")
  }
}
