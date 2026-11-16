import { notFound } from "next/navigation";
import { ArrowUpRight, CheckCircle2, Circle, CircleDot } from "lucide-react";

import { PortalTimeTable } from "@/components/portal/PortalTimeTable";
import { ReferenceCard } from "@/components/portal/ReferenceCard";
import { SiteHeroCard } from "@/components/portal/SiteHeroCard";
import { SocialLinksCard } from "@/components/portal/SocialLinksCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { RailSection } from "@/components/shared/PropertyList";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { statusBadgeFor } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { requireClient } from "@/lib/auth/guards";
import { portalProject } from "@/lib/dal/portal";
import { formatDate, formatDateTime, formatHours } from "@/lib/format";
import { featuredSiteOf, hostOf } from "@/lib/references/preview";
import { PROJECT_STATUS, serviceLabel } from "@/lib/status";
import { CLOSED_PROJECT_STATUSES } from "@/lib/upload/kinds";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "planned", label: "Scheduled" },
  { key: "in_progress", label: "In progress" },
  { key: "review", label: "Your review" },
  { key: "completed", label: "Complete" },
];

const isUuid = (s: string) => /^[0-9a-f-]{36}$/.test(s);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = isUuid(id) ? await portalProject(id) : null;
  return { title: data?.project.name ?? "Project" };
}

