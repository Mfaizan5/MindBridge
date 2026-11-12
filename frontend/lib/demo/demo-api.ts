// In-browser stand-in for the MindBridge API, used only when DEMO_MODE is on.
// It answers the same paths with the same JSON shapes as the FastAPI backend, so the store and pages
// run unchanged. Data is fictional and kept in sessionStorage (one browser tab) until it is reset.

import { ApiError } from "@/lib/api/client";
import { DEMO_PASSWORD } from "./config";

type Role = "student" | "psychologist" | "admin";
type Body = Record<string, any>;

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "suspended";
  created_at: string;
}
interface ProfileRow {
  user_id: string;
  specialization: string;
  bio: string;
  experience_years: number;
  verified: boolean;
  published: boolean;
  fee_amount: number | null;
  fee_currency: string | null;
  format: "Online" | "In person" | null;
}
interface QualRow {
  id: string;
  psychologist_id: string;
  title: string;
  institution: string;
  year: number;
  status: "Submitted" | "Verified" | "Rejected";
}
interface SlotRow {
  id: string;
  psychologist_id: string;
  starts_at: string;
  ends_at: string;
  booked: boolean;
}
interface ApptRow {
  id: string;
  slot_id: string;
  psychologist_id: string;
  student_id: string;
  status: "Pending" | "Confirmed" | "Completed" | "Cancelled";
  created_at: string;
  updated_at: string;
}
interface MoodRow {
  id: string;
  student_id: string;
  mood: string;
  stress: number;
  sleep_hours: number;
  note: string;
  recorded_at: string;
}
interface JournalRow {
  id: string;
  student_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}
interface NotifRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}
interface ConsentRow {
  student_id: string;
  psychologist_id: string;
  scope: string;
  granted: boolean;
  updated_at: string;
}
interface ResourceRow {
  id: string;
  title: string;
  category: string;
  summary: string;
  body: string[];
  source: string;
  reading_minutes: number;
  published: boolean;
  updated_at: string;
}
interface AuditRow {
  id: string;
  actor_name: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  created_at: string;
}
interface Db {
  users: UserRow[];
  profiles: ProfileRow[];
  quals: QualRow[];
  slots: SlotRow[];
  appts: ApptRow[];
  moods: MoodRow[];
  journal: JournalRow[];
  notifs: NotifRow[];
  consents: ConsentRow[];
  resources: ResourceRow[];
  audit: AuditRow[];
  settings: { cancellation_window_hours: number };
  session: string | null;
}

const STORAGE_KEY = "mindbridge-demo-v1";
let cache: Db | null = null;

const nid = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
const nowIso = () => new Date().toISOString();
const addMinutes = (iso: string, minutes: number) =>
  new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();

