import "server-only";

import { env } from "@/lib/env";
import { formatDate, formatHours, formatMoney } from "@/lib/format";
import type { EmailContent } from "./send";

const firstName = (name?: string | null) => name?.trim().split(/\s+/)[0] || "there";
const url = (path: string) => `${env.APP_URL}${path}`;

export const emails = {
  invite(p: { name: string; email: string; company?: string | null }): EmailContent {
    return {
      subject: "Your client portal is ready",
      preview: "Set up your password to see project status, hours, and invoices.",
      heading: "Welcome to your client portal",
      greeting: `Hi ${firstName(p.name)},`,
      paragraphs: [
        `I've set up a private portal${p.company ? ` for ${p.company}` : ""} where you can follow project progress, see the hours I log, and view or pay invoices.`,
        "Click below to create your password — we'll email you a 6-digit code to confirm it's you. You can also sign in with Google using this email address.",
      ],
      cta: { label: "Set up my account", href: url(`/accept-invite?email=${encodeURIComponent(p.email)}`) },
      footnote: `This invite was sent to ${p.email}. If you weren't expecting it, you can ignore this email.`,
    };
  },

  otp(p: { name?: string | null; code: string; type: string }): EmailContent {
    const purpose =
      p.type === "forget-password"
        ? "reset your password"
        : p.type === "email-verification"
          ? "verify your email"
          : "sign in";
    return {
      subject: `${p.code} is your verification code`,
      preview: `Use this code to ${purpose}.`,
      heading: "Your verification code",
      greeting: `Hi ${firstName(p.name)},`,
      paragraphs: [`Use this code to ${purpose}. It expires in 10 minutes.`],
      code: p.code,
      footnote: "If you didn't request this, you can safely ignore this email — your account is unchanged.",
    };
  },

  invoiceSent(p: {
    name: string;
    number: string | null;
    totalCents: number;
    dueDate: string | null;
    invoiceId: string;
    hostedUrl: string | null;
  }): EmailContent {
    return {
      subject: `New invoice ${p.number ?? ""} — ${formatMoney(p.totalCents)}`.replace("  ", " "),
      preview: `Invoice for ${formatMoney(p.totalCents)}, due ${formatDate(p.dueDate)}.`,
      heading: "You have a new invoice",
      greeting: `Hi ${firstName(p.name)},`,
      paragraphs: [
        "A new invoice is ready in your portal. You can see exactly which hours and items it covers, and pay securely by card or bank transfer.",
      ],
      rows: [
        { label: "Invoice", value: p.number ?? "—" },
        { label: "Due", value: formatDate(p.dueDate) },
        { label: "Amount due", value: formatMoney(p.totalCents), strong: true },
      ],
      cta: { label: "View & pay invoice", href: url(`/portal/invoices/${p.invoiceId}`) },
      footnote: p.hostedUrl ? `Prefer to pay directly? ${p.hostedUrl}` : undefined,
    };
  },

  paymentThanks(p: { name: string; number: string | null; amountCents: number; invoiceId: string }): EmailContent {
    return {
      subject: `Payment received — thank you!`,
      preview: `We received ${formatMoney(p.amountCents)} for invoice ${p.number ?? ""}.`,
      heading: "Payment received — thank you!",
      greeting: `Hi ${firstName(p.name)},`,
      paragraphs: ["Your payment has been received. I really appreciate your business."],
      rows: [
        { label: "Invoice", value: p.number ?? "—" },
        { label: "Amount paid", value: formatMoney(p.amountCents), strong: true },
      ],
      cta: { label: "View receipt", href: url(`/portal/invoices/${p.invoiceId}`) },
    };
  },

  paymentReceivedAdmin(p: { client: string; number: string | null; amountCents: number; invoiceId: string }): EmailContent {
    return {
      subject: `${p.client} paid ${formatMoney(p.amountCents)}`,
      preview: `Invoice ${p.number ?? ""} was paid.`,
      heading: "Payment received",
      paragraphs: [`${p.client} paid invoice ${p.number ?? ""}.`],
      rows: [{ label: "Amount", value: formatMoney(p.amountCents), strong: true }],
      cta: { label: "Open invoice", href: url(`/admin/invoices/${p.invoiceId}`) },
    };
  },

  invoiceReminder(p: {
    name: string;
    number: string | null;
    amountDueCents: number;
    dueDate: string | null;
    overdue: boolean;
    invoiceId: string;
  }): EmailContent {
    return {
      subject: p.overdue
        ? `Invoice ${p.number ?? ""} is past due`
        : `Reminder: invoice ${p.number ?? ""} is due ${formatDate(p.dueDate)}`,
      preview: `${formatMoney(p.amountDueCents)} due ${formatDate(p.dueDate)}.`,
      heading: p.overdue ? "Friendly reminder: invoice past due" : "Friendly invoice reminder",
      greeting: `Hi ${firstName(p.name)},`,
      paragraphs: [
        p.overdue
          ? "Just a quick note that this invoice is now past its due date. If you've already sent payment, thank you — please disregard this message."
          : "Just a quick reminder that this invoice is coming due soon.",
      ],
      rows: [
        { label: "Invoice", value: p.number ?? "—" },
        { label: "Due", value: formatDate(p.dueDate) },
        { label: "Amount due", value: formatMoney(p.amountDueCents), strong: true },
      ],
      cta: { label: "Pay invoice", href: url(`/portal/invoices/${p.invoiceId}`) },
    };
  },

  projectUpdate(p: { name: string; projectName: string; body: string; projectId: string }): EmailContent {
    return {
      subject: `Update on ${p.projectName}`,
      preview: p.body.slice(0, 120),
      heading: `Update: ${p.projectName}`,
      greeting: `Hi ${firstName(p.name)},`,
      paragraphs: p.body.split(/\n{2,}/),
      cta: { label: "View project", href: url(`/portal/projects/${p.projectId}`) },
      footnote: "You can turn off project update emails in your portal settings.",
    };
  },

  milestoneDone(p: { name: string; projectName: string; milestone: string; projectId: string }): EmailContent {
    return {
      subject: `Milestone complete: ${p.milestone}`,
      preview: `${p.projectName} just hit a milestone.`,
      heading: "Milestone complete",
      greeting: `Hi ${firstName(p.name)},`,
      paragraphs: [`“${p.milestone}” on ${p.projectName} is done.`],
      cta: { label: "See progress", href: url(`/portal/projects/${p.projectId}`) },
      footnote: "You can turn off project update emails in your portal settings.",
    };
  },

  referencesShared(p: { name: string; projectName: string; projectId: string; count: number }): EmailContent {
    return {
      subject: `${p.count === 1 ? "A new reference" : `${p.count} new references`} to review on ${p.projectName}`,
      preview: "Links and notes I'd like your take on.",
      heading: "New references to review",
      greeting: `Hi ${firstName(p.name)},`,
      paragraphs: [
        `I've shared ${p.count === 1 ? "something" : `${p.count} things`} for you to look at on ${p.projectName} — reference links and notes I'd like your take on. Open the project to preview each link and approve the ones you like.`,
      ],
      cta: { label: "Review references", href: url(`/portal/projects/${p.projectId}`) },
      footnote: "You can turn off project update emails in your portal settings.",
    };
  },

  referenceResponded(p: {
    from: string;
    client: string;
    projectName: string;
    projectId: string;
    title: string;
    approved: boolean;
  }): EmailContent {
    return {
      subject: `${p.client} ${p.approved ? "approved" : "declined"} “${p.title}”`,
      preview: `${p.from} responded on ${p.projectName}.`,
      heading: p.approved ? "Reference approved" : "Reference declined",
      paragraphs: [`${p.from} (${p.client}) ${p.approved ? "approved" : "declined"} “${p.title}” on ${p.projectName}.`],
      cta: { label: "Open project", href: url(`/admin/projects/${p.projectId}`) },
    };
  },

  weeklySummary(p: {
    name: string;
    weekLabel: string;
    rows: { project: string; seconds: number }[];
    totalSeconds: number;
  }): EmailContent {
    return {
      subject: `Your weekly summary — ${formatHours(p.totalSeconds)} logged`,
      preview: `Here's what I worked on for you ${p.weekLabel}.`,
      heading: "Your weekly summary",
      greeting: `Hi ${firstName(p.name)},`,
      paragraphs: [`Here's the time I logged on your projects ${p.weekLabel}.`],
      rows: [
        ...p.rows.map((r) => ({ label: r.project, value: formatHours(r.seconds) })),
        { label: "Total", value: formatHours(p.totalSeconds), strong: true },
      ],
      cta: { label: "See the details", href: url("/portal/hours") },
      footnote: "You can turn off weekly summaries in your portal settings.",
    };
  },

  timerAlert(p: { projectName: string; clientName: string; hours: number }): EmailContent {
    return {
      subject: `Your timer has been running ${Math.floor(p.hours)}h`,
      preview: `${p.projectName} (${p.clientName}) — did you forget to clock out?`,
      heading: "Timer still running",
      paragraphs: [
        `Your timer on ${p.projectName} for ${p.clientName} has been running for about ${Math.floor(p.hours)} hours. Did you forget to clock out?`,
      ],
      cta: { label: "Open timer", href: url("/admin/time") },
    };
  },

  clientRequest(p: { client: string; from: string; title: string; body: string; service: string }): EmailContent {
    return {
      subject: `New request from ${p.client}: ${p.title}`,
      preview: p.body.slice(0, 120),
      heading: "New client request",
      paragraphs: [`${p.from} (${p.client}) submitted a request:`, `“${p.title}”`, ...p.body.split(/\n{2,}/)],
      rows: [{ label: "Service", value: p.service }],
      cta: { label: "Open requests", href: url("/admin/requests") },
    };
  },
};
