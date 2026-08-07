import type { PlanTier, SubStatus } from "./types/bootstrap";

/** Human-readable subscription label for nav badges and profile UI. */
export function getSubscriptionDisplayLabel(
  plan?: PlanTier,
  status?: SubStatus
): string {
  if (status === "trialing") return "PRO TRIAL";
  if (status === "canceled") return "EXPIRED";

  switch (plan) {
    case "paid":
      return "PAID";
    case "professional":
      return "PRO";
    case "demo":
      return "DEMO";
    case "basic":
      return "BASIC";
    default:
      return "BASIC";
  }
}
