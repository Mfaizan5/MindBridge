"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError, setCsrfToken } from "./api/client";
import type { AccountFormValues } from "./schemas/professional";
import type {
  AppData,
  Appointment,
  AppointmentStatus,
  AuditEntry,
  Consent,
  ConsentScope,
  JournalEntry,
  ManagedUser,
  MoodRecord,
  Notification,
  Psychologist,
  Qualification,
  Questionnaire,
  Resource,
  ResourceCategory,
  Role,
  Slot,
} from "./types";

// Browser state backed by the MindBridge API. Pages read `data` (filled for the signed-in role) and call `actions`.
// Every action is a request to the server. The server enforces roles, ownership and every business rule.
// The session is an HTTP-only cookie. Only the CSRF token is held here, in memory.

export type Outcome<T> = { ok: true; value: T } | { ok: false; error: string };

export type LoginRole = "student" | "psychologist" | "admin";

export type Session = {
  userId: string;
  role: Role;
  name: string;
  email: string;
  psychologistId: string | null;
};

export type MoodInput = {
  mood: MoodRecord["mood"];
  stress: number;
  sleepHours: number;
  note: string;
  recordedOn: string;
  recordedTime: string;
};

export type ResourceInput = {
  id?: string;
  title: string;
  category: ResourceCategory;
  summary: string;
  body: string[];
  source: string;
  readingMinutes: number;
  published: boolean;
};

export type ProfileInput = {
  specialization: string;
  bio: string;
  experienceYears: number;
  fee: { amount: number; currency: string } | null;
  format: "Online" | "In person" | null;
};

export type Store = {
  ready: boolean;
  session: Session | null;
  sessionExpired: boolean;
  data: AppData;
  me: ManagedUser | null;
  myPsychologist: Psychologist | null;
  // Student-owned views. The API only returns the signed-in student's own records, so these match `data`.
  mine: {
    moods: AppData["moods"];
    journal: AppData["journal"];
    results: AppData["questionnaireResults"];
    appointments: AppData["appointments"];
    notifications: AppData["notifications"];
    consents: AppData["consents"];
  };
  actions: {
    signUp: (input: {
      name: string;
      email: string;
      password: string;
      role: "student" | "psychologist";
    }) => Promise<Outcome<ManagedUser>>;
    signIn: (
      email: string,
      role: LoginRole | undefined,
      password: string,
    ) => Promise<Outcome<ManagedUser>>;
    signOut: (options?: { expired?: boolean }) => Promise<void>;
    updateAccount: (input: AccountFormValues) => Promise<Outcome<true>>;
    deleteAccount: () => Promise<Outcome<true>>;
    addMood: (input: MoodInput) => Promise<Outcome<string>>;
    updateMood: (id: string, input: MoodInput) => Promise<Outcome<true>>;
    deleteMood: (id: string) => Promise<Outcome<true>>;
    addJournal: (content: string) => Promise<Outcome<string>>;
    updateJournal: (id: string, content: string) => Promise<Outcome<true>>;
    deleteJournal: (id: string) => Promise<Outcome<true>>;
    saveQuestionnaireResult: (
      q: Questionnaire,
      answers: string[],
    ) => Promise<Outcome<string>>;
    bookSlot: (slotId: string) => Promise<Outcome<string>>;
    cancelAppointment: (id: string) => Promise<Outcome<true>>;
    setAppointmentStatus: (
      id: string,
      status: AppointmentStatus,
    ) => Promise<Outcome<true>>;
    addSlot: (input: {
      date: string;
      startTime: string;
      endTime: string;
    }) => Promise<Outcome<string>>;
    removeSlot: (id: string) => Promise<Outcome<true>>;
    updatePsychologistProfile: (input: ProfileInput) => Promise<Outcome<true>>;
    submitQualification: (input: {
      title: string;
      institution: string;
      year: number;
    }) => Promise<Outcome<string>>;
    setConsent: (
      scope: ConsentScope,
      recipientId: string,
      granted: boolean,
    ) => Promise<Outcome<true>>;
    markNotificationsRead: () => Promise<void>;
    setUserStatus: (
      userId: string,
      status: "active" | "suspended",
    ) => Promise<Outcome<true>>;
    setPsychologistVerified: (
      psychologistId: string,
      verified: boolean,
    ) => Promise<Outcome<true>>;
    setProfilePublished: (
      psychologistId: string,
      published: boolean,
    ) => Promise<Outcome<true>>;
    setQualificationStatus: (
      psychologistId: string,
      qualificationId: string,
      status: "Verified" | "Rejected",
    ) => Promise<Outcome<true>>;
    saveResource: (input: ResourceInput) => Promise<Outcome<string>>;
    saveSettings: (cancellationWindowHours: number) => Promise<Outcome<true>>;
  };
};

