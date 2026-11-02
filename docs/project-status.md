# Project status

Last updated: 2 November 2026. Scope: the master prompt's phases 0–13, against what is in this repository.

**Status key:** Done · Partial (built, with a noted gap) · Pending (needs a decision, content, or infrastructure outside this repository).

## Phase summary

| Phase | Area | Status | Notes |
|---|---|---|---|
| 0 | Analyse the brief, traceability | Done | `docs/requirements-traceability.md`; screens SCR-01 to SCR-17 mapped to routes and endpoints |
| 1 | Windows environment | Done | Verified on this PC: Git, Node 24, Python 3.13, PostgreSQL 18, VS Code. Steps in `docs/setup-guide.md`. |
| 2 | Database architecture | Done | 21 tables, constraints, indexes, migrations, seed script, database tests. See `docs/database-design.md`. |
| 3 | Design system | Done | Palette and typography from the brief; shadcn/ui components; responsive navigation; focus states; reduced motion. Partial: tablet uses the mobile navigation. |
| 4 | Authentication and authorization | Done | Sign-up, log-in, log-out, idle and absolute session expiry, Argon2 hashing, password reset, roles, account status, CSRF, rate limiting, HTTP-only cookies, no tokens in browser storage. Pending: email delivery for reset links; HTTPS (`COOKIE_SECURE`). |
| 5 | Student workspace | Done | Dashboard, mood/stress/sleep with validation and edits, progress charts with range filters, private encrypted journal, resources, questionnaire flow. Pending: approved questionnaire content (A-05), so no questionnaire can be taken yet. |
| 6 | Directory and booking | Done | Search and filters; verified badges; transactional booking; double-booking protection; cancellation window; status transitions; in-app notifications. Partial: rescheduling is cancel-then-rebook. Time zones: stored in UTC, shown in the browser's zone. |
| 7 | Psychologist workspace | Done | Profile, fee and format, qualification submission and review status, availability (overlaps refused), appointment list and detail, status changes, consent-gated student information. Partial: availability is a list, not a calendar grid. |
| 8 | Administrator workspace | Done | Overview counts, user suspension and reactivation, verification and publication, qualification review, resource create and edit, cancellation-window setting, audit log. Pending: creating or deleting users and resources. |
| 9 | Backend API | Done | 57 endpoints across `/api/v1`, documented in `docs/api-documentation.md` and generated at `/docs` in development. |
| 10 | Frontend integration | Done | Typed client (`frontend/lib/api/client.ts`); all screens use the API; expiry handled (401 returns to log-in); server and client validation; loading, empty and error states; duplicate-submit prevention; pagination on long lists (client-side). |
| 11 | Privacy, safety, security | Partial | Consent, least privilege, ownership checks, validation, safe errors, export and deletion, audit trail, encrypted journal, backup guidance done. Pending: retention periods (decision needed); verified crisis contacts (A-06); reviewed privacy notice and terms (drafts only); structured security logging. |
| 12 | Testing | Done | Backend 74 tests; frontend unit tests 12; end-to-end 40 (20 journeys on desktop and mobile). Pending: automated accessibility audit; load testing. |
| 13 | Final validation | Partial | Clean-database migration tested by the reset script; all test suites pass; access rules tested; responsive checks on two viewports. Pending: tablet viewport checks; manual screen-reader pass; penetration test; production deployment. |

## What the system does not yet do

These are known and recorded here so they are not forgotten:

1. **No real email.** Password reset links are written to the backend log in development.
2. **No HTTPS in development.** Set `COOKIE_SECURE=true` once served over TLS.
3. **Content is placeholder.** Resources are marked as placeholders; no questionnaire is approved; crisis contacts are not listed; the privacy notice and terms are drafts (A-03, A-05, A-06, A-15, A-17).
4. **Retention periods are not decided.** The privacy notice says so.
5. **Notifications are in-app only** (A-13).
6. **Administrators cannot yet create users or delete resources** from the interface.
7. **Lists are capped:** up to 500 users, 500 audit entries and 1,000 check-ins are returned at once. Server-side paging is the next step if the data grows.
8. **Development seed accounts** with known passwords exist in the development database. They must not exist in production.

## Next steps, in order

1. Decide the open content items (A-03, A-05, A-06, A-15, A-17) and the retention periods.
2. Choose an email provider for password reset, and configure it.
3. Set up HTTPS and a deployment target; set `COOKIE_SECURE=true`; remove the development accounts.
4. Run a security review and a penetration test.
5. Add server-side paging, the calendar view for availability, and administrator user and resource management.
