/**
 * File: app/(main)/admin/organizations/page.tsx
 * Description: Organizations management page for Platform Admins.
 * Provides a comprehensive overview of all tenants on the platform.
 * Functions:
 * - OrganizationsPage(): Administrative component for cross-tenant oversight.
 * Connections:
 * - Accessible to Platform Admins via the Sidebar (/admin/organizations).
 * - Uses requireAuth to ensure only authorized admins can access.
 */
import { requireAuth } from "../../../../lib/auth";
import OrganizationsClient from "./OrganizationsClient";

export default async function OrganizationsPage() {
    // Enforce administrative authentication
    await requireAuth();

    return <OrganizationsClient />;
}
