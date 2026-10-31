import Link from "next/link";
import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import { Logo } from "@/components/layout/logo";

// Draft privacy notice. It describes what this prototype does; it is not legal advice and makes no compliance claim.
// It must be reviewed by the project team before it is published to real users.

export default function PrivacyPage() {
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
          title="Privacy notice"
          description="What MindBridge stores, why, and what you can do about it."
        />
        <Notice tone="warning">
          Draft for development. This text must be reviewed before it is shown
          to real users.
        </Notice>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">What we store</h2>
          <ul className="list-disc space-y-1 pl-5 text-navy-soft">
            <li>
              Your name and email, to sign you in and contact you about
              bookings.
            </li>
            <li>Mood, stress and sleep check-ins that you enter.</li>
            <li>Journal entries. These are private to you.</li>
            <li>Appointments, notifications and your sharing choices.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Who can see what</h2>
          <ul className="list-disc space-y-1 pl-5 text-navy-soft">
            <li>
              Only you can see your check-ins, questionnaire results and journal
              entries.
            </li>
            <li>
              A psychologist sees your information only for an appointment you
              booked, and only the categories you have chosen to share.
            </li>
            <li>
              Administrators manage accounts and content. They cannot read
              journal entries.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Your choices</h2>
          <p className="text-navy-soft">
            You can change your sharing choices, download your data, and delete
            your account from Profile &amp; Settings. Deleting your account
            removes your records from this service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">How long we keep data</h2>
          <p className="text-navy-soft">
            Retention periods are not yet set. They will be published here once
            decided by the project team.
          </p>
        </section>
      </main>
    </div>
  );
}
