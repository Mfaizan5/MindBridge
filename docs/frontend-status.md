# MindBridge — Frontend status against the master prompt

Last checked: 31 October 2026. Scope: the Next.js frontend only (`frontend/`). The backend, database and API (master prompt Phases 2, 4 server side, 9, and 10 integration) are not started.

**Read this first.** All data lives in the browser (localStorage) through a pure domain layer in `frontend/lib/domain/`. Passwords are not checked, nothing is encrypted, and no request reaches a server. Items marked *frontend only* are working UI, not secure features.

Status key: **Done** = built and tested · **Partial** = built with a noted gap · **Blocked** = needs the backend or reviewed content · **Not started**.

## Verification run

| Check | Command (run in `frontend/`) | Result |
|---|---|---|
| Type check (strict) | `npm run typecheck` | Pass |
| Lint | `npm run lint` | Pass |
| Unit tests (domain rules, selectors, statistics, validation) | `npm run test` | 60 passed |
| Production build | `npm run build` | Pass, every route compiles |
| End-to-end (Playwright, Chromium) | `npm run build` then `npm run test:e2e` | 28 passed (14 scenarios × desktop and mobile) |

## Stack (master prompt §2)

| Item | Status | Notes |
|---|---|---|
| Next.js App Router, React, TypeScript strict | Done | Next 16.4.3, React 19.3, `strict: true` |
| Tailwind CSS | Done | Palette tokens from the brief in `app/globals.css` |
| shadcn/ui | Partial | Button, Input, Label, Textarea, Card, Badge, Checkbox, Progress, AlertDialog, Alert are shadcn components. Selects are native `<select>` elements styled to match. |
| Lucide React icons | Done | |
| React Hook Form | Done | Every form except the booking picker and the questionnaire steps |
| Zod validation | Done | Schemas in `lib/schemas/`. The domain layer repeats the key rules, so the store is safe without the form. |
| Recharts | Done | Shared `components/charts/trend-chart.tsx` |
| Typed API client | Blocked | No backend. The seam is `lib/store.tsx`, which calls the domain layer. Replacing it with a fetch client is the next integration step. |
| Playwright | Done | `tests/e2e/`, config in `playwright.config.ts` |
| Vitest (added) | Done | Unit tests in `tests/unit/`. Not named in the prompt; added so the domain rules can be tested without a browser. |

## Project structure (master prompt §4)

| Planned | Actual | Why it differs |
|---|---|---|
| `app/` | `app/` | Routes are grouped `(student)`, `admin/`, `psychologist/workspace/` |
| `components/ui`, `layout`, `forms`, `charts` | `components/ui` (shadcn), `common`, `layout`, `charts` | Forms are built from `common/form-field` and page-level forms, not a separate folder |
| `features/` | not created | Feature code sits beside its route to avoid empty folders. |
| `hooks/`, `services/`, `types/` | `lib/` (types, store, selectors, domain) | One place for the data layer keeps the business rules testable |
| `tests/` | `tests/unit/`, `tests/e2e/` | |

## Screens (SCR-01 to SCR-17) and features