// Clock time relative to today, so the demo always has upcoming slots.
function dayAt(daysAhead: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function seed(): Db {
  const created = nowIso();
  const users: UserRow[] = [
    { id: "u-admin", name: "Demo Admin", email: "admin@mindbridge.com", role: "admin", status: "active", created_at: created },
    { id: "u-student", name: "Demo Student", email: "student@mindbridge.demo", role: "student", status: "active", created_at: created },
    { id: "u-amara", name: "Dr. Amara Osei", email: "amara@mindbridge.demo", role: "psychologist", status: "active", created_at: created },
    { id: "u-daniel", name: "Daniel Reyes, MSc", email: "daniel@mindbridge.demo", role: "psychologist", status: "active", created_at: created },
    { id: "u-mei", name: "Mei Lin Tan", email: "mei@mindbridge.demo", role: "psychologist", status: "active", created_at: created },
  ];
  const profiles: ProfileRow[] = [
    { user_id: "u-amara", specialization: "Exam anxiety, stress management", bio: "Fictional demonstration profile.", experience_years: 9, verified: true, published: true, fee_amount: 40, fee_currency: "USD", format: "Online" },
    { user_id: "u-daniel", specialization: "Sleep difficulties, low mood", bio: "Fictional demonstration profile.", experience_years: 5, verified: true, published: true, fee_amount: null, fee_currency: null, format: null },
    { user_id: "u-mei", specialization: "General student wellbeing", bio: "Fictional demonstration profile.", experience_years: 3, verified: false, published: false, fee_amount: null, fee_currency: null, format: null },
  ];
  const quals: QualRow[] = [
    { id: "q-amara", psychologist_id: "u-amara", title: "PhD Clinical Psychology", institution: "Demo University", year: 2015, status: "Verified" },
    { id: "q-daniel", psychologist_id: "u-daniel", title: "MSc Counselling Psychology", institution: "Demo University", year: 2019, status: "Verified" },
    { id: "q-mei", psychologist_id: "u-mei", title: "Registration", institution: "Pending", year: 2024, status: "Submitted" },
  ];
  const slots: SlotRow[] = [];
  for (const [psy, days] of [
    ["u-amara", [1, 2, 4, 6]],
    ["u-daniel", [3, 5]],
  ] as const) {
    for (const day of days) {
      for (const hour of [9, 10, 14]) {
        const starts = dayAt(day, hour);
        slots.push({ id: `s-${psy}-${day}-${hour}`, psychologist_id: psy, starts_at: starts, ends_at: addMinutes(starts, 50), booked: false });
      }
    }
  }
  // One confirmed appointment so the student and psychologist screens are not empty.
  const bookedSlot = slots.find((s) => s.id === "s-u-amara-1-9");
  if (bookedSlot) bookedSlot.booked = true;
  const appts: ApptRow[] = bookedSlot
    ? [{ id: "a-demo", slot_id: bookedSlot.id, psychologist_id: "u-amara", student_id: "u-student", status: "Confirmed", created_at: created, updated_at: created }]
    : [];

  const stress = [6, 5, 7, 4, 5, 8, 6, 4, 3, 5];
  const sleep = [6, 7, 5.5, 7.5, 7, 5, 6.5, 8, 7.5, 7];
  const moodNames = ["Happy", "Okay", "Low", "Anxious", "Stressed"];
  const moods: MoodRow[] = stress.map((s, i) => ({
    id: `m-${i}`,
    student_id: "u-student",
    mood: moodNames[(i * 2) % moodNames.length],
    stress: s,
    sleep_hours: sleep[i],
    note: "",
    recorded_at: (() => {
      const d = new Date();
      d.setDate(d.getDate() - (stress.length - i));
      d.setHours(9, 0, 0, 0);
      return d.toISOString();
    })(),
  }));

  const placeholder = "Placeholder content for the demo. Real material needs professional review before release.";
  const resources: ResourceRow[] = [
    { id: "r-1", title: "Understanding everyday stress", category: "Stress", summary: "What stress is, and small first steps.", body: [placeholder], source: "MindBridge placeholder", reading_minutes: 4, published: true, updated_at: created },
    { id: "r-2", title: "A calmer wind-down routine", category: "Sleep", summary: "Simple evening habits for better sleep.", body: [placeholder], source: "MindBridge placeholder", reading_minutes: 3, published: true, updated_at: created },
    { id: "r-3", title: "Preparing for exams without panic", category: "Exam anxiety", summary: "Plan study blocks and ask for help early.", body: [placeholder], source: "MindBridge placeholder", reading_minutes: 5, published: true, updated_at: created },
    { id: "r-4", title: "Box breathing", category: "Breathing", summary: "A four-count breathing pattern you can use anywhere.", body: [placeholder], source: "MindBridge placeholder", reading_minutes: 2, published: true, updated_at: created },
    { id: "r-5", title: "Small self-care habits", category: "Self-care", summary: "Low-effort routines that support mood.", body: [placeholder], source: "MindBridge placeholder", reading_minutes: 3, published: true, updated_at: created },
    { id: "r-6", title: "When to ask for professional support", category: "Professional support", summary: "Signs that talking to a psychologist might help.", body: [placeholder], source: "MindBridge placeholder", reading_minutes: 4, published: false, updated_at: created },
  ];

  return {
    users,
    profiles,
    quals,
    slots,
    appts,
    moods,
    journal: [],
    notifs: [
      { id: "n-1", user_id: "u-student", title: "Welcome to the MindBridge demo", body: "This copy runs in your browser with fictional data.", read: false, created_at: created },
    ],
    consents: [],
    resources,
    audit: [
      { id: "au-1", actor_name: "Demo Admin", action: "seed.created", target_type: "system", target_id: null, created_at: created },
    ],
    settings: { cancellation_window_hours: 24 },
    session: null,
  };
}

function load(): Db {
  if (cache) return cache;
  let saved: Db | null = null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) saved = JSON.parse(raw) as Db;
  } catch {
    saved = null;
  }
  cache = saved ?? seed();
  return cache;
}

