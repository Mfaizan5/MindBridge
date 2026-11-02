# Architecture

MindBridge is a student wellbeing platform with three parts: a Next.js frontend, a FastAPI backend and a PostgreSQL database.

```
Browser (localhost:3000)
   │  same-origin requests to /api/v1/...
   ▼
Next.js (frontend)  ──rewrite──▶  FastAPI (127.0.0.1:8000, /api/v1/...)
   │  pages, forms, charts              │  routers → services → SQLAlchemy models
   │                                    ▼
   │                              PostgreSQL 18 (mindbridge_dev / mindbridge_test)
```

## Request path

1. The browser calls `/api/v1/...` on its own origin. This keeps the session cookie first-party, so SameSite rules apply cleanly.
2. Next.js forwards `/api/v1/*` to the backend (`frontend/next.config.ts`, `API_ORIGIN`).
3. FastAPI checks the session cookie and the CSRF header (`backend/app/api/deps.py`), then the role, then the ownership of the record.
4. The service layer (`backend/app/services/`) applies the business rules and makes the database changes in one transaction.
5. Errors are returned as `{"error": {"code", "message"}}`. Internal details are logged on the server, not sent to the browser.

## Backend layout

| Folder | Contents |
|---|---|
| `app/main.py` | Application setup: CORS, security headers, error handler, router |
| `app/core/` | Settings (from environment), password and token helpers, error types, rate limiter |
| `app/api/deps.py` | Session lookup, idle and absolute timeout, CSRF check, role gates |
| `app/api/v1/` | Routers grouped by area: auth, account, wellbeing, professionals, appointments, platform |
| `app/services/` | Business rules: accounts, scheduling (booking, cancellation, status changes), privacy (consent, export, journal), wellbeing, professionals, platform (audit, notifications, settings) |
| `app/models/` | Tables, grouped by area; enumerations in `enums.py` |
| `app/schemas/` | Request and response shapes, with validation at the boundary |
| `alembic/` | Migrations |
| `scripts/` | `seed_demo.py` (development data), `reset_test_database.py` (test database only) |
| `tests/` | Pytest suite against the test database |

Repositories are not a separate layer: services query the database directly with SQLAlchemy 2.x. This keeps the code short for a project of this size. Add a repository layer if the queries become shared across many services.

## Where the rules live

| Rule | Enforced in |
|---|---|
| Only the signed-in owner can see or change a record | Every query in the service layer filters on the user's id (`_owned_*` helpers); the API returns `404` for others' records |
| Administrators are never self-created | `SignUpIn` schema accepts only student or psychologist; the service never creates administrators |
| Psychologists are verified before publication | `psychologist_profiles` check constraint, and `set_published` in `services/professionals.py` |
| No double booking | `SELECT … FOR UPDATE` on the slot, an explicit live-booking check, and the partial unique index as the final guard |
| No overlapping availability | Exclusion constraint `slots_no_overlap` in PostgreSQL |
| Cancellation window | `services/scheduling.py` using the administrator's setting (default 24 hours) |
| Status changes | `TRANSITIONS` table in `services/scheduling.py`; every change is recorded in `appointment_events` |
| Consent | `services/privacy.py`; the psychologist detail endpoint returns identity and mood summary only when granted |
| Journal privacy | Encrypted at rest; no route exists that returns one student's journal to anyone else |

## Security decisions

- **Sessions:** random 256-bit tokens in an HTTP-only, SameSite=Lax cookie. Only the SHA-256 hash is stored. Sessions end after 30 idle minutes or 8 hours in total. Password reset and account suspension end sessions.
- **Passwords:** Argon2id (library defaults). Login checks the password before the role, so the role is not revealed to someone who does not know the password. Unknown emails also run a hash check, to keep response times similar.
- **CSRF:** a per-session token that must be sent in the `X-CSRF-Token` header on every state change. The token is held in browser memory only, never in localStorage.
- **Rate limiting:** a database-backed counter per IP and per email, so limits hold across processes.
- **Errors:** safe messages only. No SQL, stack traces or secrets in responses.
- **Headers:** `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Cache-Control: no-store`.
- **Not yet in place:** HTTPS (required before real use; set `COOKIE_SECURE=true` behind TLS), email delivery for reset links, audit log retention, a Web Application Firewall, and penetration testing.

## Frontend layout

| Folder | Contents |
|---|---|
| `app/` | Routes. `(student)/`, `admin/` and `psychologist/workspace/` have role-checked layouts |
| `lib/api/client.ts` | The one place that calls the API: sends cookies, adds the CSRF header, turns errors into messages |
| `lib/store.tsx` | Loads the data a signed-in role needs and exposes actions. Maps the API's snake_case data to the shapes screens use |
| `lib/schemas/` | Zod validation for forms (the server validates again) |
| `components/` | `ui/` (shadcn/ui), `common/`, `layout/` (navigation shell and session guard), `charts/` |
| `tests/unit/` | Vitest: validation and statistics |
| `tests/e2e/` | Playwright: the user journeys, run against the real backend on the test database |

## Testing strategy

| Level | Tool | What it covers |
|---|---|---|
| Backend unit and integration | pytest + FastAPI TestClient | Every access rule, every business rule, validation, sessions, CSRF, rate limiting, password reset, concurrency, database constraints |
| Frontend unit | Vitest | Form validation rules and chart statistics |
| End to end | Playwright | Sign-up and log-in, each role's journeys, booking and cancellation, consent, administration, sessions. Runs on desktop and mobile viewports. |

End-to-end runs reset and seed the **test** database first (`backend/scripts/reset_test_database.py` refuses any database whose name does not contain `mindbridge_test`).
