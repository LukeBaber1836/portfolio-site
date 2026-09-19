import { notFound } from "next/navigation";
import { CheckCircle2, Circle, CircleDot, Clock, MessageSquare } from "lucide-react";

import { PortalTimeTable } from "@/components/portal/PortalTimeTable";
import { ReferenceCard } from "@/components/portal/ReferenceCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { statusBadgeFor } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { portalProject } from "@/lib/dal/portal";
import { formatDate, formatDateTime, formatHours } from "@/lib/format";
import { PROJECT_STATUS, serviceLabel } from "@/lib/status";
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
  const data = await portalProject(id);
  if (!data) notFound();
  const { project, milestones, updates, entries, references, loggedSeconds } = data;
  const stepIndex = STEPS.findIndex((s) => s.key === project.status);
  const budgetPct = project.budgetHours ? Math.round((loggedSeconds / 3600 / project.budgetHours) * 100) : null;

  return (
    <>
      <PageHeader
        back={{ href: "/portal/projects", label: "Projects" }}
        eyebrow={serviceLabel(project.serviceType)}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {project.name} {statusBadgeFor(PROJECT_STATUS, project.status)}
          </span>
        }
        description={project.description}
      />

      {/* Status stepper */}
      {stepIndex >= 0 && (
        <Card className="mb-6">
          <CardContent className="px-5 py-6">
          <ol className="grid grid-cols-4 gap-2" aria-label="Project stage">
            {STEPS.map((s, i) => {
              const state = i < stepIndex ? "done" : i === stepIndex ? "current" : "todo";
              return (
                <li key={s.key} className="relative flex flex-col items-center gap-2 text-center" aria-current={state === "current" ? "step" : undefined}>
                  {i > 0 && (
                    <span
                      aria-hidden
                      className={cn("absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2", i <= stepIndex ? "bg-accent" : "bg-white/10")}
                      style={{ marginRight: 16 }}
                    />
                  )}
                  <span
                    className={cn(
                      "relative z-10 flex size-8 items-center justify-center rounded-full border-2 transition-colors",
                      state === "done" && "border-accent bg-accent text-background",
                      state === "current" && "border-accent bg-background text-accent shadow-[0_0_18px_rgba(243,208,118,0.45)]",
                      state === "todo" && "border-white/15 bg-background text-white/30",
                    )}
                  >
                    {state === "done" ? <CheckCircle2 className="size-4" /> : state === "current" ? <CircleDot className="size-4" /> : <Circle className="size-3" />}
                  </span>
                  <span className={cn("text-xs", state === "todo" ? "text-white/35" : "text-white")}>{s.label}</span>
                </li>
              );
            })}
          </ol>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Updates</CardTitle>
            </CardHeader>
            <CardContent className={updates.length ? "scrollbar-subtle max-h-[500px] overflow-y-auto" : undefined}>
            {updates.length === 0 ? (
              <EmptyState compact icon={MessageSquare} title="No updates yet" />
            ) : (
              <ol className="relative space-y-6 border-l border-white/10 pl-6">
                {updates.map((u) => (
                  <li key={u.id} className="relative">
                    <span className="absolute -left-[31px] top-1 size-3 rounded-full border-2 border-card bg-accent" aria-hidden />
                    <p className="text-xs text-white/40">{formatDateTime(u.createdAt)}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white/85">{u.body}</p>
                  </li>
                ))}
              </ol>
            )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="min-w-0">
                <CardTitle>Time log</CardTitle>
                <CardDescription>{`${formatHours(loggedSeconds, 1)} logged on this project`}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
            {entries.length === 0 ? (
              <EmptyState compact icon={Clock} title="No time logged yet" />
            ) : (
              <PortalTimeTable entries={entries} maxHeightClass="max-h-[600px]" />
            )}
            </CardContent>
          </Card>

          {references.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>References</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {references.map((r) => (
                    <ReferenceCard key={r.id} reference={r} />
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-bold text-white">{project.progressPct}%</span>
              {project.dueDate && <span className="text-xs text-white/45">Target {formatDate(project.dueDate)}</span>}
            </div>
            <Progress value={project.progressPct} className="mt-3 h-2.5 bg-white/10" aria-label="Progress" />
            {budgetPct !== null && (
              <div className="mt-6">
                <div className="mb-2 flex justify-between text-xs text-white/50">
                  <span>Hours used</span>
                  <span className="tabular-nums">
                    {formatHours(loggedSeconds, 1)} of {project.budgetHours}h
                  </span>
                </div>
                <Progress value={Math.min(100, budgetPct)} className="h-2 bg-white/10 [&>div]:bg-info" aria-label="Budget used" />
              </div>
            )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Milestones</CardTitle>
            </CardHeader>
            <CardContent>
            {milestones.length === 0 ? (
              <p className="text-sm text-white/40">No milestones set.</p>
            ) : (
              <ol className="space-y-3">
                {milestones.map((m) => (
                  <li key={m.id} className="flex gap-3">
                    {m.status === "done" ? (
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-label="Done" />
                    ) : m.status === "in_progress" ? (
                      <CircleDot className="mt-0.5 size-5 shrink-0 text-info" aria-label="In progress" />
                    ) : (
                      <Circle className="mt-0.5 size-5 shrink-0 text-white/25" aria-label="Upcoming" />
                    )}
                    <div>
                      <p className={cn("text-sm leading-6", m.status === "done" ? "text-white/50" : "text-white")}>{m.title}</p>
                      <p className="text-xs text-white/35">
                        {m.status === "done" && m.completedAt ? `Done ${formatDate(m.completedAt, "MMM d")}` : m.dueDate ? `Due ${formatDate(m.dueDate, "MMM d")}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
