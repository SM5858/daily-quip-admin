import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { AdminProfile } from "@/lib/types";

export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/**
 * The gate for every page in this app. `proxy.ts` already turns away signed-out
 * visitors, but each page checks again — and checks the flag — so the wall does
 * not depend on the proxy alone.
 *
 * The flag is read through RLS: a non-admin cannot even see their own
 * `is_superadmin` value as `true` unless it really is.
 */
export async function requireSuperadmin(): Promise<{
  user: User;
  profile: AdminProfile;
}> {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, email, first_name, last_name, avatar_url, bio, is_superadmin, created_at"
    )
    .eq("id", user.id)
    .maybeSingle<AdminProfile>();

  if (!profile?.is_superadmin) redirect("/login?denied=1");

  return { user, profile };
}
