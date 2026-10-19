"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createMedia } from "@/app/media/actions";
import { idleState } from "@/lib/action-state";
import type { DailyPrompt } from "@/lib/types";

function Button({
  intent,
  idle,
  busy,
  variant = "primary",
}: {
  intent: string;
  idle: string;
  busy: string;
  variant?: "primary" | "ghost";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      disabled={pending}
      className={
        variant === "primary"
          ? "h-10 rounded-lg bg-accent px-5 text-sm font-semibold text-accent-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
          : "h-10 rounded-lg border border-line px-4 text-sm font-medium transition-colors hover:bg-surface-2 disabled:opacity-50"
      }
    >
      {pending ? busy : idle}
    </button>
  );
}

const field =
  "w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-accent";

export default function MediaCreate({ prompts }: { prompts: DailyPrompt[] }) {
  const [state, formAction] = useActionState(createMedia, idleState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-xs font-medium">
          Topic
          <input
            name="topic"
            required
            list="topics"
            placeholder="Pick a scheduled topic or write your own"
            className={field}
          />
          <datalist id="topics">
            {prompts.map((prompt) => (
              <option key={prompt.id} value={prompt.topic} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-medium">
          Attach to a scheduled day
          <select name="daily_prompt_id" defaultValue="" className={field}>
            <option value="">— none —</option>
            {prompts.map((prompt) => (
              <option key={prompt.id} value={prompt.id}>
                {prompt.prompt_date} · {prompt.topic.slice(0, 40)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-xs font-medium">
        Angle for the model (optional)
        <input
          name="user_input"
          placeholder="deadpan · as a Yelp review · from a tourist's view"
          className={field}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-medium">
        Caption
        <textarea
          name="content"
          rows={3}
          key={state.content ?? ""}
          defaultValue={state.content ?? ""}
          placeholder="Press Generate, or write one yourself."
          className={field}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button intent="generate" idle="Generate with Gemini" busy="Writing…" variant="ghost" />
        <Button intent="save" idle="Create caption" busy="Saving…" />
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" name="published" defaultChecked />
          publish immediately
        </label>
        {state.message && (
          <span
            className={`text-xs ${
              state.status === "error" ? "text-danger" : "text-ok"
            }`}
          >
            {state.message}
          </span>
        )}
      </div>
      <p className="text-xs text-muted">
        Saved as a house caption: no author, so anyone on the board may vote on
        it. The exact prompt sent to the model is stored with the row.
      </p>
    </form>
  );
}
