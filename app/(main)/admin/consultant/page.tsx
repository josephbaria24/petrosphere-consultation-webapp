import { requireAuth } from "../../../../lib/auth";
import ConsultantClient from "./ConsultantClient";

export default async function ConsultantPage() {
  await requireAuth();
  return <ConsultantClient />;
}
