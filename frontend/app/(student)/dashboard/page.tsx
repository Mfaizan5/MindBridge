"use client";

import { CalendarDays, HeartHandshake, LineChart, Smile } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/common/button-link";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  appointmentViews,
  recentActivity,
  splitUpcoming,
} from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { average, filterByRange, round1 } from "@/lib/stats";
import { MOOD_OPTIONS } from "@/lib/types";
import { formatDate, localDateKey, formatDateTime } from "@/lib/validation";

// SCR-03 Student Dashboard
export default function DashboardPage() {
  const { me, mine, data } = useStore();
  const now = new Date();
  const today = localDateKey(now);
  const week = filterByRange(mine.moods, "7d", today);
  const todays = mine.moods.find((m) => m.recordedOn === today);
  const firstName = me?.name.split(/\s+/)[0] ?? "there";

  const views = appointmentViews(data, mine.appointments, now);
  const { upcoming } = splitUpcoming(views);
  const activity = recentActivity(mine.moods, mine.journal, views);

  return (
    <>
      <PageHeader
        title={`How are you feeling today, ${firstName}?`}
        description="A quick check-in helps you notice patterns over time."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="bg-lavender lg:col-span-2">
          <CardHeader>
            <CardTitle>Daily check-in</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {todays ? (
              <p>
                You checked in today at {todays.recordedTime}:{" "}
                <span className="font-medium">{todays.mood}</span>, stress{" "}
                {todays.stress}/10.
              </p>
            ) : (
              <p>You have not checked in yet today.</p>
            )}
            <ul
              className="flex flex-wrap gap-2"
              aria-label="Quick mood check-in"
            >
              {MOOD_OPTIONS.map((mood) => (
                <li key={mood}>
                  <Link
                    href={`/mood?mood=${mood}`}
                    className="inline-flex min-h-11 items-center rounded-full bg-white px-4 text-sm font-medium hover:bg-navy/5"
                  >
                    {mood}
                  </Link>
                </li>
              ))}
            </ul>
            <ButtonLink href="/mood">
              {todays ? "Update check-in" : "Save check-in"}
            </ButtonLink>
          </CardContent>
        </Card>

        <Card className="bg-sky">
          <CardHeader>
            <CardTitle>This week</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt>Check-ins</dt>
                <dd className="font-semibold">{week.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Average stress</dt>
                <dd className="font-semibold">
                  {round1(average(week.map((m) => m.stress)))}/10
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Average sleep</dt>
                <dd className="font-semibold">
                  {round1(average(week.map((m) => m.sleepHours)))} h
                </dd>
              </div>
            </dl>
            <Link
              href="/progress"
              className="mt-4 inline-block font-medium underline underline-offset-4"
            >
              View full progress
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="upcoming-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="upcoming-heading" className="text-lg font-semibold">
              Upcoming appointments
            </h2>
            <Link
              href="/appointments"
              className="text-sm font-medium underline underline-offset-4"
            >
              All appointments
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState
              title="No upcoming appointments"
              body="When you book a time with a psychologist, it will appear here."
            />
          ) : (
            <ul className="space-y-2">
              {upcoming.slice(0, 3).map((v) => (
                <li
                  key={v.appointment.id}
                  className="flex items-center gap-3 rounded-card border border-border bg-white p-4"
                >
                  <CalendarDays
                    className="size-5 shrink-0"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {v.psychologist?.name ?? "Psychologist"}
                    </p>
                    <p className="text-sm text-navy-soft">
                      {formatDate(v.slot.date)}, {v.slot.startTime}
                    </p>
                  </div>
                  <Badge variant="outline">{v.appointment.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="activity-heading" className="space-y-3">
          <h2 id="activity-heading" className="text-lg font-semibold">
            Recent activity
          </h2>
          {activity.length === 0 ? (
            <EmptyState
              title="Nothing yet"
              body="Check-ins, journal entries and appointments will show up here."
            />
          ) : (
            <ul className="divide-y divide-border rounded-card border border-border bg-white">
              {activity.map((item, i) => (
                <li key={`${item.at}-${i}`}>
                  <Link
                    href={item.href}
                    className="flex flex-col gap-0.5 px-4 py-3 hover:bg-navy/5"
                  >
                    <span className="text-sm">{item.label}</span>
                    <span className="text-xs text-navy-soft">
                      {formatDateTime(
                        item.at.length === 10 ? `${item.at}T00:00` : item.at,
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="shortcuts" className="mt-8">
        <h2 id="shortcuts" className="mb-3 text-lg font-semibold">
          Helpful shortcuts
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              href: "/mood",
              title: "Stress Check",
              body: "Log stress on a 1–10 scale.",
              icon: Smile,
            },
            {
              href: "/mood",
              title: "Sleep Tracker",
              body: "Record how many hours you slept.",
              icon: Smile,
            },
            {
              href: "/progress",
              title: "My Progress",
              body: "See your recent patterns.",
              icon: LineChart,
            },
            {
              href: "/psychologists",
              title: "Find a Psychologist",
              body: "Browse verified professionals.",
              icon: HeartHandshake,
            },
          ].map((shortcut) => (
            <Link
              key={shortcut.title}
              href={shortcut.href}
              className="rounded-card border border-border bg-white p-5 transition-colors hover:bg-lavender/40"
            >
              <shortcut.icon className="size-5" aria-hidden="true" />
              <p className="mt-2 font-semibold">{shortcut.title}</p>
              <p className="mt-1 text-sm text-navy-soft">{shortcut.body}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