function save(db: Db): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Storage is full or disabled: keep the data in memory for this page load.
  }
}

// Clears the demo data so the next load starts from the seed again.
export function resetDemoData(): void {
  cache = null;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

function fail(status: number, code: string, message: string): never {
  throw new ApiError(status, code, message);
}

function signedInUser(db: Db): UserRow | null {
  return db.users.find((u) => u.id === db.session) ?? null;
}

function need(db: Db, ...roles: Role[]): UserRow {
  const user = signedInUser(db);
  if (!user) fail(401, "unauthorized", "Please log in again.");
  if (roles.length > 0 && !roles.includes(user.role)) {
    fail(403, "forbidden", "You do not have access to this.");
  }
  return user;
}

const userDto = (u: UserRow) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  status: u.status,
  created_at: u.created_at,
});

const sessionDto = (u: UserRow) => ({ user: userDto(u), csrf_token: "demo-csrf" });

const qualDto = (q: QualRow) => ({
  id: q.id,
  title: q.title,
  institution: q.institution,
  year: q.year,
  status: q.status,
});

const slotDto = (s: SlotRow) => ({
  id: s.id,
  psychologist_id: s.psychologist_id,
  starts_at: s.starts_at,
  ends_at: s.ends_at,
  booked: s.booked,
});

const profileOf = (db: Db, userId: string): ProfileRow => {
  const profile = db.profiles.find((p) => p.user_id === userId);
  if (!profile) fail(404, "not_found", "Profile not found.");
  return profile;
};

const profileDto = (db: Db, userId: string) => {
  const p = profileOf(db, userId);
  const u = db.users.find((x) => x.id === userId);
  return {
    user_id: p.user_id,
    name: u?.name ?? "",
    specialization: p.specialization,
    bio: p.bio,
    experience_years: p.experience_years,
    fee_amount: p.fee_amount,
    fee_currency: p.fee_currency,
    format: p.format,
    verified: p.verified,
    published: p.published,
    qualifications: db.quals.filter((q) => q.psychologist_id === userId).map(qualDto),
  };
};

const apptDto = (db: Db, a: ApptRow) => {
  const slot = db.slots.find((s) => s.id === a.slot_id);
  const psy = db.users.find((u) => u.id === a.psychologist_id);
  return {
    id: a.id,
    slot_id: a.slot_id,
    psychologist_id: a.psychologist_id,
    psychologist_name: psy?.name ?? "",
    student_id: a.student_id,
    status: a.status,
    starts_at: slot?.starts_at ?? a.created_at,
    ends_at: slot?.ends_at ?? a.created_at,
    created_at: a.created_at,
    updated_at: a.updated_at,
  };
};

const addAudit = (db: Db, actor: UserRow, action: string, targetType: string, targetId: string | null) => {
  db.audit.unshift({ id: nid("au"), actor_name: actor.name, action, target_type: targetType, target_id: targetId, created_at: nowIso() });
};

const isPublicPsychologist = (db: Db, userId: string) => {
  const p = db.profiles.find((x) => x.user_id === userId);
  return Boolean(p && p.verified && p.published);
};

// ---------- routing ----------

interface Ctx {
  db: Db;
  body: Body;
  p: string[];
}
type Handler = (c: Ctx) => unknown;
interface Route {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  re: RegExp;
  handler: Handler;
}

const ROUTES: Route[] = [];
function route(method: Route["method"], path: string, handler: Handler) {
  const pattern = path.replace(/:[a-zA-Z]+/g, "([^/]+)");
  ROUTES.push({ method, re: new RegExp(`^${pattern}$`), handler });
}

// Auth
route("POST", "/auth/login", ({ db, body }) => {
  const email = String(body.email ?? "").trim().toLowerCase();
  const user = db.users.find((u) => u.email === email);
  if (!user || body.password !== DEMO_PASSWORD || (body.role && body.role !== user.role)) {
    fail(401, "invalid_credentials", "The email, password or role is not correct.");
  }
  if (user.status === "suspended") fail(403, "suspended", "This account is suspended.");
  db.session = user.id;
  return sessionDto(user);
});

