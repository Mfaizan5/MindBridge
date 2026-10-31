import Link from "next/link";
import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import { Logo } from "@/components/layout/logo";

// Draft terms. Not legal advice. Must be reviewed by the project team before it is shown to real users.

export default function TermsPage() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-8">
        <Logo />
        <Link
          href="/help"
          className="inline-flex min-h-11 items-center px-3 font-medium underline-offset-4 hover:underline"
        >
          Help &amp; Safety
        </Link>
      </header>
      <main
        id="main"
        className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8 sm:px-6"
      >
        <PageHeader
          title="Terms of use"
          description="The rules for using MindBridge."
        />
        <Notice tone="warning">
          Draft for development. This text must be reviewed before it is shown
          to real users.
        </Notice>

        <section className="space-y-2 text-navy-soft">
          <h2 className="text-lg font-semibold text-navy">
            Wellness, not diagnosis
          </h2>
          <p>
            MindBridge helps you track wellbeing and connect with professionals.
            It does not diagnose, treat, or replace clinical care or emergency
            services.
          </p>
        </section>
        <section className="space-y-2 text-navy-soft">
          <h2 className="text-lg font-semibold text-navy">Your account</h2>
          <p>
            You are responsible for keeping your login details safe. Accounts
            are for one person. Accounts can be suspended if these terms are
            broken.
          </p>
        </section>
        <section className="space-y-2 text-navy-soft">
          <h2 className="text-lg font-semibold text-navy">Professionals</h2>
          <p>
            Psychologist profiles show verified credentials only after an
            administrator has checked them. Fees and formats are shown only when
            the psychologist has confirmed them.
          </p>
        </section>
        <section className="space-y-2 text-navy-soft">
          <h2 className="text-lg font-semibold text-navy">Appointments</h2>
          <p>
            Cancellation is allowed up to the window set by the administrator.
            The current window is shown when you book.
          </p>
        </section>
      </main>
    </div>
  );
}
