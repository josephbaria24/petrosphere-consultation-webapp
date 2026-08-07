import type { LucideIcon } from "lucide-react";
import { ClipboardCheck, Footprints, ShieldCheck } from "lucide-react";

export type FieldWorkflowKind =
  | "scheduled_inspection"
  | "safety_walk"
  | "audit";

export interface FieldWorkflowConfig {
  kind: FieldWorkflowKind;
  title: string;
  subtitle: string;
  pathSegment: string;
  icon: LucideIcon;
  emptyMessage: string;
  gatedFeatureName: string;
}

export const FIELD_WORKFLOWS: FieldWorkflowConfig[] = [
  {
    kind: "scheduled_inspection",
    title: "Scheduled Inspection",
    subtitle: "Run templated safety inspections on a schedule.",
    pathSegment: "scheduled-inspection",
    icon: ClipboardCheck,
    emptyMessage: "No scheduled inspection templates available.",
    gatedFeatureName: "Scheduled Inspections",
  },
  {
    kind: "safety_walk",
    title: "Safety Walk",
    subtitle: "Record observations during routine safety walks.",
    pathSegment: "safety-walk",
    icon: Footprints,
    emptyMessage: "No safety walk templates available.",
    gatedFeatureName: "Safety Walks",
  },
  {
    kind: "audit",
    title: "Audits",
    subtitle: "Complete formal compliance and safety audits.",
    pathSegment: "audits",
    icon: ShieldCheck,
    emptyMessage: "No audit templates available.",
    gatedFeatureName: "Audits",
  },
];

export const FIELD_WORKFLOW_BY_KIND: Record<
  FieldWorkflowKind,
  FieldWorkflowConfig
> = Object.fromEntries(
  FIELD_WORKFLOWS.map((w) => [w.kind, w])
) as Record<FieldWorkflowKind, FieldWorkflowConfig>;

export function getFieldWorkflowPath(
  basePath: string,
  kind: FieldWorkflowKind
): string {
  return `${basePath}/${FIELD_WORKFLOW_BY_KIND[kind].pathSegment}`;
}

export function getFieldWorkflowFromPathname(
  pathname: string
): FieldWorkflowConfig | null {
  return (
    FIELD_WORKFLOWS.find((w) => pathname.includes(`/${w.pathSegment}`)) ?? null
  );
}
