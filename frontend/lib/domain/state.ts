import {
  makeDemoMoods,
  makeSeedSlots,
  RESOURCES,
  SEED_AUDIT,
  SEED_CONSENTS,
  SEED_PSYCHOLOGISTS,
  SEED_USERS,
} from "../seed";
import type {
  Appointment,
  AuditEntry,
  Consent,
  JournalEntry,
  ManagedUser,
  MoodRecord,
  Notification,
  PlatformSettings,
  Psychologist,
  QuestionnaireResult,
  Resource,
  Slot,
} from "../types";

// The whole application state. Owned records carry ownerId / studentId; the store filters by session.
export type AppState = {
  users: ManagedUser[];
  moods: MoodRecord[];
  journal: JournalEntry[];
  questionnaireResults: QuestionnaireResult[];
  psychologists: Psychologist[];
  slots: Slot[];
  appointments: Appointment[];
  consents: Consent[];
  notifications: Notification[];
  resources: Resource[];
  audit: AuditEntry[];
  settings: PlatformSettings;
};

export const DEFAULT_SETTINGS: PlatformSettings = {
  cancellationWindowHours: 24,
};

// Demo state for a fresh browser. `todayKey` anchors the generated demo dates.
export function createSeedState(todayKey: string): AppState {
  return {
    users: SEED_USERS,
    moods: makeDemoMoods(todayKey),
    journal: [],
    questionnaireResults: [],
    psychologists: SEED_PSYCHOLOGISTS,
    slots: makeSeedSlots(todayKey),
    appointments: [],
    consents: SEED_CONSENTS,
    notifications: [],
    resources: RESOURCES,
    audit: SEED_AUDIT,
    settings: DEFAULT_SETTINGS,
  };
}
