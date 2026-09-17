"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BellRing, Check, Copy, ExternalLink, RefreshCw, Send, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { invoiceOpAction } from "@/app/admin/_actions/invoices";
import { ActionButton } from "@/components/shared/ActionButton";
import { Button } from "@/components/ui/button";

export function InvoiceActions({
  id,
  status,
  hostedUrl,
  stripeUrl,
  clientLabel,
  amountLabel,
}: {
  id: string;
  status: string;
  hostedUrl: string | null;
  stripeUrl: string;
  clientLabel: string;
  amountLabel: string;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "draft" && (
        <>
          <ActionButton
            variant="ghost"
            size="sm"
            className="hover:text-danger"
            action={() => invoiceOpAction(id, "void")}
            onDone={(r) => r.ok && router.push("/admin/invoices")}
            refresh={false}
            confirm={{
              title: "Delete this draft?",
              description: "The Stripe draft is deleted and its hours go back to unbilled.",
              confirmLabel: "Delete draft",
              destructive: true,
            }}
          >
            <Trash2 /> Delete draft
          </ActionButton>
          <ActionButton
            size="sm"
            action={() => invoiceOpAction(id, "send")}
            confirm={{
              title: `Send ${amountLabel} to ${clientLabel}?`,
              description: "The invoice is finalized in Stripe (it can't be edited after this), emailed with a secure payment link, and shown in their portal.",
              confirmLabel: "Finalize & send",
            }}
          >
            <Send /> Finalize &amp; send
          </ActionButton>
        </>
      )}

      {status === "open" && (
        <>
          {hostedUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(hostedUrl);
                setCopied(true);
                toast.success("Payment link copied");
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              <span className="t-icon-swap" data-state={copied ? "b" : "a"}>
                <span className="t-icon flex" data-icon="a">
                  <Copy className="size-4" />
                </span>
                <span className="t-icon flex" data-icon="b">
                  <Check className="size-4 text-success" />
                </span>
              </span>
              Pay link
            </Button>
          )}
          <ActionButton variant="outline" size="sm" action={() => invoiceOpAction(id, "remind")}>
            <BellRing /> Remind
          </ActionButton>
          <ActionButton
            variant="outline"
            size="sm"
            action={() => invoiceOpAction(id, "markPaid")}
            confirm={{
              title: "Mark as paid outside Stripe?",
              description: "Use this for checks, cash, or transfers you received directly. Stripe records it as paid out of band.",
              confirmLabel: "Mark paid",
            }}
          >
            <Check /> Mark paid
          </ActionButton>
          <ActionButton
            variant="ghost"
            size="sm"
            className="hover:text-danger"
            action={() => invoiceOpAction(id, "void")}
            confirm={{
              title: "Void this invoice?",
              description: "The client can no longer pay it, and its hours return to unbilled so you can re-invoice. This can't be undone.",
              confirmLabel: "Void invoice",
              destructive: true,
            }}
          >
            <XCircle /> Void
          </ActionButton>
        </>
      )}

      <ActionButton variant="ghost" size="icon-sm" aria-label="Sync from Stripe" action={() => invoiceOpAction(id, "resync")}>
        <RefreshCw />
      </ActionButton>
      <Button asChild variant="ghost" size="icon-sm" aria-label="Open in Stripe">
        <a href={stripeUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink />
        </a>
      </Button>
    </div>
  );
}
