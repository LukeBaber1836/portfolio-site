import { ProjectCard } from "@/components/portal/ProjectCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionHeader } from "@/components/shared/SectionHeader";
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
      <PageHeader title="Projects" />
      {rows.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState title="No projects yet" description="Once we kick things off, your projects and progress will show up here." />
        </div>
      ) : (
        <div className="space-y-10">
          {current.length > 0 && <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{current.map(card)}</div>}
          {past.length > 0 && (
            <section>
              <SectionHeader title="Completed" count={past.length} />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{past.map(card)}</div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
