import { FolderKanban } from "lucide-react";

import { ProjectCard } from "@/components/portal/ProjectCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { portalProjects } from "@/lib/dal/portal";

export const metadata = { title: "Projects" };

export default async function PortalProjectsPage() {
  const rows = await portalProjects();
  const current = rows.filter((r) => !["completed", "cancelled"].includes(r.project.status));
  const past = rows.filter((r) => ["completed", "cancelled"].includes(r.project.status));
  const card = (r: (typeof rows)[number]) => (
    <ProjectCard
      key={r.project.id}
      project={{ ...r.project, loggedSeconds: r.loggedSeconds, milestonesDone: r.milestonesDone, milestonesTotal: r.milestonesTotal }}
    />
  );

  return (
    <>
      <PageHeader title="Projects" description="Progress, milestones, and updates for everything we're working on." />
      {rows.length === 0 ? (
        <Card>
          <CardContent>
          <EmptyState icon={FolderKanban} title="No projects yet" />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-10">
          {current.length > 0 && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{current.map(card)}</div>}
          {past.length > 0 && (
            <section>
              <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-white/40">Completed</h2>
              <div className="grid gap-4 opacity-80 md:grid-cols-2 xl:grid-cols-3">{past.map(card)}</div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
