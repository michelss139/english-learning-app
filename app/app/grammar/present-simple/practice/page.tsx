import { requireServerSessionOrRedirect } from "@/lib/auth/serverSession";
import { PracticeClient } from "./PracticeClient";

export default async function PresentSimplePracticePage() {
  await requireServerSessionOrRedirect();
  return <PracticeClient />;
}