export default async function PortalProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Unknown or other clients' projects both 404 — never reveal that an id exists.
  if (!isUuid(id)) notFound();
  const [data, { client }] = await Promise.all([portalProject(id), requireClient()]);
  if (!data) notFound();
  const { project, milestones, updates, entries, references, loggedSeconds } = data;
  const stepIndex = STEPS.findIndex((s) => s.key === project.status);
  const hero = featuredSiteOf(project);
  const budgetPct = project.budgetHours ? Math.round((loggedSeconds / 3600 / project.budgetHours) * 100) : null;
  const sites = [
    { label: "Live site", url: project.productionUrl },
    { label: "Preview", url: project.devUrl },
  ].filter((d): d is { label: string; url: string } => !!d.url);

  return (
    <>
      <PageHeader
        back={{ href: "/portal/projects", label: "Projects" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {project.name} {statusBadgeFor(PROJECT_STATUS, project.status)}
          </span>
        }
        meta={[serviceLabel(project.serviceType), project.dueDate ? `Target ${formatDate(project.dueDate)}` : null]}
        description={project.description}
      />

      {/* Stage: four flat segments; the current one is white, done ones gold. */}
      {stepIndex >= 0 && (
        <ol className="mb-8 grid grid-cols-4 gap-2" aria-label="Project stage">
          {STEPS.map((s, i) => {
            const state = i < stepIndex ? "done" : i === stepIndex ? "current" : "todo";
            return (
              <li key={s.key} aria-current={state === "current" ? "step" : undefined}>
                <span
                  aria-hidden
                  className={cn("block h-1 rounded-full", state === "done" ? "gold-brushed" : state === "current" ? "bg-white" : "bg-white/[0.08]")}
                />
                <span className={cn("mt-2 block truncate text-xs", state === "todo" ? "text-fg-3" : state === "current" ? "font-medium text-white" : "text-fg-2")}>
                  {s.label}
                  <span className="sr-only">{state === "done" ? " (done)" : state === "current" ? " (current)" : ""}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {/* Site preview — the domain the admin marked as featured. "Leave feedback" opens it in review mode. */}
      {hero && (
        <SiteHeroCard
          url={hero.url}
          label={hero.label}
          screenshotUrl={project.siteScreenshotUrl}
          reviewHref={(CLOSED_PROJECT_STATUSES as readonly string[]).includes(project.status) ? undefined : `/portal/projects/${project.id}/review`}
          awaitingReview={project.status === "review"}
        />
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_272px]">
        <div className="min-w-0 space-y-10">
          <section>
            <SectionHeader title="Updates" count={updates.length || undefined} />
            {updates.length === 0 ? (
              <p className="text-[13px] text-fg-3">No updates yet. I&apos;ll post progress here as the work moves along.</p>
            ) : (
              <ol className="scrollbar-subtle max-h-[520px] divide-y divide-line overflow-y-auto rounded-lg border border-line bg-surface">
                {updates.map((u) => (
                  <li key={u.id} className="px-4 py-3">
                    <p className="text-xs text-fg-3">{formatDateTime(u.createdAt)}</p>
                    <p className="mt-1 text-[13px] leading-6 whitespace-pre-wrap text-white">{u.body}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section>
            <SectionHeader
              title="Time log"
              action={entries.length > 0 ? <span className="text-xs tabular-nums text-fg-3">{formatHours(loggedSeconds, 1)} total</span> : undefined}
            />
            {entries.length === 0 ? (
              <p className="text-[13px] text-fg-3">No time logged yet.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-line bg-surface">
                <PortalTimeTable entries={entries} maxHeightClass="max-h-[560px]" />
              </div>
            )}
          </section>

          {references.length > 0 && (
            <section>
              <SectionHeader title="References" count={references.length} />
              <p className="-mt-1 mb-3 text-[13px] text-fg-3">Examples I&apos;ve pulled together. Tell me what you like and what you don&apos;t.</p>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {references.map((r) => (
                  <ReferenceCard key={r.id} reference={r} />
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="lg:border-l lg:border-line lg:pl-8">
          <RailSection title="Progress">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-medium tabular-nums text-white">{project.progressPct}%</span>
              {project.dueDate && <span className="text-xs text-fg-3">Target {formatDate(project.dueDate, "MMM d")}</span>}
            </div>
            <Progress value={project.progressPct} className="mt-2" aria-label="Progress" />
            {budgetPct !== null && (
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-fg-3">Hours used</span>
                  <span className="tabular-nums text-fg-2">
                    {formatHours(loggedSeconds, 1)} of {project.budgetHours}h
                  </span>
                </div>
                <Progress value={Math.min(100, budgetPct)} indicatorClassName="bg-white/50" aria-label="Hours used" />
              </div>
            )}
          </RailSection>

          {sites.length > 0 && (
            <RailSection title="Your website">
              <ul className="-mx-2 space-y-0.5">
                {sites.map((d) => (
                  <li key={d.label}>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-white/[0.04]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs text-fg-3">{d.label}</span>
                        <span className="block truncate text-[13px] text-white">{hostOf(d.url)}</span>
                      </span>
                      <ArrowUpRight className="size-4 shrink-0 text-fg-3 group-hover:text-white" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </RailSection>
          )}

          <RailSection title="Milestones">
            {milestones.length === 0 ? (
              <p className="text-[13px] text-fg-3">None set yet.</p>
            ) : (
              <ol className="space-y-2.5">
                {milestones.map((m) => (
                  <li key={m.id} className="flex gap-2.5">
                    {m.status === "done" ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-label="Done" />
                    ) : m.status === "in_progress" ? (
                      <CircleDot className="mt-0.5 size-4 shrink-0 text-info" aria-label="In progress" />
                    ) : (
                      <Circle className="mt-0.5 size-4 shrink-0 text-fg-3" aria-label="Upcoming" />
                    )}
                    <div className="min-w-0">
                      <p className={cn("text-[13px] leading-5", m.status === "done" ? "text-fg-3" : "text-white")}>{m.title}</p>
                      <p className="text-xs text-fg-3">
                        {m.status === "done" && m.completedAt ? `Done ${formatDate(m.completedAt, "MMM d")}` : m.dueDate ? `Due ${formatDate(m.dueDate, "MMM d")}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </RailSection>

          <RailSection>
            <SocialLinksCard links={client.socialLinks} />
          </RailSection>
        </aside>
      </div>
    </>
  );
}
