import { supabase } from "@/lib/supabase/client";

export type Profile = {
  id: string;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
  role: "admin" | "student";
  subscription_status: "inactive" | "active" | "past_due" | "canceled";
  notes: string | null;
};

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getOrCreateProfile(defaults?: {
  username?: string | null;
  avatar_url?: string | null;
}): Promise<Profile | null> {
  const session = await getSession();
  if (!session?.user) return null;

  const user = session.user;
  const metadata = (user.user_metadata ?? {}) as {
    username?: string | null;
    avatar_url?: string | null;
  };

  // 1) Spróbuj pobrać profil
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id,email,username,avatar_url,role,subscription_status,notes")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing as Profile;

  // 2) Jeśli nie ma, utwórz (MVP)
  const username = defaults?.username ?? metadata.username ?? null;
  const avatarUrl = defaults?.avatar_url ?? metadata.avatar_url ?? null;
  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email ?? null,
      username,
      avatar_url: avatarUrl,
      role: "student",
      subscription_status: "inactive",
      notes: null,
    })
    .select("id,email,username,avatar_url,role,subscription_status,notes")
    .single();

  if (insertError) throw insertError;
  return inserted as Profile;
}
