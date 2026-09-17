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
              className="h-12 flex-1 rounded-xl border border-white/10 bg-background text-lg font-semibold first:rounded-xl last:rounded-xl data-[active=true]:border-accent data-[active=true]:ring-accent/20"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </FormField>
  );
}
