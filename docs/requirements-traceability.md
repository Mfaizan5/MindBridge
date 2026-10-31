# MindBridge — Requirements Traceability

**Source document:** `MindBridge_Complete_App.docx` ("MindBridge — Complete App Design Brief", hand-off brief for a UI/UX designer or developer). Read in full.
**Project level:** 5th-semester university project (not an FYP).
**Product goal (source):** Help students track everyday well-being and find professional support when wanted.

**Status key:** `Not started` · `In progress` · `Done` · `Verified`
**Origin key:**
- **Explicit** — stated in the source document.
- **Derived** — implied by an explicit requirement (e.g., the screen list implies a dashboard route).
- **Assumption** — a development default chosen by us. Each one is listed in §8 and must be confirmed.
- **Recommendation** — our technical choice, not from the document.

No implementation exists yet. The "Planned in" column names the phase or module that will implement the item.

---

## 1. Roles

The source document never lists roles in one place. The roles below come from the screen descriptions.

| Role | Origin | Evidence in source | Notes |
|---|---|---|---|
| Guest (not logged in) | Derived | Splash, Login / Sign Up | Also sees public directory and profiles only if the app allows it (see A-03). |
| Student | Explicit (named in screen 16 scope and journeys) | Screens 3–15; "Student journey" | Owns mood records, questionnaire results, journal, appointments, consent. |
| Psychologist | Explicit (screen 16 "Psychologist Workspace") | Screen 16 | Manages own profile and availability; sees only consented student data. |
| Admin | Explicit (screen 17 "Admin Workspace") | Screen 17 | Manages users, resources, verification. Must not see private journal entries. |

Source requirement: privileged roles must **not** be self-assigned at sign-up (Screen 2).

---

## 2. Visual Design System (explicit)

| Token | Hex | Use (source) |
|---|---|---|
| Soft lavender | `#E9E5FF` | Main accent, selected navigation, cards |
| Mint green | `#CDEFE1` | Positive / general wellness accents |
| Soft pink | `#F8DDE5` | Gentle highlights, secondary cards |
| Pale blue | `#E7F2FF` | Information panels |
| White | `#FFFFFF` | Main background and card surfaces |
| Dark navy | `#172554` | Headings and readable text |

| Layout requirement | Value | Origin |
|---|---|---|
| Fonts | Poppins (headings); Inter or Aptos (body) | Explicit ("suggested") |
| Desktop frame | 1440 × 1024 px | Explicit |
| Mobile frame | 390 × 844 px | Explicit |
| Desktop sidebar | ~220–250 px | Explicit |
| Spacing | 8 px system | Explicit |
| Card radius | 12–16 px | Explicit |
| Body text | 14–16 px | Explicit |
| Button height | ≥ 44 px | Explicit |
| Contrast | Strong text/background contrast | Explicit |
| Responsive | Desktop sidebar; mobile bottom nav or compact menu | Explicit |
| Tone | Calm, clean, friendly; no alarming colors; no judgmental language | Explicit |

**Assumption:** Use the palette as CSS tokens in Tailwind/shadcn theme. Use WCAG AA contrast checks to confirm "strong contrast" (see §8).

---

## 3. Screen Inventory and Traceability

Each screen maps to a planned Next.js route under `frontend/app/`. Routes are a proposal (see §7) and not from the source.

