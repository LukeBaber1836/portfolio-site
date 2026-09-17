import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      {/* Soft gold glow behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 size-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.06] blur-[120px]"
      />
      <header className="container relative z-10 mx-auto flex items-center justify-between py-8">
        <Link href="/" className="text-3xl font-semibold">
          Luke<span className="text-accent">.</span>
        </Link>
        <Link href="/contact" className="text-sm text-white/50 transition-colors hover:text-accent">
          Need help? Contact me
        </Link>
      </header>
      <main className="relative z-10 flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:items-center">
        <div className="app-enter w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
