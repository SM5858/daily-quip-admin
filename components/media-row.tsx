"use client";

import { useActionState, useState } from "react";
import { deleteMedia, updateMedia } from "@/app/media/actions";
import { idleState } from "@/lib/action-state";
import { Badge } from "@/components/ui";
import { formatDateTime } from "@/lib/date";
import type { Scored } from "@/lib/stats";

const field =
  "w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-accent";

export default function MediaRow({
  item,
  author,
}: {
  item: Scored;
  author: string;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saveState, saveAction] = useActionState(updateMedia, idleState);
  const [deleteState, deleteAction] = useActionState(deleteMedia, idleState);

  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
        {item.published ? (
          <Badge tone="ok">published</Badge>
        ) : (
          <Badge tone="warn">draft</Badge>
        )}
        {item.is_house ? <Badge tone="accent">house</Badge> : null}
        <span>{author}</span>
        <span>·</span>
        <span>{formatDateTime(item.created_at)}</span>
        <span className="ml-auto font-semibold tabular-nums text-foreground">
          {item.score > 0 ? `+${item.score}` : item.score}
          <span className="ml-2 font-normal text-muted">
            {item.upvotes}↑ {item.downvotes}↓
          </span>
        </span>
      </div>

      {editing ? (
        <form action={saveAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={item.id} />
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Topic
            <input name="topic" defaultValue={item.topic} className={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Caption
            <textarea
              name="content"
              rows={3}
              defaultValue={item.content}
              className={field}
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                name="published"
                defaultChecked={item.published}
              />
              published
            </label>
            <button
              type="submit"
              className="h-9 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-contrast transition-opacity hover:opacity-90"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="h-9 rounded-lg border border-line px-4 text-sm font-medium transition-colors hover:bg-surface-2"
            >
              Cancel
            </button>
            {saveState.message && (
              <span
                className={`text-xs ${
                  saveState.status === "error" ? "text-danger" : "text-ok"
                }`}
              >
                {saveState.message}
              </span>
            )}
          </div>
        </form>
      ) : (
        <>
          <p className="text-sm leading-6">{item.content}</p>
          <p className="mt-2 text-xs text-muted">{item.topic}</p>

          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-muted hover:text-foreground">
              prompt &amp; model
            </summary>
            <div className="mt-2 rounded-lg bg-surface-2 p-3">
              {item.user_input && (
                <p className="mb-2 text-xs text-muted">
                  <span className="font-semibold">Angle:</span> {item.user_input}
                </p>
              )}
              <pre className="whitespace-pre-wrap font-mono text-[11px] leading-5 text-muted">
                {item.prompt}
              </pre>
              <p className="mt-2 text-xs text-muted">model: {item.model}</p>
            </div>
          </details>

          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs font-medium text-accent hover:underline"
            >
              Edit
            </button>

            {confirming ? (
              <form action={deleteAction} className="flex items-center gap-2">
                <input type="hidden" name="id" value={item.id} />
                <span className="text-xs text-muted">Delete for good?</span>
                <button
                  type="submit"
                  className="text-xs font-semibold text-danger hover:underline"
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="text-xs text-muted hover:underline"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="text-xs text-muted hover:text-danger"
              >
                Delete
              </button>
            )}

            {deleteState.message && (
              <span className="text-xs text-danger">{deleteState.message}</span>
            )}
          </div>
        </>
      )}
    </li>
  );
}
