"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/common/button-link";
import { EmptyState } from "@/components/common/empty-state";
import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api/client";
import { useStore } from "@/lib/store";

// SCR-05 Wellness Questionnaire. One question per screen, with Previous / Next / Submit (VR-14).
// The server only offers approved questionnaires. No reviewed content is in use yet (A-05), so this shows "not available".

type ServerQuestionnaire = {
  id: string;
  name: string;
  version: number;
  purpose: string;
  approx_minutes: number;
  questions: string[];
  options: string[][];
};

export default function QuestionnairePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { actions } = useStore();
  const [questionnaire, setQuestionnaire] = useState<
    ServerQuestionnaire | null | "loading"
  >("loading");

  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(string | undefined)[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<ServerQuestionnaire>("GET", `/questionnaires/${id}`)
      .then(setQuestionnaire)
      .catch(() => setQuestionnaire(null));
  }, [id]);

  if (questionnaire === "loading")
    return <p className="text-navy-soft">Loading…</p>;

  if (questionnaire === null || questionnaire.questions.length === 0) {
    return (
      <>
        <PageHeader title="Wellness check" />
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

  if (!started) {
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
              <li>Approximate time: {questionnaire.approx_minutes} minutes.</li>
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
                setStarted(true);
              }}
            >
              Start
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  const submit = async () => {
    const result = await actions.saveQuestionnaireResult(
      {
        id: questionnaire.id,
        name: questionnaire.name,
        version: questionnaire.version,
        purpose: questionnaire.purpose,
        approxMinutes: questionnaire.approx_minutes,
        options: questionnaire.options.flat(),
        questions: questionnaire.questions,
      },
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
            {(questionnaire.options[index] ?? []).map((option) => (
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
