"use client";

import { useApp } from "../app/AppProvider";
import { GatedFeature } from "../gated-feature";
import InspectionReportDashboard from "./InspectionReportDashboard";
import { getClientCookie } from "../../lib/cookies-client";

interface InspectionReportsPageClientProps {
  isAdmin: boolean;
}

export default function InspectionReportsPageClient({
  isAdmin,
}: InspectionReportsPageClientProps) {
  const { org, user, limits } = useApp();
  const isPlatformAdmin = !!getClientCookie("admin_id");
  const basePath = isAdmin || isPlatformAdmin ? "/admin" : "/user";

  return (
    <GatedFeature
      isRestricted={!limits?.allow_tasks && !isPlatformAdmin}
      featureName="Inspection Reports"
    >
      <div className="p-4 md:p-8 pt-6 max-w-[1200px] mx-auto w-full min-h-screen">
        <InspectionReportDashboard
          orgId={org?.id || ""}
          userId={user?.id}
          isPlatformAdmin={isPlatformAdmin}
          basePath={basePath}
        />
      </div>
    </GatedFeature>
  );
}
