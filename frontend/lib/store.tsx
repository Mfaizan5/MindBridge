"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as d from "./domain/actions";
import { createSeedState, type AppState } from "./domain/state";
import type { Outcome } from "./domain/actions";
import type {
  AppointmentStatus,
  ConsentScope,
  ManagedUser,
  Psychologist,
  Questionnaire,
  Role,
} from "./types";
import { localDateKey } from "./validation";

// React adapter over the pure domain layer (lib/domain). It holds state, persists it to localStorage,
// tracks the signed-in session, and applies the inactivity timeout. It holds no business rules itself.
// Prototype only: browser storage is not a security boundary. The backend (Phase 4+) replaces it.

const DATA_KEY = "mindbridge:v2:data";
const SESSION_KEY = "mindbridge:v2:session";
export const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;
const TOUCH_THROTTLE_MS = 60 * 1000;

export type Session = {
  userId: string;
  role: Role;
  name: string;
  email: string;
  psychologistId: string | null;
  lastActiveAt: string;
};

export type Store = {
  ready: boolean;
  session: Session | null;
  // True when the last session ended automatically, so the login page can explain why.
  sessionExpired: boolean;
  data: AppState;
  me: ManagedUser | null;
  myPsychologist: Psychologist | null;
  // Owner-scoped views. Pages must read student data only through these.
  mine: {
    moods: AppState["moods"];
    journal: AppState["journal"];
    results: AppState["questionnaireResults"];
    appointments: AppState["appointments"];
    notifications: AppState["notifications"];
    consents: AppState["consents"];
  };
  actions: {
    signUp: (input: { name: string; email: string }) => Outcome<ManagedUser>;
    signIn: (email: string) => Outcome<ManagedUser>;
    signOut: (options?: { expired?: boolean }) => void;
    touch: () => void;
    updateAccount: (input: { name: string; email: string }) => Outcome<true>;
    deleteAccount: () => Outcome<true>;
    addMood: (input: d.MoodInput) => Outcome<string>;
    updateMood: (id: string, input: d.MoodInput) => Outcome<true>;
    deleteMood: (id: string) => Outcome<true>;
    addJournal: (content: string) => Outcome<string>;
    updateJournal: (id: string, content: string) => Outcome<true>;
    deleteJournal: (id: string) => Outcome<true>;
    saveQuestionnaireResult: (
      q: Questionnaire,
      answers: string[],
    ) => Outcome<string>;
    bookSlot: (slotId: string) => Outcome<string>;
    cancelAppointment: (id: string) => Outcome<true>;
    setAppointmentStatus: (
      id: string,
      status: AppointmentStatus,
    ) => Outcome<true>;
    addSlot: (input: {
      date: string;
      startTime: string;
      endTime: string;
    }) => Outcome<string>;
    removeSlot: (id: string) => Outcome<true>;
    updatePsychologistProfile: (input: d.ProfileInput) => Outcome<true>;
    submitQualification: (input: {
      title: string;
      institution: string;
      year: number;
    }) => Outcome<string>;
    setConsent: (
      scope: ConsentScope,
      recipientId: string,
      granted: boolean,
    ) => Outcome<true>;
    markNotificationsRead: () => void;
    setUserStatus: (
      userId: string,
      status: "active" | "suspended",
    ) => Outcome<true>;
    setPsychologistVerified: (
      psychologistId: string,
      verified: boolean,
    ) => Outcome<true>;
    setProfilePublished: (
      psychologistId: string,
      published: boolean,
    ) => Outcome<true>;
    setQualificationStatus: (
      psychologistId: string,
      qualificationId: string,
      status: "Verified" | "Rejected",
    ) => Outcome<true>;
    saveResource: (input: d.ResourceInput) => Outcome<string>;
    saveSettings: (cancellationWindowHours: number) => Outcome<true>;
  };
};

const StoreContext = createContext<Store | null>(null);

const readJson = <T,>(key: string): T | null => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
};

