const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Tried in order. Google's flash models go 503 "high demand" fairly often on
 * the free tier, so a second model is kept as a fallback rather than failing
 * the user's generation.
 */
const FALLBACK_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash"];

/** A bare model id, e.g. `gemini-3.6-flash`. */
const MODEL_ID = /^[a-z0-9][a-z0-9.\-]*$/i;

/**
 * The model name goes straight into the request path, so a stray quote or a
 * `models/` prefix in the environment variable produces
 * "unexpected model name format" from Google. Clean up the common paste
 * mistakes, and ignore the value outright if it still does not look like a
 * model id — a misconfigured variable should not take the feature down when
 * there are working defaults to fall back to.
 */
function normalizeModel(raw: string | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^models\//, "")
    .trim();
  return MODEL_ID.test(cleaned) ? cleaned : null;
}

/** Server-only. The key has no NEXT_PUBLIC_ prefix, so it stays on the server. */
function modelChain() {
  const preferred = normalizeModel(process.env.GEMINI_MODEL);
  return preferred
    ? [preferred, ...FALLBACK_MODELS.filter((m) => m !== preferred)]
    : FALLBACK_MODELS;
}

/**
 * The exact text sent to the model. It is stored alongside every generation so
 * the prompt behind each caption is auditable.
 */
export function buildPrompt(topic: string, steer: string | null) {
  const angle = steer?.trim()
    ? `\nThe writer wants this angle: "${steer.trim()}"\n`
    : "\n";

  return `You write short, funny captions for a Columbia University student community in New York City. The readers are undergrads: sleep-deprived, extremely online, half of them new to the city.

Today's topic: "${topic}"${angle}
Write ONE caption:
- one or two sentences, under 180 characters
- specific and observational, not a generic joke
- no hashtags, no surrounding quotation marks, at most one emoji
- good-natured; never target a real, named person

Reply with the caption text and nothing else.`;
}

type GeminiResponse = {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
  error?: { code?: number; message?: string };
};

async function callModel(model: string, prompt: string) {
  const response = await fetch(`${ENDPOINT}/${model}:generateContent`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY as string,
    },
    cache: "no-store",
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 1.1,
        maxOutputTokens: 1000,
        candidateCount: 1,
        // Gemini thinks before answering, and that thinking counts against
        // maxOutputTokens. Without this the response can come back empty.
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  const payload = (await response.json()) as GeminiResponse;
  return { ok: response.ok, status: response.status, payload };
}

export async function generateCaption(
  prompt: string
): Promise<{ text: string; model: string }> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "Missing GEMINI_API_KEY. Add it to .env.local and to the Vercel project settings."
    );
  }

  let lastError = "The AI call failed.";

  for (const model of modelChain()) {
    const { ok, status, payload } = await callModel(model, prompt);

    if (!ok) {
      lastError = payload.error?.message ?? `Gemini returned ${status}.`;

      // 429/503 mean "busy or rate limited", and 404/400-about-the-model mean
      // this particular model is unusable -- both are worth trying the next
      // one. Anything else (bad key, bad prompt) fails the same way for all.
      const modelIsTheProblem =
        status === 404 || /model/i.test(lastError);
      if (status === 429 || status === 503 || modelIsTheProblem) continue;

      throw new Error(lastError.slice(0, 300));
    }

    if (payload.promptFeedback?.blockReason) {
      throw new Error(
        `Gemini blocked that prompt (${payload.promptFeedback.blockReason}). Try another angle.`
      );
    }

    const candidate = payload.candidates?.[0];
    const text = (candidate?.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("")
      .trim();

    if (text) {
      // Models sometimes wrap the answer in quotes despite being told not to.
      return { text: text.replace(/^["“']|["”']$/g, "").trim(), model };
    }

    lastError = `Gemini returned no text (finishReason: ${
      candidate?.finishReason ?? "unknown"
    }).`;
  }

  throw new Error(lastError.slice(0, 300));
}
