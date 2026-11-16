"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Laptop, LogOut, Smartphone } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";

import { updatePreferencesAction } from "@/app/portal/_actions";
import { FormField, TextInput } from "@/components/shared/FormField";
import { PasswordField } from "@/components/shared/PasswordField";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
    <div className="max-w-4xl divide-y divide-line">
      <SettingsSection title="Profile" description="How your name appears to me and on invoices.">
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
      </SettingsSection>

      <SettingsSection title="Email notifications" description="Invoices, receipts, and security emails are always sent.">
        <div className="divide-y divide-line rounded-lg border border-line bg-surface">
          <PrefRow
            id="pref-updates"
            label="Project updates & milestones"
            hint="When I post an update or finish a milestone."
            checked={emailPrefs.emailUpdates}
            onChange={(v) => savePrefs({ emailUpdates: v })}
          />
          <PrefRow
            id="pref-weekly"
            label="Weekly summary"
            hint="Monday recap of hours logged the week before."
            checked={emailPrefs.emailWeeklySummary}
            onChange={(v) => savePrefs({ emailWeeklySummary: v })}
          />
        </div>
      </SettingsSection>

      {hasPassword && (
        <SettingsSection title="Password" description="Changing it signs you out on your other devices.">
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
        </SettingsSection>
      )}

      <SettingsSection title="Sign-in methods">
        <div className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-2">
          <span className="flex items-center gap-3 text-[13px] text-white">
            <FcGoogle className="size-4" /> Google
          </span>
          {googleLinked ? (
            <span className="text-xs text-fg-2">Connected</span>
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
      </SettingsSection>

      <SettingsSection
        title="Where you're signed in"
        action={
          sessions.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 hover:text-danger"
              onClick={async () => {
                await authClient.revokeOtherSessions();
                toast.success("Signed out of other devices");
                loadSecurity();
              }}
            >
              <LogOut /> Sign out others
            </Button>
          )
        }
      >
        {sessions.length === 0 ? (
          <p className="text-[13px] text-fg-3">No active sessions found.</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {sessions.map((s) => {
              const mobile = /Mobile|iPhone|Android/.test(s.userAgent ?? "");
              return (
                <li key={s.id} className="flex min-h-12 items-center gap-3 px-4 py-2">
                  {mobile ? <Smartphone className="size-4 shrink-0 text-fg-3" aria-hidden /> : <Laptop className="size-4 shrink-0 text-fg-3" aria-hidden />}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] text-white">{deviceLabel(s.userAgent)}</span>
                    <span className="block text-xs text-fg-3">{s.current ? "This device" : `Active ${new Date(s.updatedAt).toLocaleDateString()}`}</span>
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
      </SettingsSection>
    </div>
  );
}

/** Vercel-style settings row: title + description on the left third, controls on the right. */
function SettingsSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 py-8 first:pt-0 md:grid-cols-[220px_minmax(0,1fr)] md:gap-10">
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {description && <p className="mt-1 text-[13px] leading-5 text-fg-3">{description}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function PrefRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-[13px] font-normal text-white">
          {label}
        </Label>
        <p className="text-xs text-fg-3">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
