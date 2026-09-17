"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ArrowLeft, MailCheck } from "lucide-react";

import { GoogleButton, OrDivider } from "@/components/auth/GoogleButton";
import { OtpCodeField } from "@/components/auth/OtpCodeField";
import { FormField, TextInput } from "@/components/shared/FormField";
import { PasswordField } from "@/components/shared/PasswordField";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { authClient } from "@/lib/auth/client";

type Mode = "invite" | "reset";

const COPY: Record<Mode, { title: string; intro: string; cta: string }> = {
  invite: {
    title: "Set up your portal account",
    intro: "Confirm your email and choose a password. We'll send a 6-digit code to make sure it's you.",
    cta: "Create password & sign in",
  },
  reset: {
    title: "Reset your password",
    intro: "Enter the email on your account and we'll send you a 6-digit code.",
    cta: "Update password & sign in",
  },
};

/**
 * Two steps shown side by side (transitions.dev "Page side-by-side"):
 * 1) request an emailed code, 2) enter code + new password.
 */
export function SetPasswordFlow({ mode, initialEmail = "" }: { mode: Mode; initialEmail?: string }) {
  const router = useRouter();
  const copy = COPY[mode];
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordValid, setPasswordValid] = useState(false);
  const [state, setState] = useState<"idle" | "pending" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [resent, setResent] = useState(false);

  const onValidity = useCallback((v: boolean) => setPasswordValid(v), []);

  const fail = (message: string) => {
    setError(message);
    setErrorKey((k) => k + 1);
    setState("idle");
  };

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setState("pending");
    setError(null);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: "forget-password" });
    if (error && error.status === 429) return fail("Too many requests. Please wait a minute and try again.");
    // Always advance (even for unknown emails) so we don't reveal which addresses have accounts.
    setState("idle");
    setStep(2);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return fail("Passwords don't match.");
    if (!passwordValid) return fail("That password isn't secure enough — use 12+ characters with upper and lower case, a number, and a symbol.");
    setState("pending");
    setError(null);

    const reset = await authClient.emailOtp.resetPassword({ email, otp, password });
    if (reset.error) {
      const code = (reset.error as { code?: string }).code;
      if (code === "PASSWORD_POLICY") return fail(reset.error.message ?? "Password doesn't meet the requirements.");
      if (code === "INVALID_OTP" || code === "OTP_EXPIRED" || reset.error.status === 400) {
        return fail("That code is invalid or expired. Check your email or send a new one.");
      }
      return fail("We couldn't update your password. Please try again.");
    }

    const signIn = await authClient.signIn.email({ email, password });
    if (signIn.error || !signIn.data?.user) {
      router.replace("/login?reset=1");
      return;
    }
    setState("success");
    const role = (signIn.data.user as { role?: string }).role;
    router.replace(role === "admin" ? "/admin" : "/portal");
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
            <h1 className="text-2xl font-semibold text-white">{copy.title}</h1>
            <p className="text-sm leading-6 text-white/60">{copy.intro}</p>
          </div>
          <form onSubmit={sendCode} className="space-y-5">
            <FormField label="Email" htmlFor="flow-email" error={step === 1 ? error : null} errorKey={errorKey}>
              <TextInput
                id="flow-email"
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
          {mode === "invite" && (
            <>
              <div className="my-6">
                <OrDivider />
              </div>
              <GoogleButton callbackURL="/portal" label="Sign in with Google instead" />
              <p className="mt-3 text-center text-xs text-white/40">Use the same email address your invite was sent to.</p>
            </>
          )}
          <p className="mt-8 text-center text-xs text-white/40">
            Already set up?{" "}
            <Link href="/login" className="text-accent hover:underline">
              Sign in
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
            <OtpCodeField
              value={otp}
              onChange={setOtp}
              error={step === 2 && error?.includes("code") ? error : null}
              errorKey={errorKey}
            />
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

            <PasswordField
              name="password"
              label="New password"
              value={password}
              onChange={setPassword}
              context={{ email }}
              onValidityChange={onValidity}
              error={step === 2 && error && !error.includes("code") && !error.includes("match") ? error : null}
            />
            <FormField label="Confirm password" htmlFor="confirm" error={error?.includes("match") ? error : null} errorKey={errorKey}>
              <TextInput
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </FormField>

            <SubmitButton
              state={state}
              className="h-11 w-full"
              disabled={otp.length !== 6 || !password || !confirm}
              pendingLabel="Saving…"
              successLabel="All set!"
            >
              {copy.cta}
            </SubmitButton>
          </form>
        </section>
      </div>
    </div>
  );
}
