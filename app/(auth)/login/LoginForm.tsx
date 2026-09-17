"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { GoogleButton, OrDivider } from "@/components/auth/GoogleButton";
import { FormField, TextInput, fieldInputClass } from "@/components/shared/FormField";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { authClient } from "@/lib/auth/client";
import { readOAuthError, stripOAuthErrorParams } from "@/lib/auth/oauth-error";
import { cn } from "@/lib/utils";

export function LoginForm({ next, justReset }: { next?: string; justReset?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<"idle" | "pending" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  // Bumped on every failure so the same message still replays the shake.
  const [attempt, setAttempt] = useState(0);
  const [oauthError, setOauthError] = useState<string | null>(null);

  // Google (or another provider) bounced back here after failing post-redirect —
  // the only place that kind of failure can be caught. Show it once, then clean
  // the URL so a refresh doesn't keep re-showing it.
  useEffect(() => {
    const message = readOAuthError(searchParams);
    if (!message) return;
    setOauthError(message);
    const url = stripOAuthErrorParams(new URL(window.location.href));
    router.replace(url.pathname + url.search, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read once on mount
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("pending");
    setError(null);
    const { data, error } = await authClient.signIn.email({ email, password });
    if (error || !data?.user) {
      setState("idle");
      setAttempt((a) => a + 1);
      setError(
        error?.status === 429
          ? "Too many attempts. Please wait a minute and try again."
          : "That email and password don't match. Please try again.",
      );
      return;
    }
    setState("success");
    const role = (data.user as { role?: string }).role;
    router.replace(next ?? (role === "admin" ? "/admin" : "/portal"));
    router.refresh();
  }

  return (
    <div className="clay rounded-3xl bg-card p-8 sm:p-10">
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-semibold text-white">Welcome back</h1>
      </div>

      {justReset && (
        <p className="mb-6 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          Your password has been updated. Sign in with your new password.
        </p>
      )}

      {oauthError && (
        <p className="mb-6 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm leading-6 text-danger" role="alert">
          {oauthError}
        </p>
      )}

      <GoogleButton callbackURL={next ?? "/portal"} />
      <div className="my-6">
        <OrDivider />
      </div>

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormField label="Email" htmlFor="email">
          <TextInput
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </FormField>

        <FormField label="Password" htmlFor="password" error={error} errorKey={attempt}>
          <div className="relative">
            <input
              id="password"
              type={visible ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(fieldInputClass, "pr-12")}
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/5 hover:text-accent"
              aria-label={visible ? "Hide password" : "Show password"}
            >
              <span className="t-icon-swap" data-state={visible ? "b" : "a"}>
                <span className="t-icon" data-icon="a">
                  <Eye className="size-4" />
                </span>
                <span className="t-icon" data-icon="b">
                  <EyeOff className="size-4" />
                </span>
              </span>
            </button>
          </div>
        </FormField>

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs text-white/50 transition-colors hover:text-accent">
            Forgot your password?
          </Link>
        </div>

        <SubmitButton
          state={state}
          className="h-11 w-full"
          disabled={!email || !password}
          pendingLabel="Signing in…"
          successLabel="Welcome!"
        >
          Sign in
        </SubmitButton>
      </form>

      <p className="mt-8 text-center text-xs leading-5 text-white/40">
        Accounts are created by invitation. Working with me but don&apos;t have a login?{" "}
        <Link href="/contact" className="text-accent hover:underline">
          Get in touch
        </Link>
        .
      </p>
    </div>
  );
}