// ---------- API shapes (snake_case, as the backend returns them) ----------

type UserDto = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "suspended";
  created_at: string;
};
type SessionDto = { user: UserDto; csrf_token: string };
type MoodDto = {
  id: string;
  mood: MoodRecord["mood"];
  stress: number;
  sleep_hours: string | number;
  note: string;
  recorded_at: string;
};
type JournalDto = {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
};
type QualificationDto = {
  id: string;
  title: string;
  institution: string;
  year: number;
  status: Qualification["status"];
};
type SlotDto = {
  id: string;
  psychologist_id: string;
  starts_at: string;
  ends_at: string;
  booked: boolean;
};
type AppointmentDto = {
  id: string;
  slot_id: string;
  psychologist_id: string;
  psychologist_name: string;
  student_id: string;
  status: AppointmentStatus;
  starts_at: string;
  ends_at: string;
  created_at: string;
  updated_at: string;
};
type DirectoryDto = {
  user_id: string;
  name: string;
  specialization: string;
  experience_years: number;
  verified: boolean;
  fee_amount: string | number | null;
  fee_currency: string | null;
  format: Psychologist["format"];
  verified_qualifications: string[];
};
type ProfileDto = {
  user_id: string;
  name: string;
  specialization: string;
  bio: string;
  experience_years: number;
  fee_amount: string | number | null;
  fee_currency: string | null;
  format: Psychologist["format"];
  verified: boolean;
  published: boolean;
  qualifications: QualificationDto[];
};
type AdminPsychologistDto = {
  user_id: string;
  name: string;
  email: string;
  specialization: string;
  verified: boolean;
  published: boolean;
  qualifications: QualificationDto[];
};
type ResourceDto = {
  id: string;
  title: string;
  category: ResourceCategory;
  summary: string;
  body: string[];
  source: string;
  reading_minutes: number;
  published: boolean;
  updated_at: string;
};
type NotificationDto = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
};
type ConsentDto = {
  psychologist_id: string;
  scope: ConsentScope;
  granted: boolean;
  updated_at: string;
};
type AuditDto = {
  id: string;
  actor_name: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  created_at: string;
};
type SettingsDto = { cancellation_window_hours: number };

// ---------- mapping helpers ----------

const pad = (n: number) => String(n).padStart(2, "0");

// Local calendar date and time for display and for the forms. The API stores UTC instants.
export const localDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const localTime = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
// Turns a local date and time from a form into an instant with an offset, which the API requires.
const toInstant = (date: string, time: string) =>
  new Date(`${date}T${time}:00`).toISOString();

const mapUser = (u: UserDto): ManagedUser => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  status: u.status,
  createdAt: u.created_at,
});

const mapQualification = (q: QualificationDto): Qualification => ({
  id: q.id,
  title: q.title,
  institution: q.institution,
  year: q.year,
  status: q.status,
});

const mapSlot = (s: SlotDto, bookedBy: string | null = null): Slot => ({
  id: s.id,
  psychologistId: s.psychologist_id,
  date: localDate(s.starts_at),
  startTime: localTime(s.starts_at),
  endTime: localTime(s.ends_at),
  bookedBy,
});

const mapAppointment = (a: AppointmentDto): Appointment => ({
  id: a.id,
  slotId: a.slot_id,
  psychologistId: a.psychologist_id,
  studentId: a.student_id,
  status: a.status,
  createdAt: a.created_at,
  updatedAt: a.updated_at,
});

const mapMood = (m: MoodDto, ownerId: string): MoodRecord => ({
  id: m.id,
  ownerId,
  mood: m.mood,
  stress: m.stress,
  sleepHours: Number(m.sleep_hours),
  note: m.note,
  recordedOn: localDate(m.recorded_at),
  recordedTime: localTime(m.recorded_at),
});

