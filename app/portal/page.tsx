import Link from "next/link";

import { FeaturedSiteCard } from "@/components/portal/FeaturedSiteCard";
import { ProjectCard } from "@/components/portal/ProjectCard";
import { AttentionList, type AttentionItem } from "@/components/shared/AttentionList";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Property, PropertyList } from "@/components/shared/PropertyList";
import { SectionHeader, SectionLink } from "@/components/shared/SectionHeader";
import { requireClient } from "@/lib/auth/guards";
import { isOverdue } from "@/lib/billing";
import { portalActivity, portalOverview } from "@/lib/dal/portal";
import { formatDate, formatDuration, formatHours, formatMoney, formatRelative } from "@/lib/format";
import { featuredSiteOf } from "@/lib/references/preview";

export const metadata = { title: "Overview" };

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "America/Chicago" }).format(new Date()));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default async function PortalOverview() {
  const { user } = await requireClient();
  const [overview, activity] = await Promise.all([portalOverview(), portalActivity(8)]);
  const { client, projects, openInvoices, outstandingCents, hoursThisMonthSeconds, nextMilestone } = overview;
  const needsReview = projects.filter((p) => p.status === "review");
  // Hero: the most relevant project with a site (list is ordered review → in progress → planned → …).
  const withSite = projects.map((p) => ({ project: p, site: featuredSiteOf(p) })).filter((x) => x.site);
  const hero = withSite.find((x) => !["completed", "on_hold"].includes(x.project.status)) ?? withSite[0];

  // Reviews first (they unblock the work), then invoices oldest-due first. Only one gold button.
  const todo: AttentionItem[] = [
    ...needsReview.map((p) => ({
      key: `review-${p.id}`,
      tone: "attention" as const,
      text: (
        <>
          <strong>{p.name}</strong> is ready for your review
        </>
      ),
      href: `/portal/projects/${p.id}`,
      cta: "Review",
    })),
    ...openInvoices.map((inv) => {
      const overdue = isOverdue(inv.status, inv.dueDate);
      return {
        key: `inv-${inv.id}`,
        tone: overdue ? ("danger" as const) : ("attention" as const),
        text: (
          <>
            Invoice <strong>{inv.number ?? ""}</strong> · {formatMoney(inv.amountDueCents)} {overdue ? "was due" : "due"}{" "}
            {inv.dueDate ? formatDate(inv.dueDate, "MMM d") : ""}
          </>
        ),
        href: `/portal/invoices/${inv.id}`,
        cta: "Pay",
      };
    }),
  ];
  const firstPay = todo.find((t) => t.cta === "Pay");
  if (firstPay) firstPay.primary = true;

  return (
    <>
      <PageHeader title={`${greeting()}, ${user.name.split(" ")[0]}`} meta={client.company ? [client.company] : undefined} />

      {hero?.site && (
        <section className="mb-8">
          <FeaturedSiteCard project={hero.project} site={hero.site} />
        </section>
      )}

      <section className="mb-8">
        <SectionHeader title="To do" count={todo.length || undefined} />
        <AttentionList items={todo} emptyText="Nothing needs your attention right now." />
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <SectionHeader title="Your projects" action={projects.length > 4 ? <SectionLink href="/portal/projects">All projects</SectionLink> : undefined} />
          {projects.length === 0 ? (
            <div className="rounded-lg border border-line bg-surface">
              <EmptyState compact title="No projects yet" description="Once we kick things off, your projects and progress will show up here." />
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {projects.slice(0, 4).map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          )}
        </section>

        <div className="space-y-8">
          <section>
            <SectionHeader title="At a glance" />
            <div className="rounded-lg border border-line bg-surface px-4 py-2">
              <PropertyList>
                <Property label="Balance due">
                  {outstandingCents ? (
                    <Link href="/portal/invoices" className="tabular-nums hover:underline">
                      {formatMoney(outstandingCents)}
                    </Link>
                  ) : (
                    <span className="text-fg-2">Paid up</span>
                  )}
                </Property>
                <Property label="Hours this month">
                  <Link href="/portal/hours" className="tabular-nums hover:underline">
                    {formatHours(hoursThisMonthSeconds, 1)}
                  </Link>
                </Property>
                <Property label="Next milestone">
                  {nextMilestone ? (
                    <Link href={`/portal/projects/${nextMilestone.projectId}`} className="block truncate hover:underline">
                      {nextMilestone.title}
                      {nextMilestone.dueDate && <span className="text-fg-3"> · {formatDate(nextMilestone.dueDate, "MMM d")}</span>}
                    </Link>
                  ) : (
                    <span className="text-fg-3">None scheduled</span>
                  )}
                </Property>
              </PropertyList>
            </div>
          </section>

          <section>
            <SectionHeader title="Recent activity" />
            {activity.length === 0 ? (
              <p className="text-[13px] text-fg-3">Nothing yet.</p>
            ) : (
              <ol className="space-y-0.5">
                {activity.map((a, i) => {
                  const href = a.kind === "invoice" ? `/portal/invoices/${a.invoiceId}` : `/portal/projects/${a.projectId}`;
                  return (
                    <li key={i}>
                      <Link href={href} className="-mx-2 block rounded-md px-2 py-2 transition-colors hover:bg-white/[0.03]">
                        <span className="block text-[13px] leading-5 text-fg-2 [&_strong]:font-medium [&_strong]:text-white">
                          {a.kind === "update" && (
                            <>
                              Update on <strong>{a.projectName}</strong>
                            </>
                          )}
                          {a.kind === "milestone" && (
                            <>
                              Milestone done: <strong>{a.title}</strong>
                            </>
                          )}
                          {a.kind === "time" && (
                            <>
                              {formatDuration(a.seconds)} on <strong>{a.projectName}</strong>
                            </>
                          )}
                          {a.kind === "invoice" && (
                            <>
                              Invoice {a.number} {a.status === "paid" ? "paid" : a.status === "void" ? "voided" : "sent"} ·{" "}
                              <strong>{formatMoney(a.amountCents)}</strong>
                            </>
                          )}
                        </span>
                        {a.kind === "update" && <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-fg-3">{a.body}</span>}
                        <span className="block text-xs text-fg-3">{formatRelative(a.at)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
