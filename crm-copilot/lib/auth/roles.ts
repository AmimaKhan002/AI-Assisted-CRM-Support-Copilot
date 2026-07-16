import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AppRole = "agent" | "admin";

export type Profile = {
  id: string;
  email: string | null;
  role: AppRole;
};

export async function getProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Profile;
}

export async function requireUser(
  supabase: SupabaseClient,
): Promise<{ user: User; profile: Profile | null }> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Not authenticated");
  }
  const profile = await getProfile(supabase, data.user.id);
  return { user: data.user, profile };
}

export function isAdmin(profile: Profile | null | undefined): boolean {
  return profile?.role === "admin";
}
