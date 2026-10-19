"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSuperadmin } from "@/lib/auth";
import type { ActionState } from "@/lib/action-state";

/**
 * Promote or demote another admin. The function refuses to remove your own
 * access, which is the one move that could lock everybody out.
 */
export async function setSuperadmin(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSuperadmin();

  const id = String(formData.get("id") ?? "");
  const value = formData.get("value") === "true";

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_superadmin", {
    p_user: id,
    p_value: value,
  });

  if (error) return { status: "error", message: error.message };

  revalidatePath("/users");
  return {
    status: "success",
    message: value ? "Promoted." : "Demoted.",
  };
}
