import { render } from "@react-email/components";

import { emails } from "@/lib/email/messages";
import { BaseEmail } from "@/lib/email/templates/BaseEmail";
import { env } from "@/lib/env";

// Development-only visual preview of every transactional template: /api/dev/email-preview?t=invite
const SAMPLES = {
  invite: () => emails.invite({ name: "Sarah Jones", email: "sarah@acme.com", company: "Acme Landscaping" }),
  otp: () => emails.otp({ name: "Sarah Jones", code: "482913", type: "forget-password" }),
  invoice: () =>
    emails.invoiceSent({ name: "Sarah Jones", number: "LB-0012", totalCents: 72500, dueDate: "2026-09-28", invoiceId: "demo", hostedUrl: null }),
  paid: () => emails.paymentThanks({ name: "Sarah Jones", number: "LB-0012", amountCents: 72500, invoiceId: "demo" }),
  reminder: () =>
    emails.invoiceReminder({ name: "Sarah Jones", number: "LB-0012", amountDueCents: 72500, dueDate: "2026-09-10", overdue: true, invoiceId: "demo" }),
  update: () =>
    emails.projectUpdate({
      name: "Sarah Jones",
      projectName: "Website redesign",
      body: "The new homepage is live on staging.\n\nNext up: the services pages and contact form.",
      projectId: "demo",
    }),
  weekly: () =>
    emails.weeklySummary({
      name: "Sarah Jones",
      weekLabel: "last week (Sep 7–13)",
      rows: [
        { project: "Website redesign", seconds: 34200 },
        { project: "Booking automation", seconds: 7200 },
      ],
      totalSeconds: 41400,
    }),
  timer: () => emails.timerAlert({ projectName: "Website redesign", clientName: "Acme", hours: 9.2 }),
};

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
  const key = (new URL(request.url).searchParams.get("t") ?? "invite") as keyof typeof SAMPLES;
  const build = SAMPLES[key] ?? SAMPLES.invite;
  const { subject: _subject, ...content } = build();
  const html = await render(BaseEmail({ ...content, appUrl: env.APP_URL }));
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
