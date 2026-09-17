import type { Metadata } from "next";

import { SetPasswordFlow } from "@/components/auth/SetPasswordFlow";

export const metadata: Metadata = { title: "Set up your account · Luke Baber" };

export default async function AcceptInvitePage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return <SetPasswordFlow mode="invite" initialEmail={email} />;
}
