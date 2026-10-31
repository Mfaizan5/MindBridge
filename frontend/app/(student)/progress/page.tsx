"use client";

import { useState } from "react";
import { ButtonLink } from "@/components/common/button-link";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { TrendChart } from "@/components/charts/trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import {
  average,
  chronological,
  filterByRange,
  MOOD_SCORE,
  RANGE_LABELS,
  round1,
  type Range,
} from "@/lib/stats";
import { formatDate, localDateKey } from "@/lib/validation";

// SCR-07 My Progress. Only the signed-in student's own records are charted (FR-04, VR-16).

const RANGES: Range[] = ["7d", "30d", "all"];
const COLORS = { navy: "#172554", lavender: "#7c6fd6", mint: "#3f9e7e" };

const shortDate = (key: string) => formatDate(key).replace(/^\w+, /, "");

export default function ProgressPage() {
  const { mine } = useStore();
  const [range, setRange] = useState<Range>("30d");
  const today = localDateKey();
  const records = chronological(filterByRange(mine.moods, range, today));

  const moodData = records.map((r) => ({
    date: shortDate(r.recordedOn),
    mood: MOOD_SCORE[r.mood],
  }));
  const stressData = records.map((r) => ({
    date: shortDate(r.recordedOn),
    stress: r.stress,
  }));
  const sleepData = records.map((r) => ({
    date: shortDate(r.recordedOn),
    sleep: r.sleepHours,
  }));

  const avgStress = round1(average(records.map((r) => r.stress)));
  const avgSleep = round1(average(records.map((r) => r.sleepHours)));
  const summary = `In this period you logged ${records.length} check-in${records.length === 1 ? "" : "s"}, with average stress ${avgStress} out of 10 and average sleep ${avgSleep} hours.`;

  return (
    <>
      <PageHeader
        title="My progress"
        description="Patterns from your own check-ins. These are observations, not a diagnosis."
        action={
          <div
            role="group"
            aria-label="Date range"
            className="flex flex-wrap gap-2"
          >
            {RANGES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={range === value}
                onClick={() => setRange(value)}
                className={`min-h-11 rounded-full px-4 text-sm font-medium ${range === value ? "bg-navy text-white" : "bg-lavender text-navy hover:bg-[#dcd6ff]"}`}
              >
                {RANGE_LABELS[value]}
              </button>
            ))}
          </div>
        }
      />

      {records.length === 0 ? (
        <EmptyState
          title="No check-ins in this period"
          body="Once you log a few check-ins, your mood, stress and sleep trends will appear here."
          action={<ButtonLink href="/mood">Save a check-in</ButtonLink>}
        />
      ) : (
        <div className="space-y-6">
          <p className="text-navy">{summary}</p>

          <div className="grid gap-5 lg:grid-cols-2">
            <TrendChart
              title="Mood over time"
              caption="Mood on an approximate scale: Stressed 1, Low 2, Anxious 3, Okay 4, Happy 5."
              summary={`Mood points: ${records.length}. The scale is a display aid, not a score.`}
              data={moodData}
              series={[{ key: "mood", label: "Mood", color: COLORS.navy }]}
              yDomain={[1, 5]}
              yTicks={[1, 2, 3, 4, 5]}
              yLabel="Mood (1–5)"
              emptyText="No mood points in this period."
            />
            <TrendChart
              title="Stress over time"
              caption="Your own 1 to 10 rating, where higher means more stress that day."
              summary={`Average stress ${avgStress} out of 10 across ${records.length} check-ins.`}
              data={stressData}
              series={[
                { key: "stress", label: "Stress", color: COLORS.lavender },
              ]}
              yDomain={[1, 10]}
              yTicks={[1, 3, 5, 7, 10]}
              yLabel="Stress (1–10)"
              emptyText="No stress ratings in this period."
            />
            <TrendChart
              className="lg:col-span-2"
              title="Sleep duration"
              caption="Hours slept on each recorded day, as you entered them."
              summary={`Average sleep ${avgSleep} hours across ${records.length} check-ins.`}
              data={sleepData}
              series={[{ key: "sleep", label: "Hours", color: COLORS.mint }]}
              type="bar"
              yLabel="Hours"
              emptyText="No sleep entries in this period."
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>How to read these ratings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-navy-soft">
              <p>
                Stress and sleep numbers are your own reports. They show change
                over time, and they are not a diagnosis or a score of how you
                are doing.
              </p>
              <p>
                If stress or low mood keeps getting in the way of your day, a
                psychologist can help. See Help &amp; Safety for support
                options.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
