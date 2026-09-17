import { Inbox } from "lucide-react";

import { RequestForm } from "@/components/portal/RequestForm";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { statusBadgeFor } from "@/components/ui/badge";
import { portalRequests } from "@/lib/dal/portal";
import { formatDate } from "@/lib/format";
import { REQUEST_STATUS, serviceLabel } from "@/lib/status";

export const metadata = { title: "Requests" };

export default async function PortalRequestsPage() {
  const requests = await portalRequests();
  return (
    <>
      <PageHeader title="Requests" />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="self-start lg:col-span-2">
          <CardHeader>
            <CardTitle>New request</CardTitle>
          </CardHeader>
          <CardContent>
          <RequestForm />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Your requests</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
          {requests.length === 0 ? (
            <EmptyState icon={Inbox} title="No requests yet" description="Anything you send will be tracked here." />
          ) : (
            <ul className="divide-y divide-white/5">
              {requests.map((r) => (
                <li key={r.id} className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-white">{r.title}</p>
                    {statusBadgeFor(REQUEST_STATUS, r.status)}
                  </div>
                  <p className="mt-0.5 text-xs text-white/40">
                    {formatDate(r.createdAt)}
                    {r.serviceType ? ` · ${serviceLabel(r.serviceType)}` : ""}
                  </p>
                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-white/70">{r.body}</p>
                </li>
              ))}
            </ul>
          )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
