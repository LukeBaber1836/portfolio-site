import { InvoicesTable } from "@/components/admin/InvoicesTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { portalInvoices } from "@/lib/dal/portal";

export const metadata = { title: "Invoices" };

export default async function PortalInvoicesPage() {
  const invoices = await portalInvoices();

  return (
    <>
      <PageHeader
        title="Invoices"
      />
      <Card>
        <CardContent className="p-0">
        <InvoicesTable rows={invoices.map((invoice) => ({ invoice }))} hrefBase="/portal/invoices" />
        </CardContent>
      </Card>
    </>
  );
}
