"use client";

import { useParams } from "next/navigation";
import { ButtonLink } from "@/components/common/button-link";
import { EmptyState } from "@/components/common/empty-state";
import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { formatDateTime } from "@/lib/validation";

// SCR-06 Results & Guidance. Non-diagnostic by design (VR-15): no "you need / don't need therapy" statements.
// Results are visible only to their owner. The server returns only the signed-in student's own results.

export default function QuestionnaireResultPage() {
  const { id } = useParams<{ id: string }>();
  const { mine } = useStore();
  const result = mine.results.find((r) => r.id === id);

  if (!result) {
    return (
      <EmptyState
        title="Result not found"
        body="This result does not exist, or it was removed from your account."
        action={
          <ButtonLink href="/dashboard" variant="outline">
            Back to dashboard
          </ButtonLink>
        }
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Wellness check result"
        description={`Completed ${formatDateTime(result.completedAt)} · Version ${result.questionnaireVersion}`}
      />
      <div className="grid max-w-3xl gap-5">
        <Notice tone="warning">
          This is not a diagnosis. MindBridge cannot tell you whether you need
          professional help from a score alone.
        </Notice>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {result.summary ? (
              <p>{result.summary}</p>
            ) : (
              <p className="text-navy-soft">
                A summary is not available. Summaries come only from reviewed
                scoring rules, and none are in use yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-mint">
          <CardHeader>
            <CardTitle>Next steps you can take</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc space-y-1 pl-5 text-sm">
              <li>Read a short resource on stress, sleep or breathing.</li>
              <li>
                Keep logging check-ins so you can see your own patterns over
                time.
              </li>
              <li>
                If you would like to talk to someone, you can book a verified
                psychologist.
              </li>
            </ul>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/resources" variant="outline">
                Resources
              </ButtonLink>
              <ButtonLink href="/psychologists" variant="outline">
                Find a psychologist
              </ButtonLink>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
