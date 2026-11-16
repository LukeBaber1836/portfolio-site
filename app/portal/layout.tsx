import type { Metadata } from "next";

import { AppShell, type NavGroup } from "@/components/app-shell/AppShell";
import { ImpersonationBanner } from "@/components/portal/ImpersonationBanner";
import { requireClient } from "@/lib/auth/guards";
import { portalOpenInvoiceCount } from "@/lib/dal/portal";

export const metadata: Metadata = { title: { default: "Client Portal · Luke Baber", template: "%s · Client Portal" } };
export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, client, impersonatedBy } = await requireClient();
  const openInvoices = await portalOpenInvoiceCount();

  // Settings lives in the avatar menu (AppShell footer) — not repeated here.
  const groups: NavGroup[] = [
    { items: [{ title: "Overview", href: "/portal", icon: "dashboard", exact: true }] },
    {
      label: "Your work",
      items: [
        { title: "Projects", href: "/portal/projects", icon: "projects" },
        { title: "Files", href: "/portal/files", icon: "files" },
        { title: "Requests", href: "/portal/requests", icon: "requests" },
      ],
    },
    {
      label: "Billing",
      items: [
        { title: "Invoices", href: "/portal/invoices", icon: "invoices", badge: openInvoices },
        { title: "Hours", href: "/portal/hours", icon: "hours" },
      ],
    },
  ];

  return (
    <AppShell
      area="Client Portal"
      groups={groups}
      user={user}
      banner={impersonatedBy ? <ImpersonationBanner clientName={client.company || client.name} userName={user.name} /> : undefined}
      topbar={<span className="truncate text-[13px] text-fg-3">{client.company || client.name}</span>}
    >
      {children}
    </AppShell>
  );
}
