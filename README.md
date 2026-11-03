# MindBridge

MindBridge helps university students track everyday wellbeing and, when they choose, connect with verified psychologists. It is a wellness and support platform. It does not diagnose, treat, or replace clinical care or emergency services..

## What is included

- **Students:** mood, stress and sleep check-ins with charts; a private, encrypted journal; resources; a directory of verified psychologists; booking, cancellation and appointment history; explicit sharing choices; data export and account deletion.
- **Psychologists:** a profile with qualifications submitted for review; availability management; appointment confirmation and status updates; access to student information only where the student has consented.
- **Administrators:** account management (suspend and reactivate), psychologist verification and publication, qualification review, resource management, the cancellation-window setting, and an audit log of every sensitive action.
- **Security:** Argon2 password hashing, server-side sessions in HTTP-only cookies, CSRF protection, rate limiting, role and ownership checks on every endpoint, and database-level constraints for booking and availability.

## Repository layout

| Folder | Purpose |
|---|---|
| `frontend/` | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui, React Hook Form, Zod, Recharts |
| `backend/` | FastAPI, SQLAlchemy 2.x, Alembic, PostgreSQL (psycopg), Pydantic, pytest |
| `docs/` | Architecture, database design, API documentation, setup guide, requirements traceability, project status |

## Documentation

- [Setup guide](docs/setup-guide.md): install, configure, run, test, back up and restore (Windows PowerShell)
- [Architecture](docs/architecture.md): how the parts fit together and where the rules live
- [Database design](docs/database-design.md): tables, constraints and deletion behaviour
- [API documentation](docs/api-documentation.md): every endpoint, who may call it, and the access rules
- [Requirements traceability](docs/requirements-traceability.md): the source brief mapped to the implementation
- [Project status](docs/project-status.md): what is complete, what is pending, and why

## Quick start

See [docs/setup-guide.md](docs/setup-guide.md). In short: create the PostgreSQL databases, configure `backend/.env`, run `alembic upgrade head` and `python scripts/seed_demo.py`, then start the backend (`uvicorn app.main:app --port 8000`) and the frontend (`npm run dev`).

## Status

The application is functionally complete for the scope in the brief, with the open items listed in [docs/project-status.md](docs/project-status.md). It is not ready for real users until the production checklist in the setup guide is complete.
