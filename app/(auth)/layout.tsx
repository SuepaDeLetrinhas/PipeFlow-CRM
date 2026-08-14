import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(50%_100%_at_50%_0%,hsl(var(--primary)/0.14),transparent)]"
      />

      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-sm">
        <Link
          href="/"
          className="mx-auto mb-8 flex w-fit items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Logo />
          <span className="text-lg font-semibold tracking-tight">PipeFlow</span>
        </Link>

        {children}
      </div>
    </div>
  );
}