| ID | Screen | Source requirements (summary) | Planned route (proposed) | Planned in | Status |
|---|---|---|---|---|---|
| SCR-01 | Splash | Logo, app name, tagline "Better Mind, Brighter Future", **Get Started** (primary), **Log In** (optional link), uncluttered | `/` | Phase 3 (UI shell) | Frontend done (mock data) |
| SCR-02 | Login / Sign Up | Email, password, Login, Create Account link, Forgot Password link, privacy policy + terms links; sign-up collects only name and email; clear validation/errors; no self-assigned privileged roles | `/login`, `/signup`, `/forgot-password` | Phase 4 (auth) | Frontend done (mock data) |
| SCR-03 | Student Dashboard | "How are you feeling today?" header; profile/notification controls; daily check-in card with mood options; quick actions: Stress Check, Sleep Tracker, My Progress, Find a Psychologist; weekly progress preview; link to resources; sidebar (desktop) / bottom nav (mobile) | `/dashboard` | Phase 5 | Frontend done (mock data) |
| SCR-04 | Mood & Stress Tracker | Mood options; stress slider 1–10; sleep duration input; optional notes; date; **Save Check-in**; correct or delete an entry; confirmation after save then return to dashboard or progress | `/mood` (+ edit/delete) | Phase 5 | Frontend done (mock data) |
| SCR-05 | Wellness Questionnaire | Explain purpose, privacy, limitations, approximate completion time before start; one question per screen; answer options; progress indicator; Previous / Next / Submit; only validated questionnaires, professionally reviewed; no invented cutoffs; not presented as diagnostic | `/questionnaire/[id]` | Phase 6 | Frontend done, content blocked (**see A-05**) |
| SCR-06 | Results & Guidance | Questionnaire name, completion date, non-diagnostic summary; general suggestions; resources; optional route to psychologist; states app does not diagnose; no "you need/don't need therapy" from score alone | `/questionnaire/results/[id]` | Phase 6 | Frontend done (mock data) |
| SCR-07 | My Progress | Line chart (mood), chart (stress), bar chart (sleep duration); 7-day / 30-day / all-records filters; labeled axes, dates, units; empty state; neutral pattern wording; shows only the logged-in student's data | `/progress` | Phase 7 | Frontend done (mock data) |
| SCR-08 | Helpful Resources | Categories: stress, sleep, exam anxiety, breathing, self-care, professional support; cards with title, short description, source, reading time, Read More; trustworthy, reviewed, simple language | `/resources`, `/resources/[id]` | Phase 8 | Frontend done (mock data) |
| SCR-09 | Psychologist Directory | Search by name or specialization; filter by availability / consultation format (if implemented); cards with name, verified qualifications, specialization, availability; fee/format shown only when confirmed; verification badge only after credentials checked | `/psychologists` | Phase 9 | Frontend done (mock data) |
| SCR-10 | Psychologist Profile | Qualifications, experience, specialization, consultation options, fee, availability; **Book Appointment** button; only psychologist-approved and (where required) verified details | `/psychologists/[id]` | Phase 9 | Frontend done (mock data) |
| SCR-11 | Appointment Booking | Choose date, then a genuinely available slot; show psychologist, date, time, fee, cancellation/rescheduling policy before confirm; save to DB; confirm only after success; simulated slots allowed for prototype | `/psychologists/[id]/book` | Phase 10 | Frontend done (mock data) |
| SCR-12 | My Appointments | Separate upcoming and past; show psychologist, date/time, format, status (Pending, Confirmed, Completed, Cancelled); details; cancel and reschedule where supported | `/appointments` | Phase 10 | Frontend done (mock data) |
| SCR-13 | Private Journal | Text area; date; Save Entry; list of previous entries; edit and delete; private by default; never auto-shared with psychologists; authenticated and access-controlled | `/journal` | Phase 7 | Frontend done (mock data) |
| SCR-14 | Profile & Settings | Edit basic details; change password; notifications; consent; privacy options; data deletion/export where supported; explain what is stored and why; Logout | `/settings` | Phase 4 (basics), Phase 11 (consent, data controls) | Frontend done (mock data) |
| SCR-15 | Help & Safety | How to reach a trusted person; professional support; verified local crisis/emergency contacts only after verification; "not an emergency monitoring service"; direct to real-world emergency help if immediate danger | `/help` | Phase 8 | Frontend done, contacts blocked (**see A-06**) |
| SCR-16 | Psychologist Workspace | Profile and credentials; availability management; appointment list and status updates; shows only consented, necessary student info | `/psychologist/workspace` (+ availability, appointments) | Phase 11 | Frontend done (mock data) |
| SCR-17 | Admin Workspace | Manage users, resources, psychologist verification workflow; role-based permissions; audit important admin actions; no journal content; no unnecessary sensitive info | `/admin/*` | Phase 12 | Frontend done (mock data) |

