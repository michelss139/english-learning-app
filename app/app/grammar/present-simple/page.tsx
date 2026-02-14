import { PresentSimpleClient } from "./PresentSimpleClient";
import { requireServerSessionOrRedirect } from "@/lib/auth/serverSession";

export default async function PresentSimplePage() {
  await requireServerSessionOrRedirect();
  return <PresentSimpleClient />;
}