| Screen | Status | What works (frontend only) |
|---|---|---|
| SCR-01 Splash | Done | Landing page with how-it-works, what-it-is-not, and privacy notes. No clinical claims. |
| SCR-02 Login / Sign up | Partial | Forms validated with Zod. **Login does not check passwords** (backend, Phase 4). Demo accounts are shown on the login page and must be removed before any real use. |
| SCR-03 Student dashboard | Done | Welcome, daily check-in, recent activity, upcoming appointments, weekly summary, shortcuts |
| SCR-04 Mood / stress / sleep | Done | Mood, stress 1–10, sleep in half-hour steps, date and time, optional note. Correct and delete (delete asks first). Pagination. |
| SCR-05 Wellness questionnaire | Blocked | Flow built (one question per screen, Previous/Next/Submit, progress). No approved content yet (A-05), so it shows "Not available yet". Results record the questionnaire version. No scoring. |
| SCR-06 Results | Partial | Non-diagnostic wording. Shows "not available" because no scoring exists (correct, see A-05). |
| SCR-07 Progress | Done | Mood, stress and sleep charts with 7-day, 30-day and all-records filters. Each chart has a text summary and a value list. Explains how to read ratings. |
| SCR-08 Resources | Done | Categories, source shown, drafts hidden from students |
| SCR-09 Psychologist directory | Done | Name and specialization search, "has open times" filter. Verified vs "Verification pending" badges. Unpublished profiles are hidden (decision, VR-11). |
| SCR-10 Psychologist profile | Done | Qualifications with status, fee and format only when confirmed, open times |
| SCR-11 Booking | Done | Date then time. Taken and past times are refused. Confirmation shown only after success. Cancellation policy from settings. |
| SCR-12 Appointments | Done | Upcoming and past. Cancel is allowed only outside the cancellation window (placeholder 24 h, A-15). Moving an appointment is cancel-then-rebook. |
| SCR-13 Private journal | Done | Create, edit, delete with confirmation, pagination. Only the owner can see entries. |
| SCR-14 Profile & settings | Done | Name and email (validated, unique), sharing choices per psychologist and per category, data export (JSON), account deletion, log out. Password change is **not** available (backend). |
| SCR-15 Help & safety | Blocked | Public page. Crisis numbers are not listed until verified for the region (A-06). |
| SCR-16 Psychologist workspace | Done | Dashboard counts, profile editing, qualification submission with review status, verification status, availability (add and remove, overlaps refused), appointment list and details |
| SCR-17 Admin workspace | Done | Overview counts, user list with suspend and reactivate (audited), verification and qualification review, publish or hide profiles, resource create and edit, cancellation-window setting, audit log with pagination |

## Cross-cutting frontend requirements (master prompt §8–§16)

| Requirement | Status | Notes |
|---|---|---|
| Design system: palette, type, spacing, responsive | Done | Mobile bottom navigation; desktop sidebar from `lg`. Tablet uses the mobile layout. |
| Buttons, forms, error states, focus indicators, reduced motion | Done | Focus ring on `:focus-visible`; `prefers-reduced-motion` respected |
| Dialogs and confirmation before destructive actions | Done | AlertDialog for delete, cancel, suspend, remove, and account deletion |
| Loading, empty, success and error states | Done | Notices use `role="alert"` for errors and warnings |
| Keyboard navigation | Partial | Native controls, labelled, with focus states. Not hand-tested with a screen reader. |
| Session expiry | Partial | Frontend only: ends after 30 minutes of inactivity, with a message. Real session handling is backend (Phase 4). |
| Role-based route protection | Partial | Frontend guard: students cannot open staff pages and vice versa (tested). **The backend must enforce this for every API call.** |
| Duplicate-submit prevention | Done | Submit buttons disable while a form is submitting |
| Pagination for long lists | Done | Client-side (mood, journal, users, audit). Move to server paging with the API. |
| No fabricated data in production screens | Partial | Demo data is labelled development-only: fictional people, generated dates, demo accounts on the login page |
| Accessible chart labels and empty states | Done | Charts have role="img" with a summary; a value list is available |
| Privacy notice, terms | Done (draft) | Marked "draft, to be reviewed". Not legal advice. No compliance claim. |
| Help and safety with verified resources | Blocked | Placeholder only (A-06, A-17) |

## Not built (needs the backend or a decision)

- Passwords: hashing, real login, password reset (A-12), rate limiting, CSRF, HTTP-only cookies.
- Server-side validation and authorization for every route. Ownership is enforced in the domain layer, which is not a security boundary.
- PostgreSQL persistence, migrations, seed scripts, transactional double-booking protection (currently sequential checks, tested).
- Audit logs stored server-side, retention and deletion policies, backups.
- Notifications by email or SMS (in-app only, A-13).
- Time zones: slots and check-ins are stored as local date and time. Multi-time-zone support needs a decision (A-07).
- Reviewed questionnaire content and scoring (A-05); crisis contacts (A-06); cancellation policy text (A-15); resource content review (A-17).

## Known limitations

- **Single browser, single device.** Two tabs can overwrite each other's changes.
- **Browser storage is not secure.** Any script on the same origin can read it.
- **Mood chart uses an approximate scale** (Stressed 1 to Happy 5). It is a display aid, not a score.
- **Psychologist consent check** runs against consent stored in the same browser. The backend must check consent per student.
- **Demo accounts** on the login page and demo data in `lib/seed.ts` must be removed or disabled before real use.
