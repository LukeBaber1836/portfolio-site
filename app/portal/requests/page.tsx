import { NewRequestDialog } from "@/components/portal/NewRequestDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { statusBadgeFor } from "@/components/ui/badge";
import { portalRequests } from "@/lib/dal/portal";
import { formatDate } from "@/lib/format";
import { REQUEST_STATUS, serviceLabel } from "@/lib/status";

export const metadata = { title: "Requests" };

export default async function PortalRequestsPage() {
  const requests = await portalRequests();
  return (
    <>
      <PageHeader title="Requests" description="Need something new or changed? Send a request and track it here." actions={<NewRequestDialog />} />
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        {requests.length === 0 ? (
          <EmptyState title="No requests yet" description="Your requests and their status will be listed here." />
        ) : (
          <ul className="divide-y divide-line">
            {requests.map((r) => (
              <li key={r.id} className="px-4 py-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white">{r.title}</p>
                  {statusBadgeFor(REQUEST_STATUS, r.status)}
                </div>
                <p className="mt-0.5 text-xs text-fg-3">
                  {formatDate(r.createdAt)}
                  {r.serviceType ? ` · ${serviceLabel(r.serviceType)}` : ""}
                </p>
                <p className="mt-2 line-clamp-3 text-[13px] leading-5 whitespace-pre-wrap text-fg-2">{r.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
