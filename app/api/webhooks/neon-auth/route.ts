import { createPublicKey, verify, type JsonWebKey } from "node:crypto";

import { emails } from "@/lib/email/messages";
import { sendEmail } from "@/lib/email/send";
import { env } from "@/lib/env";

// Branded delivery for Neon Auth emails (verification codes, reset links).
// Subscribing a branch's webhook to send.otp / send.magic_link makes Neon skip its
// default (white, Neon-branded) emails. Configure with the production HTTPS URL:
//   PUT /projects/{project}/branches/{branch}/auth/webhooks
//   { enabled: true, webhook_url: "https://lukebaber.com/api/webhooks/neon-auth",
//     enabled_events: ["send.otp", "send.magic_link"], timeout_seconds: 5 }

type Jwk = JsonWebKey & { kid: string };
let jwksCache: { keys: Jwk[]; fetchedAt: number } | null = null;

async function findKey(kid: string) {
  const fresh = jwksCache && Date.now() - jwksCache.fetchedAt < 10 * 60_000;
  let key = fresh ? jwksCache!.keys.find((k) => k.kid === kid) : undefined;
  if (!key) {
    // Unknown kid (or stale cache) → refetch once; handles key rotation.
    const res = await fetch(`${env.NEON_AUTH_BASE_URL}/.well-known/jwks.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
    jwksCache = { keys: (await res.json()).keys, fetchedAt: Date.now() };
    key = jwksCache.keys.find((k) => k.kid === kid);
  }
  return key;
}

async function verifySignature(rawBody: string, headers: Headers) {
  const signature = headers.get("x-neon-signature");
  const kid = headers.get("x-neon-signature-kid");
  const timestamp = headers.get("x-neon-timestamp");
  if (!signature || !kid || !timestamp) return false;
  if (Math.abs(Date.now() - Number(timestamp)) > 5 * 60_000) return false;

  const jwk = await findKey(kid);
  if (!jwk) return false;

  const [headerB64, emptyPayload, signatureB64] = signature.split(".");
  if (!headerB64 || emptyPayload !== "" || !signatureB64) return false;

  // Detached JWS with the timestamp bound into the payload (double base64url).
  const payloadB64 = Buffer.from(rawBody, "utf8").toString("base64url");
  const signingPayloadB64 = Buffer.from(`${timestamp}.${payloadB64}`, "utf8").toString("base64url");
  return verify(
    null,
    Buffer.from(`${headerB64}.${signingPayloadB64}`),
    createPublicKey({ key: jwk, format: "jwk" }),
    Buffer.from(signatureB64, "base64url"),
  );
}

type NeonAuthEvent = {
  event_id: string;
  event_type: string;
  user?: { email?: string; name?: string };
  event_data?: {
    otp_code?: string;
    otp_type?: string;
    link_type?: string;
    link_url?: string;
  };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  let valid = false;
  try {
    valid = await verifySignature(rawBody, request.headers);
  } catch (err) {
    console.error("[neon-auth webhook] verification error", err);
    return new Response("Verification unavailable", { status: 503 }); // retryable
  }
  if (!valid) return new Response("Invalid signature", { status: 401 });

  const event = JSON.parse(rawBody) as NeonAuthEvent;
  const to = event.user?.email;
  if (!to) return new Response("ok");

  if (event.event_type === "send.otp" && event.event_data?.otp_code) {
    const result = await sendEmail({
      to,
      content: emails.otp({ name: event.user?.name, code: event.event_data.otp_code, type: event.event_data.otp_type ?? "sign-in" }),
      // Retries reuse the event id, so Resend de-duplicates repeat deliveries.
      idempotencyKey: `neon-auth-${event.event_id}`,
    });
    // A failed send must fail the webhook so Neon retries (and surfaces an error to the user).
    return result.ok ? new Response("ok") : new Response("Email failed", { status: 502 });
  }

  if (event.event_type === "send.magic_link" && event.event_data?.link_url) {
    const reset = event.event_data.link_type === "forget-password";
    const result = await sendEmail({
      to,
      content: {
        subject: reset ? "Reset your portal password" : "Your sign-in link",
        preview: reset ? "Use this link to choose a new password." : "Use this link to sign in.",
        heading: reset ? "Reset your password" : "Sign in to your portal",
        greeting: `Hi ${event.user?.name?.split(" ")[0] || "there"},`,
        paragraphs: [reset ? "Click below to choose a new password. The link expires soon." : "Click below to sign in. The link expires soon."],
        cta: { label: reset ? "Reset password" : "Sign in", href: event.event_data.link_url },
        footnote: "If you didn't request this, you can safely ignore this email.",
      },
      idempotencyKey: `neon-auth-${event.event_id}`,
    });
    return result.ok ? new Response("ok") : new Response("Email failed", { status: 502 });
  }

  return new Response("ok");
}