route("POST", "/auth/signup", ({ db, body }) => {
  const email = String(body.email ?? "").trim().toLowerCase();
  if (db.users.some((u) => u.email === email)) {
    fail(409, "email_taken", "An account with this email already exists.");
  }
  const user: UserRow = {
    id: nid("u"),
    name: String(body.name ?? "").trim(),
    email,
    role: body.role === "psychologist" ? "psychologist" : "student",
    status: "active",
    created_at: nowIso(),
  };
  db.users.push(user);
  if (user.role === "psychologist") {
    db.profiles.push({ user_id: user.id, specialization: "", bio: "", experience_years: 0, verified: false, published: false, fee_amount: null, fee_currency: null, format: null });
  }
  db.session = user.id;
  return sessionDto(user);
});

route("GET", "/auth/me", ({ db }) => sessionDto(need(db)));

route("POST", "/auth/logout", ({ db }) => {
  db.session = null;
  return undefined;
});

route("POST", "/auth/password-reset/request", () => undefined);
route("POST", "/auth/password-reset/confirm", () => undefined);

// Account
route("PATCH", "/users/me", ({ db, body }) => {
  const user = need(db);
  if (typeof body.name === "string") user.name = body.name.trim();
  if (typeof body.email === "string") user.email = body.email.trim().toLowerCase();
  return userDto(user);
});

route("DELETE", "/users/me", ({ db }) => {
  const user = need(db);
  db.users = db.users.filter((u) => u.id !== user.id);
  db.moods = db.moods.filter((m) => m.student_id !== user.id);
  db.journal = db.journal.filter((j) => j.student_id !== user.id);
  db.notifs = db.notifs.filter((n) => n.user_id !== user.id);
  db.consents = db.consents.filter((c) => c.student_id !== user.id);
  db.session = null;
  return undefined;
});

// Platform settings
route("GET", "/platform/settings", ({ db }) => ({ cancellation_window_hours: db.settings.cancellation_window_hours }));

// Mood
route("GET", "/moods", ({ db }) => {
  const user = need(db);
  return db.moods
    .filter((m) => m.student_id === user.id)
    .map((m) => ({ id: m.id, mood: m.mood, stress: m.stress, sleep_hours: m.sleep_hours, note: m.note, recorded_at: m.recorded_at }));
});

route("POST", "/moods", ({ db, body }) => {
  const user = need(db, "student");
  const row: MoodRow = {
    id: nid("m"),
    student_id: user.id,
    mood: body.mood,
    stress: Number(body.stress),
    sleep_hours: Number(body.sleep_hours),
    note: String(body.note ?? ""),
    recorded_at: String(body.recorded_at),
  };
  db.moods.push(row);
  return { id: row.id, mood: row.mood, stress: row.stress, sleep_hours: row.sleep_hours, note: row.note, recorded_at: row.recorded_at };
});

route("PUT", "/moods/:id", ({ db, body, p }) => {
  const user = need(db, "student");
  const row = db.moods.find((m) => m.id === p[0] && m.student_id === user.id);
  if (!row) fail(404, "not_found", "Mood record not found.");
  Object.assign(row, {
    mood: body.mood,
    stress: Number(body.stress),
    sleep_hours: Number(body.sleep_hours),
    note: String(body.note ?? ""),
    recorded_at: String(body.recorded_at),
  });
  return { id: row.id, mood: row.mood, stress: row.stress, sleep_hours: row.sleep_hours, note: row.note, recorded_at: row.recorded_at };
});

route("DELETE", "/moods/:id", ({ db, p }) => {
  const user = need(db, "student");
  db.moods = db.moods.filter((m) => !(m.id === p[0] && m.student_id === user.id));
  return undefined;
});

// Journal
route("GET", "/journal", ({ db }) => {
  const user = need(db, "student");
  return db.journal.filter((j) => j.student_id === user.id);
});

route("POST", "/journal", ({ db, body }) => {
  const user = need(db, "student");
  const now = nowIso();
  const row: JournalRow = { id: nid("j"), student_id: user.id, content: String(body.content ?? ""), created_at: now, updated_at: now };
  db.journal.push(row);
  return row;
});

route("PUT", "/journal/:id", ({ db, body, p }) => {
  const user = need(db, "student");
  const row = db.journal.find((j) => j.id === p[0] && j.student_id === user.id);
  if (!row) fail(404, "not_found", "Journal entry not found.");
  row.content = String(body.content ?? "");
  row.updated_at = nowIso();
  return row;
});

route("DELETE", "/journal/:id", ({ db, p }) => {
  const user = need(db, "student");
  db.journal = db.journal.filter((j) => !(j.id === p[0] && j.student_id === user.id));
  return undefined;
});

