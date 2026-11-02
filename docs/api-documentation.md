# MindBridge API

Base URL in development: `http://127.0.0.1:8000/api/v1`. The browser calls the same paths through the frontend at `http://localhost:3000/api/v1`, which Next.js forwards. Interactive documentation (generated from the code) is at `http://127.0.0.1:8000/docs`, available in development only.

## Conventions

- **Authentication:** a session cookie `mb_session` (HTTP-only, SameSite=Lax; `Secure` when `COOKIE_SECURE=true`). Sessions end after 30 idle minutes or 8 hours in total.
- **CSRF:** every request that changes data (POST, PUT, PATCH, DELETE) must send the header `X-CSRF-Token` with the token returned by `POST /auth/login`, `POST /auth/signup` or `GET /auth/me`. Requests without a matching token get `403`.
- **Roles:** `student`, `psychologist`, `admin`. Every endpoint checks the role on the server. Ownership is checked on every query: other people's records return `404`, so their existence is not revealed.
- **Errors:** `{"error": {"code": "...", "message": "..."}}`. Validation failures from the request body use FastAPI's `{"detail": [...]}` format. No SQL, stack traces or credentials are ever returned.
- **Status codes:** `200` ok · `201` created · `204` no content · `401` not logged in or session ended · `403` wrong role or missing CSRF token · `404` not found (or not yours) · `409` conflict (for example a double booking) · `422` invalid input · `429` too many attempts.
- **Times:** send timezone-aware ISO 8601 timestamps (for example `2026-11-03T09:00:00+05:00`). The server stores UTC.
- **Rate limits:** login, sign-up and password-reset endpoints allow 10 attempts per minute per client by default (`RATE_LIMIT_PER_MINUTE`).

## Endpoints

"Who" lists the roles that may call the endpoint. "Any" means any logged-in user.

### System and authentication

| Method | Path | Who | Purpose |
|---|---|---|---|
| GET | `/health` | Public | Liveness check |
| POST | `/auth/signup` | Public (rate limited) | Create a student or psychologist account. Body: `name`, `email`, `password` (8–128 characters), `role` (`student` or `psychologist`), `terms: true`. Returns the session and CSRF token. Administrators cannot be created here. |
| POST | `/auth/login` | Public (rate limited) | Body: `email`, `password`, optional `role`. Sets the session cookie. A role that does not match the account gets `403`. Suspended accounts get `403`. |
| POST | `/auth/logout` | Any logged-in | Ends the current session and clears the cookie. |
| GET | `/auth/me` | Any logged-in | Current user and CSRF token. `401` when there is no valid session. |
| POST | `/auth/password-reset/request` | Public (rate limited) | Always answers the same way, whether or not the email exists. In development the reset link is written to the server log. |
| POST | `/auth/password-reset/confirm` | Public (rate limited) | Body: `token`, `password`. Single-use; ends all of the user's sessions. |

### Account

| Method | Path | Who | Purpose |
|---|---|---|---|
| GET | `/users/me` | Any logged-in | Your account |
| PATCH | `/users/me` | Any logged-in (CSRF) | Change name and email (email must be unique) |
| GET | `/users/me/export` | Student | Download all of your data as JSON, including your journal |
| DELETE | `/users/me` | Student (CSRF) | Delete your account and its data. Booked times are released. |

### Student wellbeing (private to the owner)

| Method | Path | Who | Purpose |
|---|---|---|---|
| GET | `/moods` | Student | Your check-ins. Optional `start` and `end` query times. |
| POST | `/moods` | Student (CSRF) | Record a check-in: `mood` (Happy, Okay, Low, Anxious, Stressed), `stress` (1–10), `sleep_hours` (0–24 in half-hour steps), `note` (≤500), `recorded_at` (not in the future) |
| PUT | `/moods/{record_id}` | Student (CSRF) | Correct a check-in |
| DELETE | `/moods/{record_id}` | Student (CSRF) | Delete a check-in |
| GET | `/journal` | Student | Your journal entries (decrypted for you only) |
| POST | `/journal` | Student (CSRF) | New entry, stored encrypted |
| PUT | `/journal/{entry_id}` | Student (CSRF) | Edit an entry |
| DELETE | `/journal/{entry_id}` | Student (CSRF) | Delete an entry |
| GET | `/questionnaires` | Any logged-in | Approved questionnaires only. Drafts are never listed. |
| GET | `/questionnaires/{questionnaire_id}` | Any logged-in | One approved questionnaire with its questions and options |
| POST | `/questionnaires/{questionnaire_id}/results` | Student (CSRF) | Submit answers. Each answer must be one of the question's options. Stores the version answered. No score is calculated (no reviewed scoring rules yet). |
| GET | `/questionnaires/results/{result_id}` | Student | One of your results |
| GET | `/resources` | Any logged-in | Published resources |
| GET | `/resources/{resource_id}` | Any logged-in | One published resource (drafts return `404`) |

### Consent and notifications