const mapJournal = (j: JournalDto, ownerId: string): JournalEntry => ({
  id: j.id,
  ownerId,
  content: j.content,
  createdAt: j.created_at,
  updatedAt: j.updated_at,
});

const mapResource = (r: ResourceDto): Resource => ({
  id: r.id,
  title: r.title,
  category: r.category,
  summary: r.summary,
  body: r.body,
  source: r.source,
  readingMinutes: r.reading_minutes,
  published: r.published,
  updatedAt: r.updated_at,
});

const mapNotification = (n: NotificationDto, userId: string): Notification => ({
  id: n.id,
  userId,
  at: n.created_at,
  title: n.title,
  body: n.body,
  read: n.read,
});

const mapConsent = (c: ConsentDto, studentId: string): Consent => ({
  studentId,
  scope: c.scope,
  recipientId: c.psychologist_id,
  granted: c.granted,
  updatedAt: c.updated_at,
});

const mapAudit = (a: AuditDto): AuditEntry => ({
  id: a.id,
  at: a.created_at,
  actorId: "",
  actor: a.actor_name ?? "System",
  action: a.action,
});

const mapDirectory = (d: DirectoryDto): Psychologist => ({
  id: d.user_id,
  userId: d.user_id,
  name: d.name,
  qualifications: d.verified_qualifications.map((title, i) => ({
    id: `${d.user_id}-q${i}`,
    title,
    institution: "",
    year: 0,
    status: "Verified" as const,
  })),
  specialization: d.specialization,
  experienceYears: d.experience_years,
  bio: "",
  verified: d.verified,
  approvedProfile: true,
  fee:
    d.fee_amount === null || d.fee_currency === null
      ? null
      : { amount: Number(d.fee_amount), currency: d.fee_currency },
  format: d.format,
});

const mapProfile = (p: ProfileDto): Psychologist => ({
  id: p.user_id,
  userId: p.user_id,
  name: p.name,
  qualifications: p.qualifications.map(mapQualification),
  specialization: p.specialization,
  experienceYears: p.experience_years,
  bio: p.bio,
  verified: p.verified,
  approvedProfile: p.published,
  fee:
    p.fee_amount === null || p.fee_currency === null
      ? null
      : { amount: Number(p.fee_amount), currency: p.fee_currency },
  format: p.format,
});

const mapAdminPsychologist = (p: AdminPsychologistDto): Psychologist => ({
  id: p.user_id,
  userId: p.user_id,
  name: p.name,
  qualifications: p.qualifications.map(mapQualification),
  specialization: p.specialization,
  experienceYears: 0,
  bio: "",
  verified: p.verified,
  approvedProfile: p.published,
  fee: null,
  format: null,
});

const EMPTY_DATA: AppData = {
  users: [],
  moods: [],
  journal: [],
  questionnaireResults: [],
  psychologists: [],
  slots: [],
  appointments: [],
  consents: [],
  notifications: [],
  resources: [],
  audit: [],
  settings: { cancellationWindowHours: 24 },
};

