import "server-only";

import { Resend } from "resend";

import { env } from "@/lib/env";
import { BaseEmail, type BaseEmailProps } from "./templates/BaseEmail";

let resendClient: Resend | undefined;
const resend = () => (resendClient ??= new Resend(env.RESEND_TOKEN));

export type EmailContent = Omit<BaseEmailProps, "appUrl"> & { subject: string };

type SendOptions = {
  to: string | string[];
  content: EmailContent;
  replyTo?: string;
  idempotencyKey?: string;
};

/** Plain-text fallback generated from the same content as the HTML version. */
function toText(content: EmailContent) {
  return [
    content.heading,
    content.greeting,
    ...content.paragraphs,
    content.code ? `Code: ${content.code}` : undefined,
    ...(content.rows ?? []).map((r) => `${r.label}: ${r.value}`),
    content.cta ? `${content.cta.label}: ${content.cta.href}` : undefined,
    content.footnote,
    "— Luke Baber",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export type SendEmailResult =
  | { ok: true; id?: string; redirectedFrom?: string[] }
  | { ok: false };

/**
 * Sends a branded transactional email. Mail is redirected to ADMIN_EMAIL (with the
 * intended recipient in the subject) when the sender is Resend's sandbox domain,
 * or in development unless EMAIL_DELIVER_IN_DEV=true — so test clients never
 * receive real mail and bounces don't hurt the sending domain's reputation.
 * Failures are logged, never thrown — email must not break the action that triggered it.
 * The result reports when this happened, so the caller can tell the admin —
 * silently redirecting a real client invite/invoice with no visible indicator
 * looks exactly like a bug from the admin's side.
 */
export async function sendEmail({ to, content, replyTo, idempotencyKey }: SendOptions): Promise<SendEmailResult> {
  const recipients = Array.isArray(to) ? to : [to];
  const redirect =
    env.RESEND_FROM.includes("resend.dev") ||
    (process.env.NODE_ENV !== "production" && process.env.EMAIL_DELIVER_IN_DEV !== "true");
  const wasRedirected = redirect && recipients.join() !== env.ADMIN_EMAIL;
  const finalTo = redirect ? [env.ADMIN_EMAIL] : recipients;
  const subject = wasRedirected ? `[to: ${recipients.join(", ")}] ${content.subject}` : content.subject;

  try {
    const { data, error } = await resend().emails.send(
      {
        from: env.RESEND_FROM,
        to: finalTo,
        replyTo: replyTo ?? env.ADMIN_EMAIL,
        subject,
        react: BaseEmail({ ...content, appUrl: env.APP_URL }),
        text: toText(content),
      },
      idempotencyKey ? { idempotencyKey } : undefined,
    );
    if (error) {
      console.error("[email] Resend error:", error);
      return { ok: false };
    }
    return { ok: true, id: data?.id, redirectedFrom: wasRedirected ? recipients : undefined };
  } catch (err) {
    console.error("[email] send failed:", err);
    return { ok: false };
  }
}

/**
 * Human-readable suffix for an admin-facing success message ("Invite sent" etc.)
 * when one or more sendEmail() calls above got redirected to ADMIN_EMAIL instead
 * of reaching the real recipient. Empty string when nothing was redirected.
 */
export function emailRedirectNotice(results: (SendEmailResult | undefined)[]): string {
  const redirected = new Set<string>();
  for (const r of results) {
    if (r?.ok && r.redirectedFrom?.length) r.redirectedFrom.forEach((email) => redirected.add(email));
  }
  if (redirected.size === 0) return "";
  return ` — dev mode sent it to you instead of ${[...redirected].join(", ")} (set EMAIL_DELIVER_IN_DEV=true in .env.local to send for real locally; this resolves automatically once deployed)`;
}
