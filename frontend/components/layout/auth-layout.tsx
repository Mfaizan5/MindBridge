import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Logo } from "./logo";

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="flex items-center justify-between px-4 py-5 sm:px-8">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-12 sm:px-6">
        <div className="rounded-card border border-border bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-2 text-navy-soft">{description}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && (
          <div className="mt-6 text-center text-sm text-navy-soft">
            {footer}
          </div>
        )}
        <p className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-navy-soft">
          <Link href="/help" className="underline underline-offset-4">
            Help &amp; Safety
          </Link>
          <Link href="/privacy" className="underline underline-offset-4">
            Privacy notice
          </Link>
          <Link href="/terms" className="underline underline-offset-4">
            Terms
          </Link>
        </p>
      </main>
    </div>
  );
}