const NOT_LINKED: Outcome<never> = {
  ok: false,
  error: "Your account is not linked to a psychologist profile.",
};
const SESSION_ENDED: Outcome<never> = {
  ok: false,
  error: "Your session has ended. Please log in again.",
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppState>(() =>
    createSeedState("1970-01-01"),
  );
  const [session, setSession] = useState<Session | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [ready, setReady] = useState(false);

  // Latest values in refs, so back-to-back calls (e.g. a double-click) see each other's writes.
  const dataRef = useRef(data);
  const sessionRef = useRef(session);
  const lastTouchRef = useRef(0);

  const commitData = (next: AppState) => {
    dataRef.current = next;
    setData(next);
  };
  const commitSession = (next: Session | null) => {
    sessionRef.current = next;
    setSession(next);
    if (next) window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(SESSION_KEY);
  };

  // Hydrate after mount. Reading localStorage during render would break server/client matching.
  useEffect(() => {
    const stored =
      readJson<AppState>(DATA_KEY) ?? createSeedState(localDateKey());
    const storedSession = readJson<Session>(SESSION_KEY);
    const stillValid =
      storedSession !== null &&
      Date.now() - new Date(storedSession.lastActiveAt).getTime() <
        INACTIVITY_LIMIT_MS;
    dataRef.current = stored;
    sessionRef.current = stillValid ? storedSession : null;
    // One-time hydration from browser storage. Reading it during render would break server/client matching.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(stored);
    setSession(sessionRef.current);
    if (storedSession && !stillValid) {
      window.localStorage.removeItem(SESSION_KEY);
      setSessionExpired(true);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(DATA_KEY, JSON.stringify(data));
  }, [data, ready]);

  // Inactivity timeout: checked every 30 seconds, and refreshed by user activity.
  useEffect(() => {
    const check = () => {
      const current = sessionRef.current;
      if (
        current &&
        Date.now() - new Date(current.lastActiveAt).getTime() >=
          INACTIVITY_LIMIT_MS
      ) {
        commitSession(null);
        setSessionExpired(true);
      }
    };
    const id = window.setInterval(check, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const touch = () => {
    const current = sessionRef.current;
    if (!current) return;
    if (Date.now() - lastTouchRef.current < TOUCH_THROTTLE_MS) return;
    lastTouchRef.current = Date.now();
    commitSession({ ...current, lastActiveAt: new Date().toISOString() });
  };

  // Runs a pure domain step against the latest state and persists the result.
  const run = <T,>(
    fn: (state: AppState, now: Date) => d.Step<T>,
  ): Outcome<T> => {
    const step = fn(dataRef.current, new Date());
    commitData(step.state);
    if (step.outcome.ok) touch();
    return step.outcome;
  };

  // Every write runs as the signed-in user. Without a session nothing is changed.
  const withUser = <T,>(
    fn: (userId: string, role: Role, now: Date) => Outcome<T>,
  ): Outcome<T> => {
    const current = sessionRef.current;
    if (!current) return SESSION_ENDED;
    return fn(current.userId, current.role, new Date());
  };

  const myPsychologistId = (): string | null => {
    const current = sessionRef.current;
    if (!current) return null;
    return (
      dataRef.current.psychologists.find((p) => p.userId === current.userId)
        ?.id ?? null
    );
  };

  const sessionFor = (user: ManagedUser, state: AppState): Session => ({
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    psychologistId:
      state.psychologists.find((p) => p.userId === user.id)?.id ?? null,
    lastActiveAt: new Date().toISOString(),
  });

  const actions: Store["actions"] = {
    signUp: (input) => {
      const step = d.signUp(dataRef.current, input, new Date());
      if (!step.outcome.ok) return step.outcome;
      commitData(step.state);
      commitSession(sessionFor(step.outcome.value, step.state));
      setSessionExpired(false);
      return step.outcome;
    },
    signIn: (email) => {
      const step = d.signIn(dataRef.current, email);
      if (!step.outcome.ok) return step.outcome;
      commitSession(sessionFor(step.outcome.value, dataRef.current));
      setSessionExpired(false);
      return step.outcome;
    },
    signOut: (options) => {
      commitSession(null);
      setSessionExpired(Boolean(options?.expired));
    },
    touch,
    updateAccount: (input) =>
      withUser((userId) => {
        const step = d.updateProfile(dataRef.current, userId, input);
        commitData(step.state);
        if (step.outcome.ok && sessionRef.current) {
          commitSession({
            ...sessionRef.current,
            name: step.outcome.value.name,
            email: step.outcome.value.email,
          });
        }
        return step.outcome.ok ? { ok: true, value: true } : step.outcome;
      }),
    deleteAccount: () =>
      withUser((userId) => {
        const result = run((s) => d.deleteStudentAccount(s, userId));
        if (result.ok) commitSession(null);
        return result;
      }),
    addMood: (input) =>
      withUser((userId, _role, now) =>
        run((s) => d.addMood(s, userId, input, now)),
      ),
    updateMood: (id, input) =>
      withUser((userId, _role, now) =>
        run((s) => d.updateMood(s, userId, id, input, now)),
      ),
    deleteMood: (id) =>
      withUser((userId) => run((s) => d.deleteMood(s, userId, id))),
    addJournal: (content) =>
      withUser((userId, _role, now) =>
        run((s) => d.addJournal(s, userId, content, now)),
      ),
    updateJournal: (id, content) =>
      withUser((userId, _role, now) =>
        run((s) => d.updateJournal(s, userId, id, content, now)),
      ),
    deleteJournal: (id) =>
      withUser((userId) => run((s) => d.deleteJournal(s, userId, id))),
    saveQuestionnaireResult: (q, answers) =>
      withUser((userId, _role, now) =>
        run((s) => d.saveQuestionnaireResult(s, userId, q, answers, now)),
      ),
    bookSlot: (slotId) =>
      withUser((userId, _role, now) =>
        run((s) => d.bookSlot(s, userId, slotId, now)),
      ),
    cancelAppointment: (id) =>
      withUser((userId, role, now) =>
        run((s) => d.cancelAppointment(s, { userId, role }, id, now)),
      ),
    setAppointmentStatus: (id, status) =>
      withUser((userId, _role, now) =>
        run((s) => d.setAppointmentStatus(s, userId, id, status, now)),
      ),
    addSlot: (input) =>
      withUser((_userId, _role, now) => {
        const psychologistId = myPsychologistId();
        return psychologistId
          ? run((s) => d.addSlot(s, psychologistId, input, now))
          : NOT_LINKED;
      }),
    removeSlot: (id) =>
      withUser(() => {
        const psychologistId = myPsychologistId();
        return psychologistId
          ? run((s) => d.removeSlot(s, psychologistId, id))
          : NOT_LINKED;
      }),
    updatePsychologistProfile: (input) =>
      withUser(() => {
        const psychologistId = myPsychologistId();
        return psychologistId
          ? run((s) => d.updatePsychologistProfile(s, psychologistId, input))
          : NOT_LINKED;
      }),
    submitQualification: (input) =>
      withUser((_userId, _role, now) => {
        const psychologistId = myPsychologistId();
        return psychologistId
          ? run((s) => d.submitQualification(s, psychologistId, input, now))
          : NOT_LINKED;
      }),
    setConsent: (scope, recipientId, granted) =>
      withUser((userId, _role, now) =>
        run((s) => d.setConsent(s, userId, scope, recipientId, granted, now)),
      ),
    markNotificationsRead: () => {
      const current = sessionRef.current;
      if (current)
        commitData(d.markNotificationsRead(dataRef.current, current.userId));
    },
    setUserStatus: (userId, status) =>
      withUser((adminId, _role, now) =>
        run((s) => d.setUserStatus(s, adminId, userId, status, now)),
      ),
    setPsychologistVerified: (psychologistId, verified) =>
      withUser((adminId, _role, now) =>
        run((s) =>
          d.setPsychologistVerified(s, adminId, psychologistId, verified, now),
        ),
      ),
    setProfilePublished: (psychologistId, published) =>
      withUser((adminId, _role, now) =>
        run((s) =>
          d.setProfilePublished(s, adminId, psychologistId, published, now),
        ),
      ),
    setQualificationStatus: (psychologistId, qualificationId, status) =>
      withUser((adminId, _role, now) =>
        run((s) =>
          d.setQualificationStatus(
            s,
            adminId,
            psychologistId,
            qualificationId,
            status,
            now,
          ),
        ),
      ),
    saveResource: (input) =>
      withUser((adminId, _role, now) =>
        run((s) => d.saveResource(s, adminId, input, now)),
      ),
    saveSettings: (hours) =>
      withUser((adminId, _role, now) =>
        run((s) =>
          d.saveSettings(s, adminId, { cancellationWindowHours: hours }, now),
        ),
      ),
  };

  const userId = session?.userId ?? null;
  const me = userId ? (data.users.find((u) => u.id === userId) ?? null) : null;
  const myPsychologist = session?.psychologistId
    ? (data.psychologists.find((p) => p.id === session.psychologistId) ?? null)
    : null;
  const ownedBy = <T extends { ownerId?: string; studentId?: string }>(
    items: T[],
    key: "ownerId" | "studentId",
  ) => (userId ? items.filter((item) => item[key] === userId) : []);

  const store: Store = {
    ready,
    session,
    sessionExpired,
    data,
    me,
    myPsychologist,
    mine: {
      moods: ownedBy(data.moods, "ownerId"),
      journal: ownedBy(data.journal, "ownerId"),
      results: ownedBy(data.questionnaireResults, "ownerId"),
      appointments: ownedBy(data.appointments, "studentId"),
      notifications: userId
        ? data.notifications.filter((n) => n.userId === userId)
        : [],
      consents: ownedBy(data.consents, "studentId"),
    },
    actions,
  };

  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
