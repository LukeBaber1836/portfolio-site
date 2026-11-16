import { SettingsForm } from "@/components/admin/SettingsForm";
import { SettingsSection } from "@/components/admin/SettingsSection";
import { SiteReviewDocs } from "@/components/admin/SiteReviewDocs";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/ui/badge";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/services/settings";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const settings = await getSettings();
  const testMode = env.STRIPE_SECRET_KEY.startsWith("sk_test_");
  const checks = [
    { label: "Stripe", ok: true, detail: testMode ? "Test mode — no real charges" : "Live mode" },
    { label: "Stripe webhooks", ok: !!env.STRIPE_WEBHOOK_SECRET, detail: env.STRIPE_WEBHOOK_SECRET ? "Signing secret configured" : "Missing STRIPE_WEBHOOK_SECRET" },
    { label: "Email sender", ok: !env.RESEND_FROM.includes("resend.dev"), detail: env.RESEND_FROM },
    { label: "Scheduled jobs", ok: !!env.CRON_SECRET, detail: env.CRON_SECRET ? "Reminders, timer alerts, weekly digests" : "Missing CRON_SECRET" },
  ];

  return (
    <>
      <PageHeader title="Settings" />
      <div className="max-w-4xl">
        <SettingsForm settings={settings} />

        <SettingsSection title="Integrations" description="Read from environment variables.">
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[13px] text-white">{c.label}</p>
                  <p className="break-words text-xs text-fg-3">{c.detail}</p>
                </div>
                <StatusBadge tone={c.ok ? "success" : "danger"} label={c.ok ? "Connected" : "Needs setup"} />
              </li>
            ))}
          </ul>
        </SettingsSection>

        <SettingsSection id="site-review" title="Site review toolbar" description="Lets clients pin comments directly on the sites you build.">
          <SiteReviewDocs devOrigin={process.env.NODE_ENV === "development" ? env.APP_URL : null} />
        </SettingsSection>
      </div>
    </>
  );
}