// Loads exactly what the signed-in role may see. The server enforces the same limits on every call.
async function loadData(user: UserDto): Promise<AppData> {
  const me = mapUser(user);
  const settings = await api<SettingsDto>("GET", "/platform/settings");
  const base: AppData = {
    ...EMPTY_DATA,
    users: [me],
    settings: { cancellationWindowHours: settings.cancellation_window_hours },
  };

  if (user.role === "student") {
    const [
      moods,
      journal,
      appointments,
      notifications,
      consents,
      directory,
      resources,
    ] = await Promise.all([
      api<MoodDto[]>("GET", "/moods"),
      api<JournalDto[]>("GET", "/journal"),
      api<AppointmentDto[]>("GET", "/appointments/me"),
      api<NotificationDto[]>("GET", "/notifications"),
      api<ConsentDto[]>("GET", "/consent"),
      api<DirectoryDto[]>("GET", "/psychologists"),
      api<ResourceDto[]>("GET", "/resources"),
    ]);
    const psychologists = await Promise.all(
      directory.map(async (d) => {
        const profile = await api<ProfileDto>(
          "GET",
          `/psychologists/${d.user_id}`,
        );
        return {
          ...mapDirectory(d),
          bio: profile.bio,
          qualifications: profile.qualifications.map(mapQualification),
        };
      }),
    );
    const openSlotLists = await Promise.all(
      directory.map((d) =>
        api<SlotDto[]>("GET", `/psychologists/${d.user_id}/slots`),
      ),
    );
    const openSlots = openSlotLists.flat().map((s) => mapSlot(s));
    // Booked times the student holds appear too, so their appointment cards can show the time.
    const ownSlots = appointments.map((a) =>
      mapSlot(
        {
          id: a.slot_id,
          psychologist_id: a.psychologist_id,
          starts_at: a.starts_at,
          ends_at: a.ends_at,
          booked: true,
        },
        a.student_id,
      ),
    );
    const slots = [
      ...new Map([...openSlots, ...ownSlots].map((s) => [s.id, s])).values(),
    ];
    return {
      ...base,
      moods: moods.map((m) => mapMood(m, me.id)),
      journal: journal.map((j) => mapJournal(j, me.id)),
      appointments: appointments.map(mapAppointment),
      notifications: notifications.map((n) => mapNotification(n, me.id)),
      consents: consents.map((c) => mapConsent(c, me.id)),
      psychologists,
      slots,
      resources: resources.map(mapResource),
    };
  }

  if (user.role === "psychologist") {
    const [profile, slots, appointments, notifications] = await Promise.all([
      api<ProfileDto>("GET", "/psychologists/me/profile"),
      api<SlotDto[]>("GET", "/psychologists/me/slots"),
      api<AppointmentDto[]>("GET", "/appointments/psychologist/list"),
      api<NotificationDto[]>("GET", "/notifications"),
    ]);
    return {
      ...base,
      psychologists: [mapProfile(profile)],
      slots: slots.map((s) => mapSlot(s, s.booked ? "booked" : null)),
      appointments: appointments.map(mapAppointment),
      notifications: notifications.map((n) => mapNotification(n, me.id)),
    };
  }

  // Administrator: account management, verification, content and audit. Journal and mood content are never requested.
  const [users, psychologists, audit, resources, settingsAdmin] =
    await Promise.all([
      api<UserDto[]>("GET", "/admin/users"),
      api<AdminPsychologistDto[]>("GET", "/admin/psychologists"),
      api<AuditDto[]>("GET", "/admin/audit"),
      api<ResourceDto[]>("GET", "/admin/resources"),
      api<SettingsDto>("GET", "/admin/settings"),
    ]);
  return {
    ...base,
    users: users.map(mapUser),
    psychologists: psychologists.map(mapAdminPsychologist),
    audit: audit.map(mapAudit),
    resources: resources.map(mapResource),
    settings: {
      cancellationWindowHours: settingsAdmin.cancellation_window_hours,
    },
  };
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [ready, setReady] = useState(false);
  const sessionRef = useRef<Session | null>(null);

  const remember = useCallback((next: Session | null) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  const endSession = useCallback(
    (expired: boolean) => {
      setCsrfToken(null);
      remember(null);
      setData(EMPTY_DATA);
      setSessionExpired(expired);
    },
    [remember],
  );

  // Refreshes everything the current screen can see after a change.
  const refresh = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return;
    const me = await api<SessionDto>("GET", "/auth/me");
    setData(await loadData(me.user));
  }, []);

  const toSession = (user: UserDto): Session => ({
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    psychologistId: null,
  });

  // On first load, ask the server whether a session cookie is still valid.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await api<SessionDto>("GET", "/auth/me");
        if (cancelled) return;
        setCsrfToken(me.csrf_token);
        const next = toSession(me.user);
        const psy =
          me.user.role === "psychologist"
            ? await api<ProfileDto>("GET", "/psychologists/me/profile").catch(
                () => null,
              )
            : null;
        if (cancelled) return;
        remember({ ...next, psychologistId: psy ? psy.user_id : null });
        setData(await loadData(me.user));
      } catch (error) {
        if (
          !cancelled &&
          !(error instanceof ApiError && error.status === 401)
        ) {
          // Network or server problem: stay signed out, but do not claim the session expired.
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [remember]);

  // Runs a request, then refreshes the screen. A 401 means the server ended the session.
  const attempt = useCallback(
    async <T,>(
      run: () => Promise<T>,
      after: "refresh" | "none" = "refresh",
    ): Promise<Outcome<T>> => {
      try {
        const value = await run();
        if (after === "refresh") await refresh();
        return { ok: true, value };
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) endSession(true);
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Something went wrong. Please try again.",
        };
      }
    },
    [endSession, refresh],
  );

  const actions = useMemo<Store["actions"]>(() => {
    return {
      signUp: (input) =>
        attempt(async () => {
          const body = await api<SessionDto>("POST", "/auth/signup", {
            ...input,
            terms: true,
          });
          setCsrfToken(body.csrf_token);
          const psy =
            body.user.role === "psychologist"
              ? await api<ProfileDto>("GET", "/psychologists/me/profile").catch(
                  () => null,
                )
              : null;
          remember({
            ...toSession(body.user),
            psychologistId: psy ? psy.user_id : null,
          });
          setData(await loadData(body.user));
          setSessionExpired(false);
          return mapUser(body.user);
        }, "none"),

      signIn: (email, role, password) =>
        attempt(async () => {
          const body = await api<SessionDto>("POST", "/auth/login", {
            email,
            password,
            ...(role ? { role } : {}),
          });
          setCsrfToken(body.csrf_token);
          const psy =
            body.user.role === "psychologist"
              ? await api<ProfileDto>("GET", "/psychologists/me/profile").catch(
                  () => null,
                )
              : null;
          remember({
            ...toSession(body.user),
            psychologistId: psy ? psy.user_id : null,
          });
          setData(await loadData(body.user));
          setSessionExpired(false);
          return mapUser(body.user);
        }, "none"),

      signOut: async (options) => {
        try {
          await api("POST", "/auth/logout");
        } catch {
          // Even if the server cannot be reached, clear the screen state.
        }
        endSession(Boolean(options?.expired));
      },

      updateAccount: (input) =>
        attempt(() =>
          api<UserDto>("PATCH", "/users/me", {
            name: input.name,
            email: input.email,
          }).then(() => true as const),
        ),

      deleteAccount: async () => {
        const result = await attempt(
          () => api<void>("DELETE", "/users/me").then(() => true as const),
          "none",
        );
        if (result.ok) endSession(false);
        return result;
      },

      addMood: (input) =>
        attempt(() =>
          api<MoodDto>("POST", "/moods", {
            mood: input.mood,
            stress: input.stress,
            sleep_hours: input.sleepHours,
            note: input.note,
            recorded_at: toInstant(input.recordedOn, input.recordedTime),
          }).then((m) => m.id),
        ),

      updateMood: (id, input) =>
        attempt(() =>
          api<MoodDto>("PUT", `/moods/${id}`, {
            mood: input.mood,
            stress: input.stress,
            sleep_hours: input.sleepHours,
            note: input.note,
            recorded_at: toInstant(input.recordedOn, input.recordedTime),
          }).then(() => true as const),
        ),

      deleteMood: (id) =>
        attempt(() =>
          api<void>("DELETE", `/moods/${id}`).then(() => true as const),
        ),

      addJournal: (content) =>
        attempt(() =>
          api<JournalDto>("POST", "/journal", { content }).then((j) => j.id),
        ),

      updateJournal: (id, content) =>
        attempt(() =>
          api<JournalDto>("PUT", `/journal/${id}`, { content }).then(
            () => true as const,
          ),
        ),

      deleteJournal: (id) =>
        attempt(() =>
          api<void>("DELETE", `/journal/${id}`).then(() => true as const),
        ),

      saveQuestionnaireResult: (q, answers) =>
        attempt(() =>
          api<{ id: string }>("POST", `/questionnaires/${q.id}/results`, {
            answers,
          }).then((r) => r.id),
        ),

      bookSlot: (slotId) =>
        attempt(() =>
          api<AppointmentDto>("POST", "/appointments", {
            slot_id: slotId,
          }).then((a) => a.id),
        ),

      cancelAppointment: (id) =>
        attempt(() =>
          api<AppointmentDto>("POST", `/appointments/${id}/cancel`).then(
            () => true as const,
          ),
        ),

      setAppointmentStatus: (id, status) =>
        attempt(() =>
          api<AppointmentDto>(
            "PATCH",
            `/appointments/psychologist/${id}/status`,
            { status },
          ).then(() => true as const),
        ),

      addSlot: (input) =>
        attempt(() =>
          api<SlotDto>("POST", "/psychologists/me/slots", {
            starts_at: toInstant(input.date, input.startTime),
            ends_at: toInstant(input.date, input.endTime),
          }).then((s) => s.id),
        ),

      removeSlot: (id) =>
        attempt(() =>
          api<void>("DELETE", `/psychologists/me/slots/${id}`).then(
            () => true as const,
          ),
        ),

      updatePsychologistProfile: (input) =>
        attempt(() =>
          api<ProfileDto>("PUT", "/psychologists/me/profile", {
            specialization: input.specialization,
            bio: input.bio,
            experience_years: input.experienceYears,
            fee_amount: input.fee ? input.fee.amount : null,
            fee_currency: input.fee ? input.fee.currency : null,
            format: input.format,
          }).then(() => true as const),
        ),

      submitQualification: (input) =>
        attempt(() =>
          api<QualificationDto>(
            "POST",
            "/psychologists/me/qualifications",
            input,
          ).then((q) => q.id),
        ),

      setConsent: (scope, recipientId, granted) =>
        attempt(() =>
          api<ConsentDto>("PUT", "/consent", {
            psychologist_id: recipientId,
            scope,
            granted,
          }).then(() => true as const),
        ),

      markNotificationsRead: async () => {
        await attempt(() =>
          api<void>("POST", "/notifications/read-all").then(
            () => true as const,
          ),
        );
      },

      setUserStatus: (userId, status) =>
        attempt(() =>
          api<UserDto>("PATCH", `/admin/users/${userId}/status`, {
            status,
          }).then(() => true as const),
        ),

      setPsychologistVerified: (psychologistId, verified) =>
        attempt(() =>
          api<unknown>(
            "POST",
            `/admin/psychologists/${psychologistId}/verification`,
            { verified },
          ).then(() => true as const),
        ),

      setProfilePublished: (psychologistId, published) =>
        attempt(() =>
          api<unknown>(
            "POST",
            `/admin/psychologists/${psychologistId}/publication`,
            { published },
          ).then(() => true as const),
        ),

      setQualificationStatus: (_psychologistId, qualificationId, status) =>
        attempt(() =>
          api<unknown>(
            "POST",
            `/admin/qualifications/${qualificationId}/review`,
            { status },
          ).then(() => true as const),
        ),

      saveResource: (input) => {
        const body = {
          title: input.title,
          category: input.category,
          summary: input.summary,
          body: input.body,
          source: input.source,
          reading_minutes: input.readingMinutes,
          published: input.published,
        };
        return attempt(() =>
          (input.id
            ? api<ResourceDto>("PUT", `/admin/resources/${input.id}`, body)
            : api<ResourceDto>("POST", "/admin/resources", body)
          ).then((r) => r.id),
        );
      },

      saveSettings: (hours) =>
        attempt(() =>
          api<unknown>("PUT", "/admin/settings", {
            cancellation_window_hours: hours,
          }).then(() => true as const),
        ),
    };
  }, [attempt, endSession, remember]);

  const me = useMemo(
    () =>
      session
        ? (data.users.find((u) => u.id === session.userId) ?? null)
        : null,
    [session, data.users],
  );
  const myPsychologist = useMemo(
    () =>
      session?.psychologistId
        ? (data.psychologists.find((p) => p.id === session.psychologistId) ??
          null)
        : null,
    [session, data.psychologists],
  );
  const mine = useMemo(
    () => ({
      moods: data.moods,
      journal: data.journal,
      results: data.questionnaireResults,
      appointments: data.appointments,
      notifications: data.notifications,
      consents: data.consents,
    }),
    [data],
  );

  const value = useMemo<Store>(
    () => ({
      ready,
      session,
      sessionExpired,
      data,
      me,
      myPsychologist,
      mine,
      actions,
    }),
    [ready, session, sessionExpired, data, me, myPsychologist, mine, actions],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
