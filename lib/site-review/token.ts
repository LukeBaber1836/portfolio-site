import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

// Review-toolbar tokens: a signed "this user may review this project" pass, handed to the client's
// site in the URL fragment by /portal/projects/[id]/review. The toolbar runs on another origin, so
// it can't use the portal session cookie. Each API call still re-checks the user and membership —
// the token only proves who opened the review, never what they're allowed to do today.

const TTL_SECONDS = 12 * 60 * 60;

type Payload = { p: string; u: string; exp: number };

// Derived (not reused verbatim) so a review token can never validate as anything else.
const key = () => createHmac("sha256", env.NEON_AUTH_COOKIE_SECRET).update("site-review-token:v1").digest();

const sign = (data: string) => createHmac("sha256", key()).update(data).digest("base64url");

export function createReviewToken(projectId: string, userId: string) {
  const payload: Payload = { p: projectId, u: userId, exp: Math.floor(Date.now() / 1000) + TTL_SECONDS };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function verifyReviewToken(token: string): { projectId: string; userId: string } | null {
  const [data, mac] = token.split(".");
  if (!data || !mac) return null;
  const expected = Buffer.from(sign(data));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as Payload;
    if (typeof payload.p !== "string" || typeof payload.u !== "string" || payload.exp * 1000 < Date.now()) return null;
    return { projectId: payload.p, userId: payload.u };
  } catch {
    return null;
  }
}
