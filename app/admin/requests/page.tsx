import Link from "next/link";
import { Inbox } from "lucide-react";

import { RequestStatusControl } from "@/components/admin/RequestStatusControl";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { statusBadgeFor } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listRequests } from "@/lib/dal/admin/dashboard";
import { formatDateTime } from "@/lib/format";
import { REQUEST_STATUS, serviceLabel } from "@/lib/status";

export const metadata = { title: "Requests" };

export default async function RequestsPage() {
  const rows = await listRequests();

  return (
    <>
      <PageHeader title="Requests" />
      <Card>
        <CardContent className="p-0">
        {rows.length === 0 ? (
          <EmptyState icon={Inbox} title="Inbox zero" />
        ) : (
          <ul className="divide-y divide-white/5">
            {rows.map(({ request: r, clientName, clientId, fromName, fromEmail }) => (
              <li key={r.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-start">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <p className="font-medium text-white">{r.title}</p>
                    {statusBadgeFor(REQUEST_STATUS, r.status)}
                  </div>
                  <p className="text-xs text-white/40">
                    <Link href={`/admin/clients/${clientId}`} className="hover:text-accent">
                      {clientName}
                    </Link>{" "}
                    · {fromName ?? "Client"} · {serviceLabel(r.serviceType)} · {formatDateTime(r.createdAt)}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/80">{r.body}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {fromEmail && (
                    <Button asChild variant="outline" size="sm">
                      <a href={`mailto:${fromEmail}?subject=${encodeURIComponent(`Re: ${r.title}`)}`}>Reply</a>
                    </Button>
                  )}
                  {r.status !== "accepted" && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/projects?new=1&client=${clientId}`}>Create project</Link>
                    </Button>
                  )}
                  <RequestStatusControl id={r.id} status={r.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
        </CardContent>
      </Card>
    </>
  );
}
