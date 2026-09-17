"use client";

import { SuccessCheck } from "@/components/shared/SuccessCheck";

/** transitions.dev "Success check" moment for a paid invoice. */
export function PaidCelebration({ amount, paidOn }: { amount: string; paidOn: string | null }) {
  return (
    <div className="flex flex-col items-center py-2 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-success/15 text-success">
        <SuccessCheck className="size-8" strokeWidth={2.5} />
      </span>
      <p className="mt-4 text-lg font-semibold text-white">Paid — thank you!</p>
      <p className="mt-1 text-2xl font-bold text-success">{amount}</p>
      {paidOn && <p className="mt-1 text-xs text-white/45">Received {paidOn}</p>}
    </div>
  );
}
