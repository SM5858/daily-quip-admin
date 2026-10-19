export type ActionState = {
  status: "idle" | "success" | "error";
  message: string;
  /** Filled by the "generate" intent so the form can show a draft. */
  content?: string;
};

export const idleState: ActionState = { status: "idle", message: "" };
