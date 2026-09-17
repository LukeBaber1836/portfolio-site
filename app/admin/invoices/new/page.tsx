import { InvoiceBuilder } from "@/components/admin/InvoiceBuilder";
import { PageHeader } from "@/components/shared/PageHeader";
import { listClients } from "@/lib/dal/admin/clients";
import { getSettings } from "@/lib/services/settings";

export const metadata = { title: "New invoice" };

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { client } = await searchParams;
  const [rows, settings] = await Promise.all([listClients(), getSettings()]);
  const clients = rows
    .filter((r) => r.client.status === "active")
    .map(({ client: c }) => ({
      id: c.id,
      name: c.name,
      company: c.company,
      termsDays: c.termsDays ?? settings.defaultTermsDays,
      rateCents: c.defaultRateCents ?? settings.defaultRateCents,
    }));

  return (
    <>
      <PageHeader
        back={{ href: "/admin/invoices", label: "Invoices" }}
        title="New invoice"
        description="Pick unbilled hours and add any fixed charges. A draft is created in Stripe for you to review before sending."
      />
      <InvoiceBuilder clients={clients} initialClientId={client} roundingMinutes={settings.roundingMinutes} defaultRateCents={settings.defaultRateCents} />
    </>
  );
}
