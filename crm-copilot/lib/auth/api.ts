import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getProfile, isAdmin, type Profile } from "@/lib/auth/roles";
import type { User } from "@supabase/supabase-js";

function getUrlAndAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Missing Supabase public env vars");
  }
  return { url, anon };
}

export async function getUserFromRequest(
  request: Request,
): Promise<{ user: User; profile: Profile | null } | null> {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length).trim()
    : null;

  if (!token) return null;

  const { url, anon } = getUrlAndAnon();
  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  const admin = createServiceRoleClient();
  const profile = await getProfile(admin, data.user.id);
  return { user: data.user, profile };
}

export async function requireAdminFromRequest(request: Request) {
  const auth = await getUserFromRequest(request);
  if (!auth?.user) {
    return { error: "Unauthorized", status: 401 as const };
  }
  if (!isAdmin(auth.profile)) {
    return { error: "Admin only", status: 403 as const };
  }
  return { user: auth.user, profile: auth.profile };
}
