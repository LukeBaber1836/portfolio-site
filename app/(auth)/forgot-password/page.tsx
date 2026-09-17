import type { Metadata } from "next";

import { SetPasswordFlow } from "@/components/auth/SetPasswordFlow";

export const metadata: Metadata = { title: "Reset password · Luke Baber" };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return <SetPasswordFlow mode="reset" initialEmail={email} />;
}
