import Link from "next/link";
import { redirect } from "next/navigation";
import { Link2Off } from "lucide-react";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/guards";

export const metadata = { title: "Account not linked · Luke Baber" };
export const dynamic = "force-dynamic";

export default async function UnlinkedPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="clay rounded-3xl bg-card p-8 text-center sm:p-10">
      <span className="clay mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-background text-accent">
        <Link2Off className="size-6" />
      </span>
      <h1 className="text-2xl font-semibold text-white">Your account isn&apos;t linked yet</h1>
      <p className="mt-3 text-sm leading-6 text-white/60">
        You&apos;re signed in as <span className="text-white">{session.user.email}</span>, but this address isn&apos;t connected to a client
        account. If you signed in with a different email than your invite, sign out and try that one.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <SignOutButton />
        <Button asChild>
          <Link href="/contact">Contact Luke</Link>
        </Button>
      </div>
    </div>
  );
}
