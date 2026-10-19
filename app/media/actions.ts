"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSuperadmin } from "@/lib/auth";
import { buildPrompt, generateCaption } from "@/lib/gemini";
import type { ActionState } from "@/lib/action-state";

/**
 * Every action re-checks the admin flag. Server Actions are reachable by direct
 * POST, so the page-level gate is not enough — and the database would refuse
 * these writes anyway, since the policies in supabase/admin.sql test
 * `public.is_superadmin()`.
 */

export async function createMedia(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSuperadmin();

  const intent = String(formData.get("intent") ?? "save");
  const topic = String(formData.get("topic") ?? "").trim();
  const angle = String(formData.get("user_input") ?? "").trim();
  const promptId = Number(formData.get("daily_prompt_id")) || null;

  if (!topic) {
    return { status: "error", message: "A topic is required." };
  }

  if (intent === "generate") {
    try {
      const prompt = buildPrompt(topic, angle || null);
      const { text } = await generateCaption(prompt);
      return { status: "idle", message: "", content: text };
    } catch (error) {
      return {
        status: "error",
        message:
          error instanceof Error ? error.message : "The AI call failed.",
      };
    }
  }

  const content = String(formData.get("content") ?? "").trim();
  if (!content) {
    return {
      status: "error",
      message: "Generate a caption (or type one) before saving.",
      content: "",
    };
  }

  const supabase = await createClient();
  const prompt = buildPrompt(topic, angle || null);

  const { error } = await supabase.from("generations").insert({
    user_id: null,
    daily_prompt_id: promptId,
    topic,
    user_input: angle || null,
    prompt,
    model: String(formData.get("model") ?? "gemini-3.6-flash"),
    content,
    is_house: true,
    published: formData.get("published") === "on",
  });

  if (error) {
    return { status: "error", message: error.message, content };
  }

  revalidatePath("/media");
  revalidatePath("/");
  return { status: "success", message: "Caption created.", content: "" };
}

export async function updateMedia(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSuperadmin();

  const id = String(formData.get("id") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  const topic = String(formData.get("topic") ?? "").trim();
  const published = formData.get("published") === "on";

  if (!id) return { status: "error", message: "Missing row." };
  if (!content) return { status: "error", message: "Content cannot be empty." };

  const supabase = await createClient();

  // Not a plain UPDATE: the main app revoked the table-wide UPDATE privilege
  // and granted only `generations.published`, so editing the text has to go
  // through a SECURITY DEFINER function that does its own admin check.
  const { error } = await supabase.rpc("admin_update_generation", {
    p_id: id,
    p_content: content,
    p_topic: topic || null,
    p_published: published,
  });

  if (error) return { status: "error", message: error.message };

  revalidatePath("/media");
  revalidatePath("/");
  return { status: "success", message: "Saved." };
}

export async function deleteMedia(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSuperadmin();

  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("generations").delete().eq("id", id);

  if (error) return { status: "error", message: error.message };

  revalidatePath("/media");
  revalidatePath("/");
  return { status: "success", message: "Deleted." };
}