### Navigation (explicit)

Main nav items: Home · Mood Tracker · Wellness Check · My Progress · Resources · Psychologists · Appointments · My Journal · Profile & Settings · Help & Safety.

Role-specific nav for Psychologist and Admin is **not specified** (see A-02).

---

## 4. Functional Requirements

| ID | Feature (source §5) | Expected behavior (source, verbatim-summarized) | Origin | Planned in | Status |
|---|---|---|---|---|---|
| FR-01 | Account | Register, log in, log out, reset password | Explicit | Phase 4 | Not started |
| FR-02 | Mood records | Create, view, edit, delete own check-ins | Explicit | Phase 5 | Not started |
| FR-03 | Questionnaire | Complete an approved questionnaire; view an appropriate summary | Explicit | Phase 6 | Not started |
| FR-04 | Progress | Charts show only the logged-in student's own data | Explicit | Phase 7 | Not started |
| FR-05 | Resources | Browse resources; open details | Explicit | Phase 8 | Not started |
| FR-06 | Psychologist profiles | Search and view **verified** professional profile info | Explicit | Phase 9 | Not started |
| FR-07 | Appointments | Request, view, manage appointments; **real booking must prevent double-booking** | Explicit | Phase 10 | Not started |
| FR-08 | Consent | Student approves or declines sharing of specified information | Explicit | Phase 11 | Not started |
| FR-09 | Security | Role-based access protects records and account functions | Explicit | Phase 2–4 (enforced throughout) | Not started |
| FR-10 | Safety | Help and safety information accessible from the app | Explicit | Phase 8 | Not started |
| FR-11 | Private journal | Create, edit, view, delete; private by default; not shared with psychologists automatically | Explicit (screen 13) | Phase 7 | Not started |
| FR-12 | Profile & settings | Edit basic details; change password; logout; explain stored data | Explicit (screen 14) | Phase 4 / 11 | Not started |
| FR-13 | Data export / deletion | "Where supported" | Explicit, scope optional (see A-08) | Phase 11 | Not started |
| FR-14 | Psychologist verification workflow | Admin verifies credentials; badge only after check | Explicit (screens 9, 17) | Phase 12 | Not started |
| FR-15 | Admin audit trail | Important admin actions are audited | Explicit (screen 17) | Phase 12 | Not started |
| FR-16 | Psychologist availability management | Psychologist manages availability | Explicit (screen 16) | Phase 11 | Not started |
| FR-17 | Appointment status lifecycle | Pending, Confirmed, Completed, Cancelled | Explicit (screen 12) | Phase 10 | Not started |

---

## 5. Validation and Behavior Rules (explicit)

| ID | Rule | Screen |
|---|---|---|
| VR-01 | Email and password fields with clear validation and error messages | SCR-02 |
| VR-02 | Stress value is an integer 1–10 | SCR-04 |
| VR-03 | Sleep duration is an input (unit not stated; **assumed hours**, see A-09) | SCR-04 |
| VR-04 | Mood value is one of the mood options (list "may include" happy, okay, low, anxious, stressed; see A-10) | SCR-03, SCR-04 |
| VR-05 | Notes are optional | SCR-04, SCR-13 |
| VR-06 | Appointment slot must be genuinely available at confirmation time | SCR-11 |
| VR-07 | Confirmation shown only after successful save | SCR-04, SCR-11 |
| VR-08 | No double-booking of a psychologist slot | FR-07 |
| VR-09 | Fee and format shown only when confirmed by the psychologist | SCR-09, SCR-10 |
| VR-10 | Verification badge only after credentials checked | SCR-09 |
| VR-11 | Profile details shown only if approved (and verified where required) | SCR-10 |
| VR-12 | Privileged roles cannot be self-assigned at sign-up | SCR-02 |
| VR-13 | Sign-up collects only necessary data (name, email) | SCR-02 |
| VR-14 | Questionnaire: one question at a time; Previous / Next / Submit | SCR-05 |
| VR-15 | Results never state a diagnosis or a definite "need / don't need therapy" from a score alone | SCR-06 |
| VR-16 | Progress filters: 7-day, 30-day, all records | SCR-07 |
| VR-17 | Crisis/emergency contacts shown only after verification | SCR-15 |
| VR-18 | Psychologists see only consented, necessary student info | SCR-16 |
| VR-19 | Admins cannot see private journal content | SCR-17 |

