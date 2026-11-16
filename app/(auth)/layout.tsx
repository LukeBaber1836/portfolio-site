import Link from "next/link";

import { GoldLight } from "@/components/shared/GoldLight";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col leading-normal">
      <GoldLight />
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-6">
        <Link href="/" className="text-xl font-semibold">
          Luke<span className="text-accent">.</span>
        </Link>
        <Link href="/contact" className="text-[13px] text-fg-3 transition-colors hover:text-white">
          Need help?
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center sm:pt-0">
        <div className="app-enter w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
