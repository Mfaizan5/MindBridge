import type {
  AuditEntry,
  Consent,
  ManagedUser,
  MoodRecord,
  Psychologist,
  Questionnaire,
  Resource,
  Slot,
} from "./types";
import { MOOD_OPTIONS } from "./types";

// DEVELOPMENT DEMO DATA ONLY. Fictional people, no real personal data, and no real credentials.
// Replace with API data once the backend exists. Dates are generated relative to "today" so the demo stays usable.

export const PLACEHOLDER_NOTE =
  "Placeholder content. Real material needs professional review before release (see A-17).";

export const DEMO_STUDENT_ID = "user-demo-student";
export const DEMO_ADMIN_ID = "user-demo-admin";
export const DEMO_PSYCHOLOGIST_USER_ID = "user-demo-psychologist";
export const DEMO_PSYCHOLOGIST_ID = "psy-amara";

export const SEED_USERS: ManagedUser[] = [
  {
    id: DEMO_ADMIN_ID,
    name: "Demo Admin",
    email: "admin@mindbridge.demo",
    role: "admin",
    status: "active",
    createdAt: "2026-10-01T09:00:00.000Z",
  },
  {
    id: DEMO_PSYCHOLOGIST_USER_ID,
    name: "Dr. Amara Osei",
    email: "amara@mindbridge.demo",
    role: "psychologist",
    status: "active",
    createdAt: "2026-10-02T09:00:00.000Z",
  },
  {
    id: "user-demo-psychologist-2",
    name: "Daniel Reyes",
    email: "daniel@mindbridge.demo",
    role: "psychologist",
    status: "active",
    createdAt: "2026-10-02T10:00:00.000Z",
  },
  {
    id: DEMO_STUDENT_ID,
    name: "Demo Student",
    email: "student@mindbridge.demo",
    role: "student",
    status: "active",
    createdAt: "2026-10-05T09:00:00.000Z",
  },
  {
    id: "user-demo-psychologist-3",
    name: "Mei Lin Tan",
    email: "mei@mindbridge.demo",
    role: "psychologist",
    status: "active",
    createdAt: "2026-10-03T09:00:00.000Z",
  },
  {
    id: "user-demo-suspended",
    name: "Suspended Example",
    email: "suspended@mindbridge.demo",
    role: "student",
    status: "suspended",
    createdAt: "2026-10-06T09:00:00.000Z",
  },
];

export const RESOURCES: Resource[] = [
  {
    id: "res-stress-basics",
    title: "Understanding everyday stress",
    category: "Stress",
    summary:
      "What stress is, how it shows up in the body, and small first steps.",
    body: [
      PLACEHOLDER_NOTE,
      "Stress is the body's response to demands. Naming it is a useful first step.",
    ],
    source: "MindBridge placeholder",
    readingMinutes: 4,
    published: true,
    updatedAt: "2026-10-20T09:00:00.000Z",
  },
  {
    id: "res-sleep-routine",
    title: "A calmer wind-down routine",
    category: "Sleep",
    summary: "Simple evening habits that make it easier to fall asleep.",
    body: [
      PLACEHOLDER_NOTE,
      "Keep a consistent bedtime and dim screens an hour before sleep.",
    ],
    source: "MindBridge placeholder",
    readingMinutes: 3,
    published: true,
    updatedAt: "2026-10-20T09:00:00.000Z",
  },
  {
    id: "res-exam-anxiety",
    title: "Preparing for exams without panic",
    category: "Exam anxiety",
    summary: "Plan study blocks, take breaks, and ask for help early.",
    body: [
      PLACEHOLDER_NOTE,
      "Split revision into short sessions and schedule rest as part of the plan.",
    ],
    source: "MindBridge placeholder",
    readingMinutes: 5,
    published: true,
    updatedAt: "2026-10-20T09:00:00.000Z",
  },
  {
    id: "res-box-breathing",
    title: "Box breathing",
    category: "Breathing",
    summary: "A four-count breathing pattern you can use anywhere.",
    body: [
      PLACEHOLDER_NOTE,
      "Inhale for four counts, hold four, exhale four, hold four. Repeat a few times.",
    ],
    source: "MindBridge placeholder",
    readingMinutes: 2,
    published: true,
    updatedAt: "2026-10-20T09:00:00.000Z",
  },
  {
    id: "res-self-care",
    title: "Small self-care habits",
    category: "Self-care",
    summary: "Low-effort routines that support mood across the week.",
    body: [
      PLACEHOLDER_NOTE,
      "Short walks, regular meals, and time with people you trust all add up.",
    ],
    source: "MindBridge placeholder",
    readingMinutes: 3,
    published: true,
    updatedAt: "2026-10-20T09:00:00.000Z",
  },
  {
    id: "res-finding-support",
    title: "When and how to ask for professional support",
    category: "Professional support",
    summary:
      "Signs that talking to a psychologist might help, and what to expect.",
    body: [
      PLACEHOLDER_NOTE,
      "You do not need a crisis to talk to a professional. Booking is optional.",
    ],
    source: "MindBridge placeholder",
    readingMinutes: 4,
    published: false,
    updatedAt: "2026-10-28T09:00:00.000Z",
  },
];

