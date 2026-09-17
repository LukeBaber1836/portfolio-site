"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { OAUTH_ERROR_PARAM } from "@/lib/auth/oauth-error";

export function GoogleButton({ callbackURL, label = "Continue with Google" }: { callbackURL: string; label?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          try {
            // `errorCallbackURL` is where Better Auth sends the browser back if the
            // OAuth exchange fails *after* Google redirects here — the only path
            // that can catch declined consent, account-linking refusal, etc. The
            // `error` returned below only ever fires for failures *before* the
            // redirect to Google (e.g. a misconfigured provider).
            const url = new URL(window.location.href);
            url.pathname = window.location.pathname;
            url.search = `?${OAUTH_ERROR_PARAM}=1`;
            const { error } = await authClient.signIn.social({
              provider: "google",
              callbackURL,
              errorCallbackURL: url.toString(),
            });
            if (error) {
              setError("Google sign-in isn't available right now. Please use your email and password.");
              setPending(false);
            }
            // On success this never resolves before the browser navigates away.
          } catch {
            setError("Google sign-in didn't start. Please try again, or use your email and password.");
            setPending(false);
          }
        }}
      >
        {pending ? <Loader2 className="animate-spin" /> : <FcGoogle className="!size-5" />}
        {label}
      </Button>
      {error && <p className="text-center text-xs text-danger">{error}</p>}
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-white/30">
      <span className="h-px flex-1 bg-white/10" />
      or
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}
