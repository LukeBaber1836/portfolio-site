import { AccountSettings, type SessionRow } from "@/components/portal/AccountSettings";
import { PageHeader } from "@/components/shared/PageHeader";
import { auth } from "@/lib/auth/server";
import { requireClient } from "@/lib/auth/guards";
import { portalPreferences } from "@/lib/dal/portal";

export const metadata = { title: "Settings" };

type RawSession = { id: string; token: string; userAgent?: string | null; updatedAt: string | Date };

export default async function PortalSettingsPage() {
  const { user } = await requireClient();
  const [prefs, accounts, sessionList, current] = await Promise.all([
    portalPreferences(),
    auth.listAccounts(),
    auth.listSessions(),
    auth.getSession(),
  ]);

  const providers = ((accounts.data ?? []) as { providerId: string }[]).map((a) => a.providerId);
  const currentToken = (current.data?.session as { token?: string } | null)?.token;
  const sessions: SessionRow[] = ((sessionList.data ?? []) as RawSession[])
    .map((s) => ({
      id: s.id,
      token: s.token,
      userAgent: s.userAgent ?? null,
      updatedAt: new Date(s.updatedAt).toISOString(),
      current: s.token === currentToken,
    }))
    .sort((a, b) => Number(b.current) - Number(a.current));

  return (
    <>
      <PageHeader title="Settings" />
      <AccountSettings user={{ name: user.name, email: user.email }} prefs={prefs} security={{ providers, sessions }} />
    </>
  );
}
