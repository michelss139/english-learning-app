import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import StoryGeneratorClient from "./StoryGeneratorClient";

export default async function StoryGeneratorPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main className="space-y-6">
      <StoryGeneratorClient />
    </main>
  );
}
