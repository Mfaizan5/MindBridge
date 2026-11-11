import {
  Bell,
  CalendarCheck,
  HeartHandshake,
  LineChart,
  ShieldCheck,
  Smile,
} from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/common/button-link";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Logo } from "@/components/layout/logo";

// Landing page. Makes no clinical claims: MindBridge is a wellness and connection platform, not a diagnosis or emergency service.

const STEPS = [
  {
    icon: Smile,
    title: "Check in",
    body: "Log your mood, stress and sleep in under a minute.",
  },
  {
    icon: LineChart,
    title: "See patterns",
    body: "Charts show your own trends over the days and weeks you choose.",
  },
  {
    icon: HeartHandshake,
    title: "Connect, if you want",
    body: "Browse verified psychologists and book a time only when you are ready.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="flex items-center justify-between px-4 py-5 sm:px-8">
        <Logo />
        <nav aria-label="Account" className="flex items-center gap-1">
          <ThemeToggle />
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center px-3 font-medium underline-offset-4 hover:underline"
          >
            Log in
          </Link>
          <ButtonLink href="/signup" size="sm">
            Get started
          </ButtonLink>
        </nav>
      </header>

      <main id="main" className="flex-1">
        <section className="mx-auto grid max-w-5xl gap-10 px-6 py-12 lg:grid-cols-2 lg:items-center lg:py-20">
          <div className="space-y-6">
            <p className="inline-flex rounded-full bg-mint px-3 py-1 text-sm font-medium">
              University student wellbeing
            </p>
            <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
              Better Mind, Brighter Future
            </h1>
            <p className="max-w-lg text-lg text-navy-soft">
              Track everyday wellbeing and find professional support, when you
              want it. Your records stay private to you.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/signup" size="lg" className="w-full sm:w-auto">
                Get started
              </ButtonLink>
              <ButtonLink
                href="/help"
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
              >
                Help &amp; Safety
              </ButtonLink>
            </div>
          </div>
          <div
            aria-hidden="true"
            className="relative mx-auto size-64 sm:size-80"
          >
            <span className="absolute inset-0 rounded-full bg-lavender" />
            <span className="absolute left-6 top-10 size-20 rounded-full bg-mint" />
            <span className="absolute bottom-8 right-4 size-24 rounded-full bg-blush" />
            <span className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-navy" />
          </div>
        </section>

        <section aria-labelledby="how" className="bg-sky/60 px-6 py-12">
          <div className="mx-auto max-w-5xl">
            <h2 id="how" className="text-2xl font-semibold">
              How MindBridge works
            </h2>
            <ol className="mt-6 grid gap-5 sm:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title} className="rounded-card bg-white p-6">
                  <step.icon className="size-6" aria-hidden="true" />
                  <p className="mt-3 text-sm text-navy-soft">Step {i + 1}</p>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="mt-1 text-navy-soft">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          aria-labelledby="trust"
          className="mx-auto grid max-w-5xl gap-6 px-6 py-12 sm:grid-cols-2"
        >
          <div className="rounded-card bg-blush p-6">
            <ShieldCheck className="size-6" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold">
              What MindBridge is not
            </h2>
            <p className="mt-2 text-navy-soft">
              It does not diagnose conditions or replace a clinical assessment,
              and it is not an emergency service. In immediate danger, call your
              local emergency number.
            </p>
          </div>
          <div className="rounded-card bg-mint p-6">
            <Bell className="size-6" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold">You stay in control</h2>
            <p className="mt-2 text-navy-soft">
              Nothing is shared with a psychologist unless you choose to share
              it. Withdraw consent at any time in Profile &amp; Settings.
            </p>
          </div>
        </section>

        <section
          aria-labelledby="pros"
          className="mx-auto max-w-5xl px-6 pb-16"
        >
          <div className="flex flex-col items-start justify-between gap-4 rounded-card border border-border p-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold">Are you a psychologist?</h2>
              <p className="text-navy-soft">
                Create an account, then submit your qualifications for
                verification. Verified badges appear only after review.
              </p>
            </div>
            <ButtonLink href="/login" variant="outline">
              <CalendarCheck className="size-4" aria-hidden="true" />
              Log in to your workspace
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-8 text-sm text-navy-soft">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:justify-between">
          <p>
            MindBridge is a wellness and support platform. It is not a
            substitute for clinical care or emergency services.
          </p>
          <nav aria-label="Footer" className="flex flex-wrap gap-4">
            <Link href="/help" className="underline underline-offset-4">
              Help &amp; Safety
            </Link>
            <Link href="/privacy" className="underline underline-offset-4">
              Privacy notice
            </Link>
            <Link href="/terms" className="underline underline-offset-4">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
