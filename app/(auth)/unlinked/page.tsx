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
    <div className="rounded-xl border border-line bg-surface p-6 text-center sm:p-8">
      <Link2Off className="mx-auto mb-4 size-6 text-fg-3" aria-hidden />
      <h1 className="text-xl font-semibold tracking-[-0.01em] text-white">Your account isn&apos;t linked yet</h1>
      <p className="mt-3 text-[13px] leading-5 text-fg-2">
        You&apos;re signed in as <span className="text-white">{session.user.email}</span>, but this address isn&apos;t connected to a client
        account. If you signed in with a different email than your invite, sign out and try that one.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <SignOutButton />
        <Button asChild>
          <Link href="/contact">Contact Luke</Link>
        </Button>
      </div>
    </div>
  );
}