---

## 6. Data Model (source §6)

The source gives 9 entities with suggested fields. Field names are the source's; the types and constraints are our **Recommendation** (see §7).

| Entity | Source fields | Key relationships (derived) |
|---|---|---|
| Users | user_id, name, email, role, created_at | Parent of most entities |
| MoodRecords | record_id, student_id, mood, stress_level, sleep_hours, note, recorded_at | student_id → Users |
| QuestionnaireResults | result_id, student_id, questionnaire_id, score_or_summary, completed_at | student_id → Users; questionnaire_id → (questionnaire table, not in source — see A-05) |
| Psychologists | psychologist_id, user_id, qualifications, specialization, verification_status, fee, format | user_id → Users |
| Availability | slot_id, psychologist_id, date, start_time, end_time, status | psychologist_id → Psychologists |
| Appointments | appointment_id, student_id, psychologist_id, slot_id, status, created_at | student_id → Users; psychologist_id → Psychologists; slot_id → Availability |
| Resources | resource_id, title, category, summary, content, source_url | none |
| ConsentRecords | consent_id, student_id, information_scope, recipient_id, consent_status, updated_at | student_id → Users; recipient_id → Users (assumed, see A-11) |
| JournalEntries | entry_id, student_id, protected_content, created_at, updated_at | student_id → Users |

Source instruction: "Do not store unnecessary sensitive data."

**Missing from source (needed to implement):** a questionnaire definition table (questions, options, version), a notifications preference table, and an audit log table for admin actions (FR-15). These are our **Recommendation**; see §7.

---

## 7. Our Technical Recommendations (not from the source)

These follow the master prompt's stack. The source document does not specify any of them.

| # | Recommendation | Reason |
|---|---|---|
| R-01 | Next.js App Router + TypeScript strict + Tailwind + shadcn/ui | Master prompt stack |
| R-02 | FastAPI + SQLAlchemy 2.x + Alembic + psycopg + PostgreSQL | Master prompt stack |
| R-03 | Session-based or token-based auth with hashed passwords (argon2 or bcrypt); role stored server-side, never accepted from client sign-up | Source requires secure role assignment (VR-12) |
| R-04 | Journal `protected_content` encrypted at rest with an app-level key from env (not in repo) | Source requires privacy; field name implies protected content |
| R-05 | Appointment double-booking prevented by a unique constraint on `(psychologist_id, slot_id)` plus a transaction | FR-07, VR-08 |
| R-06 | Ownership checks on every student-scoped query (`student_id = current_user`) | FR-04, FR-09 |
| R-07 | Audit log table `admin_audit_log` for admin actions | FR-15 |
| R-08 | Versioned questionnaire table (`questionnaires`, `questionnaire_questions`, `questionnaire_options`) | VR-14, SCR-05 |
| R-09 | Alembic migration for every schema change; seed script for demo data (no real personal data) | Master prompt |
| R-10 | Chart library: Recharts | Master prompt stack |

---

## 8. Ambiguous or Missing Items

Each item states the default we will use until you decide otherwise. None of these is in the source as a decision.

