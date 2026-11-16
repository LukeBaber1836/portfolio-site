"use client";

import { FormField } from "@/components/shared/FormField";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

/** 6-digit verification code field shared by the invite, reset, and verify-email flows. */
export function OtpCodeField({
  value,
  onChange,
  error,
  errorKey,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  errorKey?: number;
}) {
  return (
    <FormField label="Verification code" error={error} errorKey={errorKey}>
      <InputOTP maxLength={6} value={value} onChange={onChange} inputMode="numeric" pattern="^[0-9]*$" autoComplete="one-time-code">
        <InputOTPGroup className="w-full justify-between gap-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <InputOTPSlot
              key={i}
              index={i}
              className="h-11 flex-1 rounded-md border border-white/[0.08] bg-white/[0.03] text-base font-medium first:rounded-md last:rounded-md data-[active=true]:border-accent/50 data-[active=true]:ring-[3px] data-[active=true]:ring-accent/15"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </FormField>
  );
}
