# Database design

PostgreSQL 18, managed with Alembic migrations. Models live in `backend/app/models/`. The schema is created by `alembic upgrade head`; nothing is created by hand. Migration `eb23545f471b_initial_schema` is the current baseline.

## Design principles

- **One account table.** Every person has one row in `users`. Role-specific data is in separate tables (`psychologist_profiles`, `qualifications`), so no information is duplicated.
- **Ownership is a foreign key.** Every student-owned record carries `student_id` (or `owner`), and every query filters on the signed-in user.
- **Rules the database can enforce are enforced there.** Double booking, overlapping availability, out-of-range stress and sleep, and invalid status values are rejected by constraints, not only by application code.
- **Timestamps are timezone-aware.** Stored in UTC (`timestamptz`); the browser converts for display.
- **No derived analytics are stored.** Averages and counts are calculated from source records when requested.
- **Sensitive content is encrypted.** Journal text is stored as an encrypted token (Fernet) using a key from the environment.
- **Secrets are never stored in plain text.** Passwords are stored as Argon2 hashes, session and reset tokens as SHA-256 hashes.

## Tables

| Table | Purpose | Key constraints and indexes |
|---|---|---|
| `users` | Every account (student, psychologist, administrator) | Unique lower-cased email (`uq_users_email_lower`); `role` and `status` are enumerated; `password_hash` is Argon2 |
| `auth_sessions` | Server-side sessions | `token_hash` unique; `expires_at` (absolute) and `last_seen_at` (idle timeout); `csrf_token`; revoked sessions keep their row for audit |
| `password_reset_tokens` | Single-use reset links | `token_hash` unique; `expires_at`; `used_at` |
| `rate_limit_hits` | Shared counter for rate limiting | Indexed by bucket and time; old rows are removed automatically |
| `psychologist_profiles` | Professional details (one per psychologist) | Primary key is `user_id`; `published` requires `verified` (`published_requires_verified`); fee amount and currency must be set together; experience 0–70 |
| `qualifications` | Qualifications and registrations, each with a review status | Status enumerated (Submitted, Verified, Rejected); year 1950–2100; records who reviewed them and when |
| `slots` | Bookable times | Ends after it starts; 15 minutes to 4 hours; **no overlaps for the same psychologist** (`slots_no_overlap`, an exclusion constraint that uses `btree_gist`) |
| `appointments` | Bookings | Status enumerated (Pending, Confirmed, Completed, Cancelled); **at most one live booking per slot** (partial unique index `uq_appointments_active_slot` on `slot_id` where status is Pending or Confirmed) |
| `appointment_events` | History of every status change | Who changed it, from which status to which, and when |
| `mood_records` | Check-ins: mood, stress, sleep, note, time | Stress 1–10; sleep 0–24 in half-hour steps (checked in the database); note ≤500 characters |
| `journal_entries` | Private journal | `content_encrypted` holds ciphertext; cascades when the owner is deleted |
| `questionnaires` | Versioned wellness questionnaires | Status: draft or approved. Only approved content is shown to students. |
| `questionnaire_questions` | Questions and their options for each questionnaire | Position ≥1; options stored as a JSON list |
| `questionnaire_results` | A student's completed questionnaire | Stores the questionnaire version answered; no score unless approved rules exist |
| `resources` | Wellness articles | Reading time 1–60 minutes; source must not be empty; `published` controls visibility |
| `consents` | Student sharing choices per psychologist and category | Composite primary key (student, psychologist, scope); `granted` flag |
| `notifications` | In-app notifications | Read time recorded; cascades when the user is deleted |
| `audit_log` | Administrative actions (who, what, when) | Details are JSON; must never contain wellbeing content; the actor is kept as `NULL` if their account is removed |
| `platform_settings` | Key-value platform settings (cancellation window) | Primary key is the setting name |

## Relationships and deletion

- `users` → `auth_sessions`, `password_reset_tokens`, `mood_records`, `journal_entries`, `questionnaire_results`, `consents`, `notifications`, `appointments` (as student): **cascade on delete** (removing a student removes their data).
- `users` → `psychologist_profiles` → `qualifications`, `slots`: **cascade on delete**.
- `slots` → `appointments`: **restrict** (a booked slot cannot be deleted while it has a booking). `appointments` → `appointment_events`: cascade.
- `audit_log.actor_id`, `qualifications.reviewed_by`, `appointment_events.actor_id`: **set to NULL** on delete, so history is kept without the person.

## Account deletion

Deleting a student account (`DELETE /users/me`) removes their moods, journal, results, consents, notifications and appointments through cascades. Their booked times become free again, because a time is only "booked" while a live appointment references it.

## Migrations

- Create a new migration after changing a model: `.\.venv\Scripts\alembic.exe revision --autogenerate -m "describe the change"`. Read the generated file, then apply it with `alembic upgrade head`.
- The `btree_gist` extension is required by the overlap rule. The initial migration creates it first.
- Never edit a migration that has been applied to a shared database; add a new one.
