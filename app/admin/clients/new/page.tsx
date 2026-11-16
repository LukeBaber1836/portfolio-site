import { ClientForm } from "@/components/admin/ClientForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { requireAdmin } from "@/lib/auth/guards";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/services/settings";

export const metadata = { title: "New client" };

export default async function NewClientPage() {
  await requireAdmin();
  const settings = await getSettings();
  return (
    <>
      <PageHeader
        back={{ href: "/admin/clients", label: "Clients" }}
        title="New client"
        description="Creates their Stripe customer and, optionally, a portal invite."
      />
      <div className="max-w-2xl">
        <ClientForm defaults={{ rateCents: settings.defaultRateCents, termsDays: settings.defaultTermsDays, storageUrl: env.STORAGE_URL }} />
      </div>
    </>
  );
}
