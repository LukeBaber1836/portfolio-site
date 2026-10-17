import "server-only";

import { z } from "zod";

import { UserError } from "@/lib/actions";
import { isAllowedOrigin, reviewerFromToken, type Reviewer } from "@/lib/site-review/service";

// CORS + auth wrapper for the review API. Requests carry `Authorization: Bearer <token>` and never
// cookies, so the origin is echoed only after the token resolves to a project that owns it.

const baseHeaders = {
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "600",
  Vary: "Origin",
  "Cache-Control": "no-store",
};

/** Preflight carries no Authorization header, so it can't be checked yet — the real request is. */
export function preflight(req: Request) {
  const origin = req.headers.get("origin");
  return new Response(null, { status: 204, headers: { ...baseHeaders, ...(origin ? { "Access-Control-Allow-Origin": origin } : {}) } });
}

const json = (body: unknown, status: number, origin: string | null) =>
  Response.json(body, { status, headers: { ...baseHeaders, ...(origin ? { "Access-Control-Allow-Origin": origin } : {}) } });

export async function withReviewer(req: Request, fn: (r: Reviewer) => Promise<unknown>) {
  const origin = req.headers.get("origin");
  try {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
    const reviewer = await reviewerFromToken(token);
    // Unknown origin and bad token look identical from outside.
    if (!reviewer) return json({ error: "Your review link has expired. Open it again from your portal." }, 401, origin);
    if (!isAllowedOrigin(origin, reviewer.project)) return json({ error: "This site isn't linked to the project." }, 403, null);
    const data = await fn(reviewer);
    return json(data ?? { ok: true }, 200, origin);
  } catch (err) {
    if (err instanceof UserError) return json({ error: err.message }, 400, origin);
    if (err instanceof z.ZodError) return json({ error: "That request wasn't valid." }, 400, origin);
    console.error("[site-review]", err);
    return json({ error: "Something went wrong. Please try again." }, 500, origin);
  }
}

const doc = z.object({ type: z.literal("doc"), content: z.array(z.unknown()).optional() });

export const newCommentSchema = z.object({
  pagePath: z.string().startsWith("/").max(500),
  selector: z.string().max(2000).nullable(),
  offsetX: z.number().min(0).max(1).nullable(),
  offsetY: z.number().min(0).max(1).nullable(),
  docX: z.number().min(0).max(1),
  docY: z.number().min(0).max(1_000_000),
  viewport: z.enum(["desktop", "tablet", "mobile"]),
  body: doc,
});

export const patchCommentSchema = z
  .object({ body: doc.optional(), status: z.enum(["open", "resolved"]).optional() })
  .refine((v) => v.body || v.status, "Nothing to change");