// Questionnaires: none is approved yet, so the page shows "not available", as it does against the real API.
route("GET", "/questionnaires/:id", () => fail(404, "not_found", "This questionnaire is not available."));
route("POST", "/questionnaires/:id/results", () => ({ id: nid("qr") }));

// Appointments
route("GET", "/appointments/me", ({ db }) => {
  const user = need(db, "student");
  return db.appts.filter((a) => a.student_id === user.id).map((a) => apptDto(db, a));
});

route("POST", "/appointments", ({ db, body }) => {
  const user = need(db, "student");
  const slot = db.slots.find((s) => s.id === body.slot_id);
  if (!slot) fail(404, "not_found", "That time is no longer available.");
  if (slot.booked) fail(409, "slot_taken", "That time has already been booked.");
  if (new Date(slot.starts_at).getTime() <= Date.now()) fail(400, "past_slot", "That time has already passed.");
  slot.booked = true;
  const now = nowIso();
  const row: ApptRow = { id: nid("a"), slot_id: slot.id, psychologist_id: slot.psychologist_id, student_id: user.id, status: "Pending", created_at: now, updated_at: now };
  db.appts.push(row);
  db.notifs.push({ id: nid("n"), user_id: slot.psychologist_id, title: "New appointment request", body: `${user.name} requested a session.`, read: false, created_at: now });
  return apptDto(db, row);
});

route("POST", "/appointments/:id/cancel", ({ db, p }) => {
  const user = need(db, "student");
  const row = db.appts.find((a) => a.id === p[0] && a.student_id === user.id);
  if (!row) fail(404, "not_found", "Appointment not found.");
  if (row.status === "Cancelled" || row.status === "Completed") fail(409, "not_cancellable", "This appointment cannot be cancelled.");
  const slot = db.slots.find((s) => s.id === row.slot_id);
  const hoursLeft = slot ? (new Date(slot.starts_at).getTime() - Date.now()) / 3_600_000 : 0;
  if (hoursLeft < db.settings.cancellation_window_hours) {
    fail(409, "too_late", `Cancellations must be made at least ${db.settings.cancellation_window_hours} hours before the appointment.`);
  }
  row.status = "Cancelled";
  row.updated_at = nowIso();
  if (slot) slot.booked = false;
  return apptDto(db, row);
});

route("GET", "/appointments/psychologist/list", ({ db }) => {
  const user = need(db, "psychologist");
  return db.appts.filter((a) => a.psychologist_id === user.id).map((a) => apptDto(db, a));
});

route("PATCH", "/appointments/psychologist/:id/status", ({ db, body, p }) => {
  const user = need(db, "psychologist");
  const row = db.appts.find((a) => a.id === p[0] && a.psychologist_id === user.id);
  if (!row) fail(404, "not_found", "Appointment not found.");
  const allowed = ["Pending", "Confirmed", "Completed", "Cancelled"];
  if (!allowed.includes(body.status)) fail(400, "invalid_status", "That status is not allowed.");
  row.status = body.status;
  row.updated_at = nowIso();
  return apptDto(db, row);
});

// Notifications
route("GET", "/notifications", ({ db }) => {
  const user = need(db);
  return db.notifs
    .filter((n) => n.user_id === user.id)
    .map((n) => ({ id: n.id, title: n.title, body: n.body, read: n.read, created_at: n.created_at }));
});

route("POST", "/notifications/read-all", ({ db }) => {
  const user = need(db);
  db.notifs.forEach((n) => {
    if (n.user_id === user.id) n.read = true;
  });
  return undefined;
});

// Consent
route("GET", "/consent", ({ db }) => {
  const user = need(db, "student");
  return db.consents
    .filter((c) => c.student_id === user.id)
    .map((c) => ({ psychologist_id: c.psychologist_id, scope: c.scope, granted: c.granted, updated_at: c.updated_at }));
});

route("PUT", "/consent", ({ db, body }) => {
  const user = need(db, "student");
  let row = db.consents.find((c) => c.student_id === user.id && c.psychologist_id === body.psychologist_id && c.scope === body.scope);
  if (!row) {
    row = { student_id: user.id, psychologist_id: String(body.psychologist_id), scope: String(body.scope), granted: false, updated_at: nowIso() };
    db.consents.push(row);
  }
  row.granted = Boolean(body.granted);
  row.updated_at = nowIso();
  return { psychologist_id: row.psychologist_id, scope: row.scope, granted: row.granted, updated_at: row.updated_at };
});

