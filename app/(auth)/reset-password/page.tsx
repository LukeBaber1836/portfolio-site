import type { Metadata } from "next";

import { SetPasswordFlow } from "@/components/auth/SetPasswordFlow";

export const metadata: Metadata = { title: "Reset password · Luke Baber" };

// Canonical plan URL for the code + new-password step. /forgot-password is the
// entry point linked from login; it renders this same flow.
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return <SetPasswordFlow mode="reset" initialEmail={email} />;
}
