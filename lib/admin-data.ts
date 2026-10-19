import { createClient } from "@/lib/supabase/server";
import type { AdminProfile, DailyPrompt, Generation, Vote } from "@/lib/types";

/**
 * Every read below goes through the anon key plus the admin's own session.
 * Without `profiles.is_superadmin` the same queries come back empty, because
 * the policies in supabase/admin.sql are what grants the wide read — not a
 * privileged key baked into this app.
 */

const GENERATION_COLUMNS =
  "id, user_id, daily_prompt_id, topic, user_input, prompt, model, content, is_house, published, created_at";

export async function getProfiles(): Promise<AdminProfile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, email, first_name, last_name, avatar_url, bio, is_superadmin, created_at"
    )
    .order("created_at", { ascending: true })
    .returns<AdminProfile[]>();

  return data ?? [];
}

export async function getGenerations(): Promise<Generation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("generations")
    .select(GENERATION_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(500)
    .returns<Generation[]>();

  return data ?? [];
}

export async function getGeneration(id: string): Promise<Generation | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("generations")
    .select(GENERATION_COLUMNS)
    .eq("id", id)
    .maybeSingle<Generation>();

  return data ?? null;
}

export async function getVotes(): Promise<Vote[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("votes")
    .select("id, generation_id, user_id, value, created_at")
    .order("created_at", { ascending: false })
    .limit(2000)
    .returns<Vote[]>();

  return data ?? [];
}

export async function getPrompts(): Promise<DailyPrompt[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_prompts")
    .select("id, prompt_date, topic")
    .order("prompt_date", { ascending: false })
    .returns<DailyPrompt[]>();

  return data ?? [];
}
