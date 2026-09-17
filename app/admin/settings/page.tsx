import { CheckCircle2, CircleAlert } from "lucide-react";

import { SettingsForm } from "@/components/admin/SettingsForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/services/settings";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const settings = await getSettings();
  const testMode = env.STRIPE_SECRET_KEY.startsWith("sk_test_");
  const checks = [
    { label: "Stripe", ok: true, detail: testMode ? "Sandbox (test mode) — no real charges" : "Live mode" },
    { label: "Stripe webhooks", ok: !!env.STRIPE_WEBHOOK_SECRET, detail: env.STRIPE_WEBHOOK_SECRET ? "Signing secret configured" : "Missing STRIPE_WEBHOOK_SECRET" },
    { label: "Email sender", ok: !env.RESEND_FROM.includes("resend.dev"), detail: env.RESEND_FROM },
    { label: "Scheduled jobs", ok: !!env.CRON_SECRET, detail: env.CRON_SECRET ? "Reminders, timer alerts, weekly digests" : "Missing CRON_SECRET" },
  ];

  return (
    <>
      <PageHeader title="Settings" description="Defaults for billing and time tracking." />
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <SettingsForm settings={settings} />
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
            {checks.map((c) => (
              <li key={c.label} className="flex gap-3">
                {c.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" />}
                <div className="min-w-0">
                  <p className="text-sm text-white">{c.label}</p>
                  <p className="break-words text-xs text-white/45">{c.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