// Psychologist directory and profiles. Routes for "me" come first so they are not read as an :id.
route("GET", "/psychologists/me/profile", ({ db }) => profileDto(db, need(db, "psychologist").id));

route("PUT", "/psychologists/me/profile", ({ db, body }) => {
  const user = need(db, "psychologist");
  const p = profileOf(db, user.id);
  p.specialization = String(body.specialization ?? "");
  p.bio = String(body.bio ?? "");
  p.experience_years = Number(body.experience_years ?? 0);
  p.fee_amount = body.fee_amount === null || body.fee_amount === undefined ? null : Number(body.fee_amount);
  p.fee_currency = body.fee_currency ?? null;
  p.format = body.format ?? null;
  return profileDto(db, user.id);
});

route("GET", "/psychologists/me/slots", ({ db }) => {
  const user = need(db, "psychologist");
  return db.slots.filter((s) => s.psychologist_id === user.id).map(slotDto);
});

route("POST", "/psychologists/me/slots", ({ db, body }) => {
  const user = need(db, "psychologist");
  const starts = String(body.starts_at);
  const ends = String(body.ends_at);
  if (new Date(ends).getTime() <= new Date(starts).getTime()) fail(400, "bad_time", "End time must be after start time.");
  const overlaps = db.slots.some(
    (s) => s.psychologist_id === user.id && new Date(s.starts_at) < new Date(ends) && new Date(starts) < new Date(s.ends_at),
  );
  if (overlaps) fail(409, "overlap", "This overlaps an existing time.");
  const row: SlotRow = { id: nid("s"), psychologist_id: user.id, starts_at: starts, ends_at: ends, booked: false };
  db.slots.push(row);
  return slotDto(row);
});

route("DELETE", "/psychologists/me/slots/:id", ({ db, p }) => {
  const user = need(db, "psychologist");
  const row = db.slots.find((s) => s.id === p[0] && s.psychologist_id === user.id);
  if (!row) fail(404, "not_found", "Time not found.");
  if (row.booked) fail(409, "booked", "A booked time cannot be removed.");
  db.slots = db.slots.filter((s) => s !== row);
  return undefined;
});

route("POST", "/psychologists/me/qualifications", ({ db, body }) => {
  const user = need(db, "psychologist");
  const row: QualRow = { id: nid("q"), psychologist_id: user.id, title: String(body.title ?? ""), institution: String(body.institution ?? ""), year: Number(body.year), status: "Submitted" };
  db.quals.push(row);
  return qualDto(row);
});

route("GET", "/psychologists", ({ db }) =>
  db.profiles
    .filter((p) => isPublicPsychologist(db, p.user_id))
    .map((p) => {
      const u = db.users.find((x) => x.id === p.user_id);
      return {
        user_id: p.user_id,
        name: u?.name ?? "",
        specialization: p.specialization,
        experience_years: p.experience_years,
        verified: p.verified,
        fee_amount: p.fee_amount,
        fee_currency: p.fee_currency,
        format: p.format,
        verified_qualifications: db.quals.filter((q) => q.psychologist_id === p.user_id && q.status === "Verified").map((q) => q.title),
      };
    }),
);

route("GET", "/psychologists/:id/slots", ({ db, p }) => {
  if (!isPublicPsychologist(db, p[0])) fail(404, "not_found", "Psychologist not found.");
  return db.slots
    .filter((s) => s.psychologist_id === p[0] && !s.booked && new Date(s.starts_at).getTime() > Date.now())
    .map((s) => slotDto(s));
});

route("GET", "/psychologists/:id", ({ db, p }) => {
  if (!isPublicPsychologist(db, p[0])) fail(404, "not_found", "Psychologist not found.");
  return profileDto(db, p[0]);
});

// Resources
route("GET", "/resources", ({ db }) => db.resources.filter((r) => r.published));

// Administrator
route("GET", "/admin/settings", ({ db }) => {
  need(db, "admin");
  return { cancellation_window_hours: db.settings.cancellation_window_hours };
});

route("PUT", "/admin/settings", ({ db, body }) => {
  const admin = need(db, "admin");
  db.settings.cancellation_window_hours = Number(body.cancellation_window_hours);
  addAudit(db, admin, "settings.updated", "system", null);
  return { cancellation_window_hours: db.settings.cancellation_window_hours };
});

