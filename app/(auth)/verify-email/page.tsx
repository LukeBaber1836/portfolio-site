import type { Metadata } from "next";

import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";

export const metadata: Metadata = { title: "Verify your email · Luke Baber" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string }>;
}) {
  const { email, next } = await searchParams;
  return <VerifyEmailForm initialEmail={email} next={next} />;
}
