"use client";

import {
  ArrowUpRight,
  CalendarDays,
  HeartHandshake,
  LineChart,
  NotebookPen,
  Smile,
  Moon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/common/button-link";
import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  appointmentViews,
  recentActivity,
  splitUpcoming,
} from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { average, filterByRange, round1 } from "@/lib/stats";
import { MOOD_OPTIONS } from "@/lib/types";
import { formatDate, formatDateTime, localDateKey } from "@/lib/validation";
import { cn } from "@/lib/utils";

const SLEEP_TARGET_HOURS = 8;

function stressLevel(value: number) {
  if (value === 0) return "No data";
  if (value < 4) return "Low";
  if (value < 7) return "Moderate";
  return "High";
}

// Stress for the last seven days, oldest first. Days without a check-in are null.
function lastSevenDays(moods: { recordedOn: string; stress: number }[], now: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(now);
    day.setDate(now.getDate() - (6 - i));
    const key = localDateKey(day);
    const entry = moods.find((m) => m.recordedOn === key);
    return {
      key,
      label: day.toLocaleDateString(undefined, { weekday: "short" }),
      stress: entry ? entry.stress : null,
    };
  });
}

function StressLine({
  points,
}: {
  points: { key: string; label: string; stress: number | null }[];
}) {
  const width = 420;
  const height = 140;
  const step = width / (points.length - 1);
  const plotted = points.flatMap((p, i) =>
    p.stress === null
      ? []
      : [{ x: i * step, y: height - (p.stress / 10) * (height - 16) - 8, p }],
  );
  const path = plotted
    .map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(" ");
  const summary =
    plotted.length === 0
      ? "No check-ins in the last seven days."
      : `Check-ins on ${plotted.length} of the last 7 days.`;

  return (
    <div className="space-y-3">
      <div role="img" aria-label={`Stress over the last 7 days. ${summary}`}>
        <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full">
          <defs>
            <linearGradient id="stress-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#7c6cf0" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#7c6cf0" stopOpacity="0" />
            </linearGradient>
          </defs>
          {plotted.length > 1 && (
            <>
              <path
                d={`${path} L${plotted[plotted.length - 1].x} ${height} L${plotted[0].x} ${height} Z`}
                fill="url(#stress-fill)"
              />
              <path
                d={path}
                fill="none"
                stroke="#7c6cf0"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}
          {plotted.map((pt) => (
            <circle
              key={pt.p.key}
              cx={pt.x}
              cy={pt.y}
              r={5}
              fill="#ffffff"
              stroke="#7c6cf0"
              strokeWidth={3}
            />
          ))}
        </svg>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-navy-soft">
        {points.map((p) => (
          <span key={p.key}>{p.label}</span>
        ))}
      </div>
      <p className="text-sm text-navy-soft">{summary}</p>
    </div>
  );
}

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

  const stressAverage = average(week.map((m) => m.stress)) ?? 0;
  const sleepAverage = average(week.map((m) => m.sleepHours)) ?? 0;
  const sevenDays = lastSevenDays(mine.moods, now);
  const nextSession = upcoming[0];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-lavender via-sky to-mint p-6 sm:p-8">
        <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <p className="text-sm font-medium text-navy-soft">
              {now.toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Hello, {firstName}. How are you feeling today?
            </h1>
            <p className="mt-2 max-w-xl text-navy-soft">
              {todays
                ? `You checked in today at ${todays.recordedTime}: ${todays.mood}, stress ${todays.stress}/10.`
                : "A quick check-in helps you notice patterns over time."}
            </p>

            <ul
              className="mt-5 flex flex-wrap gap-2"
              aria-label="Quick mood check-in"
            >
              {MOOD_OPTIONS.map((mood) => (
                <li key={mood}>
                  <Link
                    href={`/mood?mood=${mood}`}
                    className="inline-flex min-h-11 items-center rounded-full bg-white px-4 text-sm font-medium shadow-sm transition-colors hover:bg-navy hover:text-white"
                  >
                    {mood}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-5">
              <ButtonLink href="/mood">
                {todays ? "Update check-in" : "Save check-in"}
              </ButtonLink>
            </div>
          </div>

          <Image
            src="/illustrations/brain.svg"
            alt=""
            aria-hidden="true"
            width={340}
            height={260}
            unoptimized
            className="mx-auto hidden h-auto w-56 md:block lg:w-72"
          />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-navy-soft">Stress this week</p>
            <span className="grid size-9 place-items-center rounded-xl bg-blush">
              <Smile className="size-4" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-semibold tabular-nums">
            {week.length === 0 ? "–" : `${round1(stressAverage)}/10`}
          </p>
          <p className="mt-1 text-sm text-navy-soft">
            {stressLevel(stressAverage)}
          </p>
          <div className="mt-3 h-1.5 w-full rounded-full bg-navy/10">
            <div
              className="h-full rounded-full bg-navy"
              style={{ width: `${Math.min(stressAverage, 10) * 10}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-navy-soft">Sleep this week</p>
            <span className="grid size-9 place-items-center rounded-xl bg-sky">
              <Moon className="size-4" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-semibold tabular-nums">
            {week.length === 0 ? "–" : `${round1(sleepAverage)} h`}
          </p>
          <p className="mt-1 text-sm text-navy-soft">
            Target {SLEEP_TARGET_HOURS} hours a night
          </p>
          <div className="mt-3 h-1.5 w-full rounded-full bg-navy/10">
            <div
              className="h-full rounded-full bg-navy"
              style={{
                width: `${Math.min(sleepAverage / SLEEP_TARGET_HOURS, 1) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy/5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-navy-soft">Check-ins this week</p>
            <span className="grid size-9 place-items-center rounded-xl bg-mint">
              <LineChart className="size-4" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-semibold tabular-nums">
            {week.length}
            <span className="text-lg font-normal text-navy-soft"> / 7</span>
          </p>
          <p className="mt-1 text-sm text-navy-soft">
            <Link
              href="/progress"
              className="font-medium underline underline-offset-4"
            >
              View full progress
            </Link>
          </p>
          <div className="mt-3 h-1.5 w-full rounded-full bg-navy/10">
            <div
              className="h-full rounded-full bg-navy"
              style={{ width: `${(week.length / 7) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section
          aria-labelledby="trend-heading"
          className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-navy/5 lg:col-span-2"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="trend-heading" className="text-lg font-semibold">
              Stress, last 7 days
            </h2>
            <Link
              href="/progress"
              className="text-sm font-medium underline underline-offset-4"
            >
              Details
            </Link>
          </div>
          <div className="mt-4">
            <StressLine points={sevenDays} />
          </div>
        </section>

        <section
          aria-labelledby="upcoming-heading"
          className="flex flex-col rounded-2xl bg-navy p-6 text-white shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 id="upcoming-heading" className="text-lg font-semibold">
              Upcoming session
            </h2>
            <Link
              href="/appointments"
              className="grid size-9 place-items-center rounded-full bg-white/15 hover:bg-white/25"
              aria-label="All appointments"
            >
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          {nextSession ? (
            <div className="mt-5 flex-1 space-y-4">
              <div>
                <p className="text-sm text-white/70">
                  {formatDate(nextSession.slot.date)}
                </p>
                <p className="mt-1 text-3xl font-semibold tabular-nums">
                  {nextSession.slot.startTime}
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3">
                <CalendarDays className="size-5 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {nextSession.psychologist?.name ?? "Psychologist"}
                  </p>
                  <p className="text-sm text-white/70">
                    {nextSession.appointment.status}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex-1">
              <p className="text-white/80">No upcoming sessions.</p>
              <Link
                href="/psychologists"
                className="mt-3 inline-block font-medium underline underline-offset-4"
              >
                Find a psychologist
              </Link>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="activity-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="activity-heading" className="text-lg font-semibold">
              Recent activity
            </h2>
            <span className="text-sm text-navy-soft">
              {mine.journal.length} journal{" "}
              {mine.journal.length === 1 ? "entry" : "entries"}
            </span>
          </div>
          {activity.length === 0 ? (
            <EmptyState
              title="Nothing yet"
              body="Check-ins, journal entries and appointments will show up here."
            />
          ) : (
            <ul className="divide-y divide-navy/5 rounded-2xl bg-white shadow-sm ring-1 ring-navy/5">
              {activity.slice(0, 5).map((item, i) => (
                <li key={`${item.at}-${i}`}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-lavender/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {item.label}
                      </span>
                      <span className="block text-xs text-navy-soft">
                        {formatDateTime(
                          item.at.length === 10 ? `${item.at}T00:00` : item.at,
                        )}
                      </span>
                    </span>
                    <ArrowUpRight
                      className="size-4 shrink-0 text-navy-soft"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="upcoming-list-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="upcoming-list-heading" className="text-lg font-semibold">
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
                  className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-navy/5"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lavender">
                    <CalendarDays className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
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
      </div>

      <section aria-labelledby="shortcuts" className="space-y-3">
        <h2 id="shortcuts" className="text-lg font-semibold">
          Helpful shortcuts
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              href: "/mood",
              title: "Stress check",
              body: "Log stress on a 1–10 scale.",
              icon: Smile,
              tone: "bg-blush",
            },
            {
              href: "/mood",
              title: "Sleep tracker",
              body: "Record how many hours you slept.",
              icon: Moon,
              tone: "bg-sky",
            },
            {
              href: "/journal",
              title: "My journal",
              body: "Write a private note for yourself.",
              icon: NotebookPen,
              tone: "bg-mint",
            },
            {
              href: "/psychologists",
              title: "Find a psychologist",
              body: "Browse verified professionals.",
              icon: HeartHandshake,
              tone: "bg-lavender",
            },
          ].map((shortcut) => (
            <Link
              key={shortcut.title}
              href={shortcut.href}
              className={cn(
                "group rounded-2xl p-5 ring-1 ring-navy/5 transition-transform hover:-translate-y-0.5",
                shortcut.tone,
              )}
            >
              <span className="grid size-10 place-items-center rounded-xl bg-white shadow-sm">
                <shortcut.icon className="size-4" aria-hidden="true" />
              </span>
              <p className="mt-4 font-semibold">{shortcut.title}</p>
              <p className="mt-1 text-sm text-navy-soft">{shortcut.body}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
