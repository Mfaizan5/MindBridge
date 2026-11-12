# MindBridge frontend

Next.js 16 (App Router) with React 19, TypeScript, Tailwind CSS, shadcn/ui, React Hook Form, Zod and Recharts......

The frontend needs the backend running on `http://127.0.0.1:8000`. Requests to `/api/v1` are forwarded there by `next.config.ts` (set `API_ORIGIN` to use another address).

Full setup, including the database and the backend, is in [`../docs/setup-guide.md`](../docs/setup-guide.md).

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Development server at http://localhost:3000 |
| `npm run build` | Production build (also type-checks) |
| `npm run start` | Serve the production build (needed by the end-to-end tests) |
| `npm run typecheck` | TypeScript strict check |
| `npm run lint` | ESLint |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright). Stop servers on ports 3000 and 8000 first. Run `npm run build` first. |
| `npm run check` | Typecheck, lint, unit tests and build in sequence |

First time only, install the browser for the end-to-end tests: `npx playwright install chromium`.

## Where things are

- `app/`: routes. `(student)/`, `admin/` and `psychologist/workspace/` have role-checked layouts.
- `lib/api/client.ts`: the only place that calls the API.
- `lib/store.tsx`: loads the data for the signed-in role and exposes the actions screens use.
- `lib/schemas/`: form validation (the server validates again).
- `tests/e2e/`: browser tests; `global-setup.ts` resets and seeds the test database before each run.

## Accounts

Development accounts are listed in the setup guide. Their passwords come from `backend/.env`. Nothing in this folder contains a password.
