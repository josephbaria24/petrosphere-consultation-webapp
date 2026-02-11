import type { ReactNode } from "react"
/**
 * File: app/(main)/layout.tsx
 * Description: Main layout wrapper for authenticated sections of the application.
 * Provides consistent shell structure including the Sidebar and navigation.
 * Functions:
 * - Layout({ children }): Functional component that defines the authenticated UI structure.
 * Connections:
 * - Serves as the layout for all routes under the (main) group.
 * - Integrates the Sidebar component.
 */
import Layout from "./kokonutui/layout"
import { OnboardingTour } from "../../components/onboarding-tour"

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <Layout>
      {children}
      <OnboardingTour />
    </Layout>
  )
}
