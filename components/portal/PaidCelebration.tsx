"use client";

import { SuccessCheck } from "@/components/shared/SuccessCheck";

/** Paid state for an invoice: a quiet check-draw (transitions.dev "Success check"), amount, and date. */
export function PaidCelebration({ amount, paidOn }: { amount: string; paidOn: string | null }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-[13px] text-success">
        <SuccessCheck className="size-4" strokeWidth={2.5} />
        Paid, thank you
      </p>
      <p className="mt-2 text-3xl font-medium tabular-nums tracking-[-0.01em] text-white">{amount}</p>
      {paidOn && <p className="mt-1 text-[13px] text-fg-3">Received {paidOn}</p>}
    </div>
  );
}
