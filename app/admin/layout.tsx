import type { Metadata } from "next";

import { AppShell, type NavGroup } from "@/components/app-shell/AppShell";
import { TimerBar } from "@/components/admin/TimerBar";
import { requireAdmin } from "@/lib/auth/guards";
import { newRequestCount } from "@/lib/dal/admin/dashboard";
import { listProjectOptions } from "@/lib/dal/admin/projects";
import { getRunningTimer } from "@/lib/dal/admin/time";

export const metadata: Metadata = { title: { default: "Admin · Luke Baber", template: "%s · Admin" } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin();
  const [running, projects, requests] = await Promise.all([getRunningTimer(), listProjectOptions(), newRequestCount()]);

  // Settings lives in the avatar menu (AppShell footer) — not repeated here.
  const groups: NavGroup[] = [
    {
      items: [
        { title: "Dashboard", href: "/admin", icon: "dashboard", exact: true },
        { title: "Clients", href: "/admin/clients", icon: "clients" },
        { title: "Projects", href: "/admin/projects", icon: "projects" },
        { title: "Time", href: "/admin/time", icon: "time" },
        { title: "Invoices", href: "/admin/invoices", icon: "invoices" },
        { title: "Requests", href: "/admin/requests", icon: "requests", badge: requests },
      ],
    },
  ];

  return (
    <AppShell
      area="Admin"
      groups={groups}
      user={user}
      topbar={
        <TimerBar
          running={
            running
              ? {
                  id: running.entry.id,
                  startedAt: running.entry.startedAt.toISOString(),
                  description: running.entry.description,
                  projectName: running.projectName,
                  clientName: running.clientCompany || running.clientName,
                }
              : null
          }
          projects={projects}
        />
      }
    >
      {children}
    </AppShell>
  );
}