// Placeholder: no questionnaire content has been provided (A-05). Not for use.
export const QUESTIONNAIRES: Questionnaire[] = [
  {
    id: "placeholder-wellbeing",
    name: "Wellbeing check (placeholder, not for use)",
    version: 0,
    purpose:
      "Placeholder entry. No reviewed instrument has been provided, so no questions or scoring are shown.",
    approxMinutes: 0,
    options: [],
    questions: [],
  },
];

export const SEED_PSYCHOLOGISTS: Psychologist[] = [
  {
    id: DEMO_PSYCHOLOGIST_ID,
    userId: DEMO_PSYCHOLOGIST_USER_ID,
    name: "Dr. Amara Osei",
    qualifications: [
      {
        id: "qual-amara-1",
        title: "PhD Clinical Psychology",
        institution: "Demo University",
        year: 2015,
        status: "Verified",
      },
    ],
    specialization: "Exam anxiety, stress management",
    experienceYears: 9,
    bio: "Works with students on study pressure and building steady routines.",
    verified: true,
    approvedProfile: true,
    fee: { amount: 40, currency: "USD" },
    format: "Online",
  },
  {
    id: "psy-daniel",
    userId: "user-demo-psychologist-2",
    name: "Daniel Reyes, MSc",
    qualifications: [
      {
        id: "qual-daniel-1",
        title: "MSc Counselling Psychology",
        institution: "Demo University",
        year: 2019,
        status: "Verified",
      },
    ],
    specialization: "Sleep difficulties, low mood",
    experienceYears: 5,
    bio: "Focuses on sleep, mood, and gentle behaviour change.",
    verified: true,
    approvedProfile: true,
    fee: null,
    format: null,
  },
  {
    id: "psy-mei",
    userId: "user-demo-psychologist-3",
    name: "Mei Lin Tan",
    qualifications: [
      {
        id: "qual-mei-1",
        title: "Registration",
        institution: "Pending",
        year: 2024,
        status: "Submitted",
      },
    ],
    specialization: "General student wellbeing",
    experienceYears: 3,
    bio: "Profile awaiting credential verification.",
    verified: false,
    approvedProfile: false,
    fee: null,
    format: null,
  },
];

// Slots are generated from a reference date so the demo always has future times.
export function makeSeedSlots(today: string): Slot[] {
  const dates = [1, 2, 4, 6].map((offset) => addDays(today, offset));
  const times: [string, string][] = [
    ["09:00", "09:50"],
    ["10:00", "10:50"],
    ["14:00", "14:50"],
  ];
  const slots: Slot[] = [];
  for (const date of dates) {
    for (const [startTime, endTime] of times) {
      slots.push({
        id: `${DEMO_PSYCHOLOGIST_ID}-${date}-${startTime}`,
        psychologistId: DEMO_PSYCHOLOGIST_ID,
        date,
        startTime,
        endTime,
        bookedBy: null,
      });
    }
  }
  for (const date of [addDays(today, 3), addDays(today, 5)]) {
    for (const [startTime, endTime] of times.slice(0, 2)) {
      slots.push({
        id: `psy-daniel-${date}-${startTime}`,
        psychologistId: "psy-daniel",
        date,
        startTime,
        endTime,
        bookedBy: null,
      });
    }
  }
  return slots;
}

// Ten days of fictional check-ins for the demo student, so progress charts have data.
export function makeDemoMoods(today: string): MoodRecord[] {
  const stressPattern = [6, 5, 7, 4, 5, 8, 6, 4, 3, 5];
  const sleepPattern = [6, 7, 5.5, 7.5, 7, 5, 6.5, 8, 7.5, 7];
  return stressPattern.map((stress, i) => ({
    id: `demo-mood-${i}`,
    ownerId: DEMO_STUDENT_ID,
    mood: MOOD_OPTIONS[(i * 2) % MOOD_OPTIONS.length],
    stress,
    sleepHours: sleepPattern[i],
    note: "",
    recordedOn: addDays(today, -(stressPattern.length - i)),
    recordedTime: "20:30",
  }));
}

export const SEED_CONSENTS: Consent[] = [];

export const SEED_AUDIT: AuditEntry[] = [
  {
    id: "aud-1",
    at: "2026-10-28T09:12:00.000Z",
    actorId: DEMO_ADMIN_ID,
    actor: "Demo Admin",
    action: "Verified credentials: Dr. Amara Osei",
  },
];

// Pure date arithmetic on YYYY-MM-DD keys, independent of the machine's time zone.
export function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}
