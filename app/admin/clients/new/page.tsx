import { ClientForm } from "@/components/admin/ClientForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
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
        description="Add a client, create their Stripe customer, and invite them to the portal in one step."
      />
      <Card className="max-w-3xl">
        <CardContent>
          <ClientForm defaults={{ rateCents: settings.defaultRateCents, termsDays: settings.defaultTermsDays, storageUrl: env.STORAGE_URL }} />
        </CardContent>
      </Card>
    </>
  );
}