| Method | Path | Who | Purpose |
|---|---|---|---|
| GET | `/consent` | Student | Your sharing choices |
| PUT | `/consent` | Student (CSRF) | Body: `psychologist_id`, `scope` (`Mood records`, `Questionnaire results`, `Appointment history`), `granted`. Only published psychologists can be chosen. |
| GET | `/notifications` | Any logged-in | Your in-app notifications (newest first) |
| POST | `/notifications/read-all` | Any logged-in (CSRF) | Mark all your notifications as read |

### Psychologists (public directory and profiles)

| Method | Path | Who | Purpose |
|---|---|---|---|
| GET | `/psychologists` | Any logged-in | Published profiles only. Fee and format appear only for verified psychologists. |
| GET | `/psychologists/{psychologist_id}` | Any logged-in | Published profile with qualifications and their review status |
| GET | `/psychologists/{psychologist_id}/slots` | Any logged-in | Open times (not booked, not started) for a published psychologist |

### Psychologist workspace (own data)

| Method | Path | Who | Purpose |
|---|---|---|---|
| GET | `/psychologists/me/profile` | Psychologist | Your profile, qualifications and verification status |
| PUT | `/psychologists/me/profile` | Psychologist (CSRF) | Edit specialization, introduction, experience, fee (amount and currency together), format |
| POST | `/psychologists/me/qualifications` | Psychologist (CSRF) | Submit a qualification for review (status starts as Submitted) |
| GET | `/psychologists/me/slots` | Psychologist | Your upcoming times and whether each is booked |
| POST | `/psychologists/me/slots` | Psychologist (CSRF) | Add a time: 15 minutes to 4 hours, in the future, no overlap with your other times (the database enforces this) |
| DELETE | `/psychologists/me/slots/{slot_id}` | Psychologist (CSRF) | Remove a time. Booked times cannot be removed. |

### Appointments

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/appointments` | Student (CSRF) | Book an open time. Body: `slot_id`. Refused if the time is taken, has started, or the psychologist is not published. Protected by a row lock and a unique index. |
| GET | `/appointments/me` | Student | Your appointments |
| POST | `/appointments/{appointment_id}/cancel` | Student or the booked psychologist (CSRF) | Cancel an upcoming appointment. Students may cancel only before the cancellation window (default 24 hours, set by an administrator). |
| GET | `/appointments/psychologist/list` | Psychologist | Appointments booked with you |
| GET | `/appointments/psychologist/{appointment_id}` | Psychologist | Details. Student identity only with "Appointment history" consent. A 30-day mood summary only with "Mood records" consent. No individual entries or journal content, ever. |
| PATCH | `/appointments/psychologist/{appointment_id}/status` | Psychologist (CSRF) | Body: `status`. Allowed moves: Pending → Confirmed or Cancelled; Confirmed → Completed (only after the start) or Cancelled. Every change is recorded and the student is notified. |

### Platform

| Method | Path | Who | Purpose |
|---|---|---|---|
| GET | `/platform/settings` | Any logged-in | The cancellation window in hours, shown to students when booking |

### Administration (every endpoint requires the administrator role)

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/users` | All accounts (optional `role` filter). Account details only: no journal or mood content exists in this API for administrators. |
| PATCH | `/admin/users/{user_id}/status` | Suspend or reactivate an account. Administrators cannot suspend themselves or other administrators. Audited. |
| GET | `/admin/psychologists` | Psychologists with their verification, publication and qualifications |
| POST | `/admin/psychologists/{psychologist_id}/verification` | Verify or remove verification. Removing it also hides the profile. Audited. |
| POST | `/admin/psychologists/{psychologist_id}/publication` | Publish or hide a profile. Publishing requires verification. Audited. |
| POST | `/admin/qualifications/{qualification_id}/review` | Mark a qualification Verified or Rejected. Audited. |
| GET | `/admin/resources` | All resources, including drafts |
| POST | `/admin/resources` | Create a resource (every resource needs a source). Audited. |
| PUT | `/admin/resources/{resource_id}` | Edit a resource. Audited. |
| GET | `/admin/settings` | Platform settings |
| PUT | `/admin/settings` | Change the cancellation window (0–168 hours). Audited. |
| GET | `/admin/audit` | Newest audit entries: who did what, and when. Details never contain wellbeing content. |

## Access rules enforced in tests

Covered by `backend/tests/` (74 tests):
- A student cannot call any administrator endpoint, and a psychologist cannot call administrator or student-only endpoints.
- A student cannot read, change or delete another student's record, journal entry or questionnaire result.
- An administrator cannot read journal entries, and cannot suspend themselves or another administrator.
- Anonymous requests are refused with `401`.
- State-changing requests without a valid CSRF token are refused with `403`.
- Sessions expire after the idle timeout or the absolute lifetime. Password reset ends all sessions.
- Two students racing for one time: exactly one booking succeeds.
- Overlapping availability is refused by the database.
- Psychologists see identity and mood information only with consent.
