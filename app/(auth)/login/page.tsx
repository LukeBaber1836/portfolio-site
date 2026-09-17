import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getSession, isAdmin } from "@/lib/auth/guards";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Client Login · Luke Baber" };

function safeNext(next: string | undefined) {
  // Only allow same-site relative paths to prevent open redirects.
  return next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const { next, reset } = await searchParams;
  const session = await getSession();
  if (session) redirect(safeNext(next) ?? (isAdmin(session.user) ? "/admin" : "/portal"));

  // LoginForm reads useSearchParams() (to catch an OAuth error bounced back via
  // errorCallbackURL), which requires a Suspense boundary.
  return (
    <Suspense>
      <LoginForm next={safeNext(next)} justReset={reset === "1"} />
    </Suspense>
  );
}
