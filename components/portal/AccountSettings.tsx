"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Info, Laptop, LogOut, Smartphone } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";

import { updatePreferencesAction } from "@/app/portal/_actions";
import { FormField, TextInput } from "@/components/shared/FormField";
import { PasswordField } from "@/components/shared/PasswordField";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth/client";
import { readOAuthError, stripOAuthErrorParams, OAUTH_ERROR_PARAM } from "@/lib/auth/oauth-error";

export type SessionRow = { id: string; token: string; userAgent: string | null; updatedAt: string; current: boolean };

function deviceLabel(ua?: string | null) {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  return `${browser}${os ? ` on ${os}` : ""}`;
}

export function AccountSettings({
  user,
  prefs,
  security,
}: {
  user: { name: string; email: string };
  prefs: { emailUpdates: boolean; emailWeeklySummary: boolean };
  /** Loaded on the server; mutations call router.refresh() to reload it. */
  security: { providers: string[]; sessions: SessionRow[] };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState(user.name);
  const [nameState, setNameState] = useState<"idle" | "pending" | "success">("idle");

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [nextValid, setNextValid] = useState(false);
  const [pwState, setPwState] = useState<"idle" | "pending" | "success">("idle");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwErrorKey, setPwErrorKey] = useState(0);
  const hasPassword = security.providers.includes("credential");
  const googleLinked = security.providers.includes("google");
  const sessions = security.sessions;
  const [emailPrefs, setEmailPrefs] = useState(prefs);
  const onValidity = useCallback((v: boolean) => setNextValid(v), []);
  const loadSecurity = () => router.refresh();

  // Google bounced back here after failing post-redirect (the only place that
  // kind of failure can be caught — see GoogleButton for the same pattern).
  useEffect(() => {
    const message = readOAuthError(searchParams);
    if (!message) return;
    toast.error(message);
    const url = stripOAuthErrorParams(new URL(window.location.href));
    router.replace(url.pathname + url.search, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read once on mount
  }, []);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setNameState("pending");
    const { error } = await authClient.updateUser({ name: name.trim() });
    if (error) {
      setNameState("idle");
      return toast.error("Couldn't update your name.");
    }
    setNameState("success");
    setTimeout(() => setNameState("idle"), 1500);
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!nextValid) {
      setPwState("idle");
      setPwErrorKey((k) => k + 1);
      setPwError("New password isn't secure enough — use 12+ characters with upper and lower case, a number, and a symbol.");
      return;
    }
    setPwState("pending");
    setPwError(null);
    const { error } = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
    if (error) {
      setPwState("idle");
      setPwErrorKey((k) => k + 1);
      setPwError((error as { code?: string }).code === "PASSWORD_POLICY" ? error.message ?? "Password doesn't meet the requirements." : "Your current password is incorrect.");
      return;
    }
    setPwState("success");
    toast.success("Password updated", { description: "Other devices were signed out." });
    setCurrent("");
    setNext("");
    loadSecurity();
    setTimeout(() => setPwState("idle"), 1500);
  }

  async function savePrefs(update: Partial<typeof emailPrefs>) {
    const nextPrefs = { ...emailPrefs, ...update };
    setEmailPrefs(nextPrefs);
    const res = await updatePreferencesAction(nextPrefs);
    if (!res.ok) {
      setEmailPrefs(emailPrefs);
      toast.error(res.error);
    } else toast.success(res.message);
  }

  return (
    <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
          <form onSubmit={saveName} className="space-y-4">
            <FormField label="Name" htmlFor="acct-name">
              <TextInput id="acct-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            </FormField>
            <FormField label="Email" htmlFor="acct-email" hint="Contact Luke to change your login email.">
              <TextInput id="acct-email" value={user.email} disabled />
            </FormField>
            <div className="flex justify-end">
              <SubmitButton state={nameState} size="sm" disabled={!name.trim() || name.trim() === user.name} successLabel="Saved">
                Save
              </SubmitButton>
            </div>
          </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email notifications</CardTitle>
          </CardHeader>
          <CardContent>
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Label htmlFor="pref-updates" className="flex items-center gap-1.5 text-sm font-normal text-white">
                  Project updates & milestones
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="More info: project updates and milestones"
                        className="cursor-help text-white/35 transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                      >
                        <Info className="size-3.5" aria-hidden />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[250px] border-white/10 bg-popover text-xs font-normal normal-case leading-5 tracking-normal text-white/70">
                      When I post an update or finish a milestone.
                    </TooltipContent>
                  </Tooltip>
                </Label>
              </div>
              <Switch id="pref-updates" checked={emailPrefs.emailUpdates} onCheckedChange={(v) => savePrefs({ emailUpdates: v })} />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Label htmlFor="pref-weekly" className="flex items-center gap-1.5 text-sm font-normal text-white">
                  Weekly summary
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="More info: weekly summary"
                        className="cursor-help text-white/35 transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                      >
                        <Info className="size-3.5" aria-hidden />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[250px] border-white/10 bg-popover text-xs font-normal normal-case leading-5 tracking-normal text-white/70">
                      Monday recap of hours logged the week before.
                    </TooltipContent>
                  </Tooltip>
                </Label>
              </div>
              <Switch id="pref-weekly" checked={emailPrefs.emailWeeklySummary} onCheckedChange={(v) => savePrefs({ emailWeeklySummary: v })} />
            </div>
            <p className="text-xs text-white/35">Invoices, receipts, and security emails are always sent.</p>
          </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {hasPassword && (
          <Card>
            <CardHeader>
              <CardTitle>Change password</CardTitle>
            </CardHeader>
            <CardContent>
            <form onSubmit={changePassword} className="space-y-4">
              <FormField label="Current password" htmlFor="acct-current" error={pwError?.includes("current") ? pwError : null} errorKey={pwErrorKey}>
                <TextInput id="acct-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
              </FormField>
              <PasswordField
                name="new-password"
                label="New password"
                value={next}
                onChange={setNext}
                context={{ email: user.email, name: user.name }}
                onValidityChange={onValidity}
                error={pwError && !pwError.includes("current") ? pwError : null}
              />
              <div className="flex justify-end">
                <SubmitButton state={pwState} size="sm" disabled={!current || !next} pendingLabel="Updating…" successLabel="Updated">
                  Update password
                </SubmitButton>
              </div>
            </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Sign-in methods</CardTitle>
          </CardHeader>
          <CardContent>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-3 text-sm text-white">
              <FcGoogle className="size-5" /> Google
            </span>
            {googleLinked ? (
              <span className="text-xs text-success">Connected</span>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const { error } = await authClient.linkSocial({
                      provider: "google",
                      callbackURL: "/portal/settings",
                      errorCallbackURL: `${window.location.origin}/portal/settings?${OAUTH_ERROR_PARAM}=1`,
                    });
                    if (error) toast.error("Couldn't start Google sign-in.");
                    // On success this never resolves before the browser navigates away.
                  } catch {
                    toast.error("Couldn't start Google sign-in. Please try again.");
                  }
                }}
              >
                Connect
              </Button>
            )}
          </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="min-w-0">
              <CardTitle>Where you&apos;re signed in</CardTitle>
            </div>
            <CardAction>{sessions.length > 1 && (<Button variant="ghost" size="sm" className="hover:text-danger" onClick={async () => { await authClient.revokeOtherSessions(); toast.success("Signed out of other devices"); loadSecurity(); }}><LogOut /> Sign out others</Button>)}</CardAction>
          </CardHeader>
          <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-white/40">No active sessions found.</p>
          ) : (
            <ul className="space-y-3">
              {sessions.map((s) => {
                const mobile = /Mobile|iPhone|Android/.test(s.userAgent ?? "");
                return (
                  <li key={s.id} className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-white/5 text-white/60">
                      {mobile ? <Smartphone className="size-4" /> : <Laptop className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-white">{deviceLabel(s.userAgent)}</span>
                      <span className="block text-xs text-white/40">
                        {s.current ? "This device" : `Active ${new Date(s.updatedAt).toLocaleDateString()}`}
                      </span>
                    </span>
                    {!s.current && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          await authClient.revokeSession({ token: s.token });
                          loadSecurity();
                        }}
                      >
                        Sign out
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
