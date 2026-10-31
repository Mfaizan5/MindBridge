# MindBridge frontend

Next.js (App Router) frontend for the MindBridge student wellbeing platform. The backend is not built yet: all data is stored in the browser for demonstration. See [`../docs/frontend-status.md`](../docs/frontend-status.md) for what is done and what is not.

## Requirements

- Node.js 24 or later, npm
- Windows PowerShell or any shell

## Setup

```powershell
cd E:\zain_project\mindbridge\frontend
npm install
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server at http://localhost:3000 |
| `npm run build` | Production build (also type-checks) |
| `npm run start` | Serves the production build (needed for the end-to-end tests) |
| `npm run typecheck` | TypeScript strict check |
| `npm run lint` | ESLint |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:e2e` | Browser tests (Playwright). Run `npm run build` first. |
| `npm run check` | Typecheck, lint, unit tests and build in sequence |

First-time Playwright setup: `npx playwright install chromium`.

## Layout

- `app/`: routes. `(student)/`, `admin/` and `psychologist/workspace/` have role-checked layouts.
- `components/ui/`: shadcn/ui components. `components/common/`: shared app components. `components/layout/`: navigation shell. `components/charts/`: charts.
- `lib/domain/`: pure business rules (booking, cancellation, consent, verification). Unit-tested.
- `lib/schemas/`: Zod validation for forms. `lib/store.tsx`: browser state and session.
- `lib/seed.ts`: **development demo data only** (fictional people, demo accounts).
- `tests/unit/`, `tests/e2e/`: tests.

## Demo accounts

Shown on the login page: `student@mindbridge.demo`, `amara@mindbridge.demo` (psychologist) and `admin@mindbridge.demo`. Login does not check passwords yet. Remove the demo accounts before any real use.
