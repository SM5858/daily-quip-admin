"use client";

import { useActionState } from "react";
import { setSuperadmin } from "@/app/users/actions";
import { idleState } from "@/lib/action-state";

export default function PromoteButton({
  id,
  isAdmin,
  isSelf,
}: {
  id: string;
  isAdmin: boolean;
  isSelf: boolean;
}) {
  const [state, formAction, pending] = useActionState(setSuperadmin, idleState);

  if (isSelf) {
    return <span className="text-xs text-muted">that&rsquo;s you</span>;
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="value" value={String(!isAdmin)} />
      <button
        type="submit"
        disabled={pending}
        className={`rounded-lg border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
          isAdmin
            ? "border-line text-muted hover:text-danger"
            : "border-accent text-accent hover:bg-accent-soft"
        }`}
      >
        {pending ? "…" : isAdmin ? "Revoke admin" : "Make admin"}
      </button>
      {state.status === "error" && (
        <span className="text-xs text-danger">{state.message}</span>
      )}
    </form>
  );
}
