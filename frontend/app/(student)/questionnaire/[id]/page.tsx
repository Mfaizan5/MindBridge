"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ButtonLink } from "@/components/common/button-link";
import { EmptyState } from "@/components/common/empty-state";
import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { QUESTIONNAIRES } from "@/lib/seed";
import { useStore } from "@/lib/store";

// SCR-05 Wellness Questionnaire. One question per screen, with Previous / Next / Submit (VR-14).
// No reviewed questionnaire is in use yet (A-05), so the seed entry shows its "not available" state.
// Results are stored with the questionnaire version, but no score is calculated without approved scoring rules.

type Step = "intro" | "questions";

export default function QuestionnairePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { actions } = useStore();
  const questionnaire = QUESTIONNAIRES.find((q) => q.id === id);

  const [step, setStep] = useState<Step>("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(string | undefined)[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!questionnaire) {
    return (
      <EmptyState
        title="Questionnaire not found"
        body="This wellness check does not exist or is no longer available."
        action={
          <ButtonLink href="/dashboard" variant="outline">
            Back to dashboard
          </ButtonLink>
        }
      />
    );
  }

  if (questionnaire.questions.length === 0) {
    return (
      <>
        <PageHeader title={questionnaire.name} />
        <EmptyState
          title="Not available yet"
          body="No reviewed wellness questionnaire has been added here yet, so this check is not available. Nothing is scored or shown as a result until one has been professionally reviewed."
          action={
            <ButtonLink href="/resources" variant="outline">
              Browse resources
            </ButtonLink>
          }
        />
      </>
    );
  }

  const count = questionnaire.questions.length;
  const progress = Math.round(((index + 1) / count) * 100);
  const answered = answers[index] !== undefined;
  const isLast = index === count - 1;

  if (step === "intro") {
    return (
      <>
        <PageHeader
          title={questionnaire.name}
          description={`Version ${questionnaire.version}`}
        />
        <Card className="max-w-2xl">
          <CardContent className="space-y-4">
            <p>{questionnaire.purpose}</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-navy-soft">
              <li>Approximate time: {questionnaire.approxMinutes} minutes.</li>
              <li>Your answers are private to your account.</li>
              <li>
                This check is not a diagnosis and cannot replace a professional
                assessment.
              </li>
            </ul>
            <Button
              onClick={() => {
                setAnswers(Array(count).fill(undefined));
                setIndex(0);
                setStep("questions");
              }}
            >
              Start
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  const submit = () => {
    const result = actions.saveQuestionnaireResult(
      questionnaire,
      answers.map((a) => a ?? ""),
    );
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/questionnaire/results/${result.value}`);
  };

  return (
    <>
      <PageHeader title={questionnaire.name} />
      <Card className="max-w-2xl">
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-navy-soft">
              <span>
                Question {index + 1} of {count}
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} aria-label="Questionnaire progress" />
          </div>

          {error && <Notice tone="error">{error}</Notice>}

          <fieldset className="space-y-3">
            <legend className="text-lg font-semibold">
              {questionnaire.questions[index]}
            </legend>
            {questionnaire.options.map((option) => (
              <label
                key={option}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-navy/20 px-4 hover:bg-navy/5"
              >
                <input
                  type="radio"
                  name={`q-${index}`}
                  value={option}
                  checked={answers[index] === option}
                  onChange={() =>
                    setAnswers((prev) => {
                      const next = [...prev];
                      next[index] = option;
                      return next;
                    })
                  }
                  className="size-5 accent-navy"
                />
                {option}
              </label>
            ))}
          </fieldset>

          <div className="flex flex-wrap justify-between gap-3">
            <Button
              variant="outline"
              disabled={index === 0}
              onClick={() => setIndex((i) => i - 1)}
            >
              Previous
            </Button>
            {isLast ? (
              <Button disabled={!answered} onClick={submit}>
                Submit
              </Button>
            ) : (
              <Button
                disabled={!answered}
                onClick={() => setIndex((i) => i + 1)}
              >
                Next
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
