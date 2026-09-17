"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, MailCheck } from "lucide-react";

import { FormField, TextInput } from "@/components/shared/FormField";
import { OtpCodeField } from "@/components/auth/OtpCodeField";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { authClient } from "@/lib/auth/client";

/**
 * Email-verification step for the invite flow: the user confirms the address
 * with the 6-digit code from the branded OTP email, then lands in the portal
 * (admins are bounced to /admin by the portal guard).
 */
export function VerifyEmailForm({ initialEmail = "", next }: { initialEmail?: string; next?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(initialEmail ? 2 : 1);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [state, setState] = useState<"idle" | "pending" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [resent, setResent] = useState(false);

  const fail = (message: string) => {
    setError(message);
    setErrorKey((k) => k + 1);
    setState("idle");
  };

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setState("pending");
    setError(null);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" });
    if (error && error.status === 429) return fail("Too many requests. Please wait a minute and try again.");
    // Always advance (even for unknown emails) so we don't reveal which
    // addresses have accounts.
    setState("idle");
    setStep(2);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("pending");
    setError(null);

    const verified = await authClient.emailOtp.verifyEmail({ email, otp });
    if (verified.error) {
      if (verified.error.status === 400) {
        return fail("That code is invalid or expired. Check your email or send a new one.");
      }
      return fail("We couldn't verify your email. Please try again.");
    }

    setState("success");
    const { data } = await authClient.getSession();
    const role = (data?.user as { role?: string } | undefined)?.role;
    router.replace(next ?? (role === "admin" ? "/admin" : "/portal"));
    router.refresh();
  }

  return (
    <div className="clay overflow-hidden rounded-3xl bg-card">
      <div
        className="grid w-[200%] grid-cols-2 transition-transform duration-[var(--page-slide-dur)] ease-[var(--page-slide-ease)] motion-reduce:transition-none"
        style={{ transform: step === 1 ? "translateX(0)" : "translateX(-50%)" }}
      >
        {/* Step 1 */}
        <section className="p-8 sm:p-10" aria-hidden={step !== 1} inert={step !== 1}>
          <div className="mb-8 space-y-2">
            <h1 className="text-2xl font-semibold text-white">Verify your email</h1>
            <p className="text-sm leading-6 text-white/60">
              Enter the email on your account and we&apos;ll send you a 6-digit code.
            </p>
          </div>
          <form onSubmit={sendCode} className="space-y-5">
            <FormField label="Email" htmlFor="verify-email" error={step === 1 ? error : null} errorKey={errorKey}>
              <TextInput
                id="verify-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </FormField>
            <SubmitButton state={state} className="h-11 w-full" disabled={!/.+@.+\..+/.test(email)} pendingLabel="Sending code…">
              Email me a code
            </SubmitButton>
          </form>
          <p className="mt-8 text-center text-xs text-white/40">
            <Link href="/login" className="text-accent hover:underline">
              Back to sign in
            </Link>
          </p>
        </section>

        {/* Step 2 */}
        <section className="p-8 sm:p-10" aria-hidden={step !== 2} inert={step !== 2}>
          <button
            type="button"
            onClick={() => {
              setStep(1);
              setError(null);
            }}
            className="mb-6 inline-flex cursor-pointer items-center gap-1 text-sm text-white/50 transition-colors hover:text-accent"
          >
            <ArrowLeft className="size-4" /> Back
          </button>
          <div className="mb-6 flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
              <MailCheck className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">Check your email</h2>
              <p className="text-sm leading-6 text-white/60">
                If <span className="text-white">{email}</span> has an account, a 6-digit code is on its way.
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <OtpCodeField value={otp} onChange={setOtp} error={error} errorKey={errorKey} />
            <div className="text-right">
              <button
                type="button"
                className="cursor-pointer text-xs text-white/50 transition-colors hover:text-accent disabled:cursor-default disabled:hover:text-white/50"
                disabled={resent}
                onClick={async () => {
                  await sendCode();
                  setResent(true);
                  setTimeout(() => setResent(false), 30_000);
                }}
              >
                {resent ? "Code sent — check your inbox" : "Send a new code"}
              </button>
            </div>

            <SubmitButton
              state={state}
              className="h-11 w-full"
              disabled={otp.length !== 6}
              pendingLabel="Verifying…"
              successLabel="Verified!"
            >
              Verify email
            </SubmitButton>
          </form>
        </section>
      </div>
    </div>
  );
}
