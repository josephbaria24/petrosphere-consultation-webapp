import type { ReactNode } from "react"
import Layout from "../../components/kokonutui/layout"

export default function MainLayout({ children }: { children: ReactNode }) {
  return <Layout>{children}</Layout>
}