| ID | Gap in source | Default we will use | Needs your decision? |
|---|---|---|---|
| A-01 | Roles are described in screens but not listed | Guest, Student, Psychologist, Admin (§1) | Confirm |
| A-02 | Navigation for Psychologist and Admin is not specified | Separate sidebar per role | Confirm |
| A-03 | Can guests browse the psychologist directory without an account? | No — directory requires login | **Yes** |
| A-04 | Mood list "may include" options | Happy, Okay, Low, Anxious, Stressed (as listed) | Confirm |
| A-05 | **No questionnaire content is given.** Name, questions and scoring are not in the source. The source forbids invented cutoffs. | Build the engine with a placeholder entry marked "not for use" until a reviewed instrument is provided. No real cutoffs. | **Yes — blocks SCR-05/06 content** |
| A-06 | **Crisis/emergency contact numbers are not given.** Source requires verification. | Ship the screen with a placeholder message; no numbers until verified. | **Yes — blocks SCR-15 content** |
| A-07 | Are appointment slots real (psychologist-managed) or simulated? | Psychologist-managed slots in the database (real booking logic); no external calendar integration | Confirm |
| A-08 | Data export and deletion are "where supported" | Implement account data export (JSON) and account deletion in Phase 11 | Confirm |
| A-09 | Sleep duration unit not stated | Hours, decimal (0–24, step 0.5) | Confirm |
| A-10 | Stress scale "1–10" — integer or decimal? | Integer | Confirm |
| A-11 | `recipient_id` in ConsentRecords — who can be a recipient? | A specific psychologist (user) | Confirm |
| A-12 | Password reset delivery method (email) not specified | Email link with expiry; email sending deferred to a dev mailbox/console in local development | Confirm |
| A-13 | Notifications: channel and triggers not specified | In-app notifications only | Confirm |
| A-14 | Psychologist verification evidence and process not specified | Admin reviews uploaded credential status flag; no document upload in prototype | Confirm |
| A-15 | Appointment cancellation/rescheduling policy text not provided | Placeholder policy text; cancellation allowed up to 24 h before (placeholder) | **Yes** |
| A-16 | Fees and currency not specified | Fee stored as decimal with currency code; display only when confirmed | Confirm |
| A-17 | Resources content not provided | Seed a few clearly-marked placeholder entries; real content needs professional review | **Yes** |
| A-18 | Language | English only | Confirm |
| A-19 | Accessibility target level | WCAG 2.1 AA (our default) | Confirm |

---

## 9. Dependencies Between Features

```
Account (FR-01) ──► Roles & access control (FR-09) ──► everything below
    │
    ├─► Profile & settings (FR-12)
    ├─► Mood records (FR-02) ──► Progress charts (FR-04)
    │         └──► Dashboard quick actions (SCR-03)
    ├─► Questionnaire (FR-03) ──► Results & guidance (SCR-06)
    │         └──► needs content decision (A-05)
    ├─► Journal (FR-11)
    ├─► Resources (FR-05) ◄── Results & guidance, Help & safety
    ├─► Psychologist directory (FR-06) ──► Psychologist profile (SCR-10)
    │         └──► Appointments (FR-07) ──► Psychologist workspace (SCR-16)
    │                                    └──► Consent (FR-08) gates student data sharing
    └─► Admin workspace (SCR-17) ──► psychologist verification (FR-14) ──► directory badge (VR-10)
```

Hard dependencies: Consent (FR-08) must exist before any psychologist can see student data. Verification (FR-14) must exist before the verification badge (VR-10) can display.

---

## 10. Open Items Before Phase 1 Verification

- Confirm A-03, A-05, A-06, A-07, A-15, A-17 (the "Yes" items). Others have defaults that can be changed later.
- Phase 0 verification: a reviewer can open this file and check that every screen SCR-01 to SCR-17 and every entity in §6 appears here with a planned phase.
