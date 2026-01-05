import { supabase } from "@/lib/supabase/client";

export type Profile = {
  id: string;
  email: string | null;
  role: "admin" | "student";
  subscription_status: "inactive" | "active" | "past_due" | "canceled";
  notes: string | null;
};

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getOrCreateProfile(): Promise<Profile | null> {
  const session = await getSession();
  if (!session?.user) return null;

  const user = session.user;

  // 1) Spróbuj pobrać profil
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id,email,role,subscription_status,notes")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing as Profile;

  // 2) Jeśli nie ma, utwórz (MVP)
  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email ?? null,
      role: "student",
      subscription_status: "inactive",
      notes: null,
    })
    .select("id,email,role,subscription_status,notes")
    .single();

  if (insertError) throw insertError;
  return inserted as Profile;
}
