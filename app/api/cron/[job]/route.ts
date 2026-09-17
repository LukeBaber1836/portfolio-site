import { timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";
import { runInvoiceReminders, runTimerAlerts, runWeeklySummaries } from "@/lib/services/jobs";

// Vercel Cron calls these with `Authorization: Bearer $CRON_SECRET` (see vercel.json).
const JOBS = {
  "invoice-reminders": runInvoiceReminders,
  "timer-alerts": runTimerAlerts,
  "weekly-summary": () => runWeeklySummaries(),
} as const;

function authorized(request: Request) {
  const secret = env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function GET(request: Request, { params }: { params: Promise<{ job: string }> }) {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  const { job } = await params;
  const run = JOBS[job as keyof typeof JOBS];
  if (!run) return new Response("Not found", { status: 404 });
  try {
    const result = await run();
    return Response.json({ job, ok: true, ...result });
  } catch (err) {
    console.error(`[cron] ${job} failed`, err);
    return Response.json({ job, ok: false }, { status: 500 });
  }
}
