"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useStore } from "@/lib/store";

// Psychologist verification (FR-14). Credentials are reviewed one by one, the verified badge is set separately,
// and the profile is published only after verification. Every change is written to the audit log (FR-15).
// Prototype: the review uses the submitted record only. No document upload yet (A-14).

type Feedback = { tone: "success" | "error"; text: string };

export default function VerificationPage() {
  const { data, actions } = useStore();
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const report = (result: { ok: boolean; error?: string }, success: string) =>
    setFeedback(
      result.ok
        ? { tone: "success", text: success }
        : { tone: "error", text: result.error ?? "Something went wrong." },
    );

  if (data.psychologists.length === 0)
    return (
      <EmptyState
        title="No psychologists yet"
        body="Profiles will appear here for review."
      />
    );

  return (
    <>
      <PageHeader
        title="Psychologist verification"
        description="Check each qualification, then verify the psychologist. Profiles are shown to students only when published."
      />

      {feedback && (
        <div className="mb-6">
          <Notice tone={feedback.tone === "error" ? "error" : "success"}>
            {feedback.text}
          </Notice>
        </div>
      )}

      <ul className="space-y-4">
        {data.psychologists.map((p) => (
          <li key={p.id}>
            <Card>
              <CardHeader className="gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{p.name}</CardTitle>
                  {p.verified ? (
                    <Badge variant="secondary">Verified</Badge>
                  ) : (
                    <Badge variant="outline">Not verified</Badge>
                  )}
                  {p.approvedProfile ? (
                    <Badge>Published</Badge>
                  ) : (
                    <Badge variant="destructive">Hidden from students</Badge>
                  )}
                </div>
                <CardDescription>{p.specialization}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  {p.qualifications.map((q) => (
                    <li
                      key={q.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3"
                    >
                      <span>
                        {q.title}, {q.institution} ({q.year})
                      </span>
                      <span className="flex items-center gap-2">
                        <Badge
                          variant={
                            q.status === "Verified"
                              ? "secondary"
                              : q.status === "Rejected"
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {q.status}
                        </Badge>
                        {q.status !== "Verified" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              report(
                                actions.setQualificationStatus(
                                  p.id,
                                  q.id,
                                  "Verified",
                                ),
                                `Verified "${q.title}".`,
                              )
                            }
                          >
                            Verify
                          </Button>
                        )}
                        {q.status !== "Rejected" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              report(
                                actions.setQualificationStatus(
                                  p.id,
                                  q.id,
                                  "Rejected",
                                ),
                                `Rejected "${q.title}".`,
                              )
                            }
                          >
                            Reject
                          </Button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap gap-3">
                  {p.verified ? (
                    <ConfirmDialog
                      trigger="Remove verification"
                      title={`Remove verification for ${p.name}?`}
                      description="The verified badge will be removed from their profile."
                      confirmLabel="Remove verification"
                      onConfirm={() =>
                        report(
                          actions.setPsychologistVerified(p.id, false),
                          `Verification removed for ${p.name}.`,
                        )
                      }
                    />
                  ) : (
                    <Button
                      onClick={() =>
                        report(
                          actions.setPsychologistVerified(p.id, true),
                          `${p.name} is now verified.`,
                        )
                      }
                    >
                      Mark as verified
                    </Button>
                  )}
                  {p.approvedProfile ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        report(
                          actions.setProfilePublished(p.id, false),
                          `${p.name}'s profile is hidden.`,
                        )
                      }
                    >
                      Hide profile
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      disabled={!p.verified}
                      onClick={() =>
                        report(
                          actions.setProfilePublished(p.id, true),
                          `${p.name}'s profile is published.`,
                        )
                      }
                    >
                      Publish profile
                    </Button>
                  )}
                </div>
                {!p.verified && (
                  <p className="text-sm text-navy-soft">
                    Verify the credentials before publishing the profile.
                  </p>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