route("GET", "/admin/users", ({ db }) => {
  need(db, "admin");
  return db.users.map(userDto);
});

route("PATCH", "/admin/users/:id/status", ({ db, body, p }) => {
  const admin = need(db, "admin");
  const user = db.users.find((u) => u.id === p[0]);
  if (!user) fail(404, "not_found", "User not found.");
  user.status = body.status === "suspended" ? "suspended" : "active";
  addAudit(db, admin, `user.${user.status}`, "user", user.id);
  return userDto(user);
});

route("GET", "/admin/psychologists", ({ db }) => {
  need(db, "admin");
  return db.users
    .filter((u) => u.role === "psychologist")
    .map((u) => {
      const p = profileOf(db, u.id);
      return {
        user_id: u.id,
        name: u.name,
        email: u.email,
        specialization: p.specialization,
        verified: p.verified,
        published: p.published,
        qualifications: db.quals.filter((q) => q.psychologist_id === u.id).map(qualDto),
      };
    });
});

route("POST", "/admin/psychologists/:id/verification", ({ db, body, p }) => {
  const admin = need(db, "admin");
  const profile = profileOf(db, p[0]);
  profile.verified = Boolean(body.verified);
  if (!profile.verified) profile.published = false;
  addAudit(db, admin, profile.verified ? "psychologist.verified" : "psychologist.unverified", "psychologist", p[0]);
  return undefined;
});

route("POST", "/admin/psychologists/:id/publication", ({ db, body, p }) => {
  const admin = need(db, "admin");
  const profile = profileOf(db, p[0]);
  const published = Boolean(body.published);
  if (published && !profile.verified) fail(409, "not_verified", "Verify the psychologist before publishing.");
  profile.published = published;
  addAudit(db, admin, published ? "profile.published" : "profile.unpublished", "psychologist", p[0]);
  return undefined;
});

route("POST", "/admin/qualifications/:id/review", ({ db, body, p }) => {
  const admin = need(db, "admin");
  const qual = db.quals.find((q) => q.id === p[0]);
  if (!qual) fail(404, "not_found", "Qualification not found.");
  qual.status = body.status === "Verified" ? "Verified" : "Rejected";
  addAudit(db, admin, `qualification.${qual.status.toLowerCase()}`, "qualification", qual.id);
  return undefined;
});

route("GET", "/admin/audit", ({ db }) => {
  need(db, "admin");
  return db.audit;
});

route("GET", "/admin/resources", ({ db }) => {
  need(db, "admin");
  return db.resources;
});

route("POST", "/admin/resources", ({ db, body }) => {
  const admin = need(db, "admin");
  const row: ResourceRow = {
    id: nid("r"),
    title: String(body.title ?? ""),
    category: String(body.category ?? ""),
    summary: String(body.summary ?? ""),
    body: Array.isArray(body.body) ? body.body : [],
    source: String(body.source ?? ""),
    reading_minutes: Number(body.reading_minutes ?? 0),
    published: Boolean(body.published),
    updated_at: nowIso(),
  };
  db.resources.push(row);
  addAudit(db, admin, "resource.created", "resource", row.id);
  return row;
});

route("PUT", "/admin/resources/:id", ({ db, body, p }) => {
  const admin = need(db, "admin");
  const row = db.resources.find((r) => r.id === p[0]);
  if (!row) fail(404, "not_found", "Resource not found.");
  Object.assign(row, {
    title: String(body.title ?? row.title),
    category: String(body.category ?? row.category),
    summary: String(body.summary ?? ""),
    body: Array.isArray(body.body) ? body.body : row.body,
    source: String(body.source ?? ""),
    reading_minutes: Number(body.reading_minutes ?? row.reading_minutes),
    published: Boolean(body.published),
    updated_at: nowIso(),
  });
  addAudit(db, admin, "resource.updated", "resource", row.id);
  return row;
});

// ---------- entry point ----------

export async function demoApi<T>(method: string, path: string, body?: unknown): Promise<T> {
  const db = load();
  const clean = path.split("?")[0];
  for (const r of ROUTES) {
    if (r.method !== method) continue;
    const match = r.re.exec(clean);
    if (!match) continue;
    const result = r.handler({ db, body: (body ?? {}) as Body, p: match.slice(1) });
    save(db);
    return result as T;
  }
  fail(404, "not_found", "This demo does not include that action.");
}
