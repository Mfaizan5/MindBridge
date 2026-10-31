import Link from "next/link";
import { ButtonLink } from "@/components/common/button-link";
import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/layout/logo";

// Help & Safety is public so it can be reached without an account (FR-10).
// Crisis and emergency numbers are NOT listed until each one has been verified for the target region (VR-17, A-06).

export default function HelpPage() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-8">
        <Logo />
        <Link
          href="/"
          className="inline-flex min-h-11 items-center px-3 font-medium underline-offset-4 hover:underline"
        >
          Home
        </Link>
      </header>
      <main
        id="main"
        className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6"
      >
        <PageHeader
          title="Help & safety"
          description="Ways to get support, including what to do if you feel unsafe."
        />

        <div className="grid gap-5">
          <Notice tone="warning">
            <p className="font-medium">
              If you are in immediate danger, call your local emergency number
              now.
            </p>
            <p className="mt-1">
              MindBridge is not an emergency monitoring service and cannot
              respond to emergencies.
            </p>
          </Notice>

          <Card>
            <CardHeader>
              <CardTitle>Talk to someone you trust</CardTitle>
            </CardHeader>
            <CardContent className="text-navy-soft">
              A friend, family member, roommate or teacher can help you get
              through a hard day. You can simply say, &ldquo;I am not doing well
              and I would like you to sit with me.&rdquo;
            </CardContent>
          </Card>

          <Card className="bg-mint">
            <CardHeader>
              <CardTitle>Professional support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-navy-soft">
              <p>
                Verified psychologists can help with stress, sleep, exams and
                low mood. You do not need a crisis to book.
              </p>
              <ButtonLink href="/psychologists" variant="secondary">
                Find a psychologist
              </ButtonLink>
            </CardContent>
          </Card>

          <Card className="bg-blush">
            <CardHeader>
              <CardTitle>Crisis and emergency contacts</CardTitle>
            </CardHeader>
            <CardContent className="text-navy-soft">
              Local crisis lines will be listed here once each number has been
              checked against an official source for your region. Until then,
              use your local emergency number in an emergency.
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
