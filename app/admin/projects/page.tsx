import Link from "next/link";
import { Suspense } from "react";

import { NewProjectDialog } from "@/components/admin/NewProjectDialog";
import { ProjectsList } from "@/components/admin/ProjectsList";
import { PageHeader } from "@/components/shared/PageHeader";
import { SlidingTabs } from "@/components/shared/SlidingTabs";
import { Button } from "@/components/ui/button";
import { listClientOptions } from "@/lib/dal/admin/clients";
import { listProjects } from "@/lib/dal/admin/projects";
import { getSettings } from "@/lib/services/settings";

export const metadata = { title: "Projects" };

const FILTERS = {
  active: ["planned", "in_progress", "review", "on_hold"],
  completed: ["completed"],
  all: null,
} as const;

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view: rawView } = await searchParams;
  const view = (rawView && rawView in FILTERS ? rawView : "active") as keyof typeof FILTERS;
  const [rows, clients, settings] = await Promise.all([listProjects(), listClientOptions(), getSettings()]);
  const allowed = FILTERS[view] as readonly string[] | null;
  const filtered = allowed ? rows.filter((r) => allowed.includes(r.project.status)) : rows;

  return (
    <>
      <PageHeader
        title="Projects"
        actions={
          <Suspense>
            <NewProjectDialog clients={clients} defaultRateCents={settings.defaultRateCents} />
          </Suspense>
        }
      />
      <div className="mb-4">
        <SlidingTabs
          value={view}
          items={[
            { value: "active", label: "Active", href: "/admin/projects" },
            { value: "completed", label: "Completed", href: "/admin/projects?view=completed" },
            { value: "all", label: "All", href: "/admin/projects?view=all" },
          ]}
        />
      </div>
      <ProjectsList
        rows={filtered}
        showClient
        emptyAction={
          !clients.length ? (
            <Button asChild size="sm">
              <Link href="/admin/clients/new">Add a client first</Link>
            </Button>
          ) : undefined
        }
      />
    </>
  );
}
