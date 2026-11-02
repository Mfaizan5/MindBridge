# Setup guide (Windows, PowerShell)

These steps assume the project is at `E:\zain_project\mindbridge`. Run each block in PowerShell, one at a time, and check the result before moving on.

## 1. Prerequisites

| Tool | Version used | Check |
|---|---|---|
| Git | 2.5x | `git --version` |
| Node.js and npm | Node 24, npm 11 | `node -v` and `npm -v` |
| Python | 3.13 (3.12 also works) | `py -3.13 --version` |
| PostgreSQL | 18 | the `postgresql-x64-18` service is running (`Get-Service postgresql*`) |

Find the `psql` tool at `C:\Program Files\PostgreSQL\18\bin\psql.exe`. Use the full path, or add that folder to PATH.

## 2. Create the database user and databases

Connect as the `postgres` superuser (the password you set when PostgreSQL was installed):

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h 127.0.0.1
```

At the `postgres=#` prompt, run these lines, using your own password for the application user:

```sql
CREATE ROLE mindbridge_app LOGIN PASSWORD 'choose-a-strong-password';
CREATE DATABASE mindbridge_dev OWNER mindbridge_app;
CREATE DATABASE mindbridge_test OWNER mindbridge_app;
\q
```

The application never connects as `postgres`. If you forget the superuser password, see the reset steps in the project notes; do not disable password checks permanently.

## 3. Configure the backend

```powershell
cd E:\zain_project\mindbridge\backend
Copy-Item .env.example .env
notepad .env
```

Fill in `.env`:

- `DATABASE_URL` and `TEST_DATABASE_URL`: use your application user's password. Write special characters as URL escapes (`@` becomes `%40`).
- `JOURNAL_KEY`: generate it once and keep it. **If you lose it, existing journal entries cannot be read.**

```powershell
.\.venv\Scripts\python.exe -c "import base64,secrets;print(base64.urlsafe_b64encode(secrets.token_bytes(32)).decode())"
```

- `SEED_ADMIN_PASSWORD` and `SEED_DEMO_PASSWORD`: the passwords for the development accounts.

`.env` is git-ignored. Never commit it.

## 4. Install the backend and build the database

```powershell
cd E:\zain_project\mindbridge\backend
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
alembic upgrade head
python scripts\seed_demo.py
```

Expected: `alembic upgrade head` ends with `Running upgrade  -> eb23545f471b, initial schema`, and the seed script prints `Demo data ready.`

## 5. Install the frontend

```powershell
cd E:\zain_project\mindbridge\frontend
npm install
```

## 6. Run the application

Use two PowerShell windows.

Window 1, the backend (API docs at http://127.0.0.1:8000/docs):

```powershell
cd E:\zain_project\mindbridge\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Window 2, the frontend (http://localhost:3000):

```powershell
cd E:\zain_project\mindbridge\frontend
npm run dev
```

Open http://localhost:3000. Development accounts (password from `SEED_DEMO_PASSWORD`, administrator password from `SEED_ADMIN_PASSWORD`):

| Role | Email |
|---|---|
| Student | `student@mindbridge.demo` |
| Psychologist (verified) | `amara@mindbridge.demo` |
| Psychologist (verified) | `daniel@mindbridge.demo` |
| Psychologist (not verified) | `mei@mindbridge.demo` |
| Administrator | `admin@mindbridge.com` |

Check that the API responds: `http://127.0.0.1:8000/api/v1/health` should show `{"status":"ok"}`.

## 7. Run the tests

Backend (uses `mindbridge_test` only):

```powershell
cd E:\zain_project\mindbridge\backend
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\ruff.exe check app scripts tests alembic
```

Frontend checks and unit tests:

```powershell
cd E:\zain_project\mindbridge\frontend
npm run typecheck
npm run lint
npm run test
npm run build
```

End-to-end tests (stop any servers on ports 3000 and 8000 first; the run starts its own, on a freshly reset test database):

```powershell
cd E:\zain_project\mindbridge\frontend
npx playwright install chromium   # first time only
npm run build
npm run test:e2e
```

## 8. Backup and restore

Back up the development or production database with `pg_dump` (the custom format keeps it compact and restorable):

```powershell
$env:PGPASSWORD = "your-application-password"
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U mindbridge_app -h 127.0.0.1 -Fc -f "E:\backups\mindbridge_dev_$(Get-Date -Format yyyyMMdd_HHmm).dump" mindbridge_dev
Remove-Item Env:PGPASSWORD
```

Restore into an empty database (create it first, as in step 2):

```powershell
$env:PGPASSWORD = "your-application-password"
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" -U mindbridge_app -h 127.0.0.1 -d mindbridge_dev --clean --if-exists "E:\backups\mindbridge_dev_20261102_1200.dump"
Remove-Item Env:PGPASSWORD
```

Guidance:
- Store backups outside the project folder, and encrypt them if they contain real user data.
- **Back up `backend\.env` (especially `JOURNAL_KEY`) separately and securely.** A database backup without the key cannot decrypt journal entries.
- Test a restore on a copy before relying on backups. Schedule backups with Windows Task Scheduler for any environment with real data.

## 9. Troubleshooting

| Problem | Fix |
|---|---|
| `running scripts is disabled` when activating the venv | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, then retry |
| `password authentication failed for user mindbridge_app` | The password in `.env` must match the one in `CREATE ROLE`. Special characters in the URL must be escaped (`@` → `%40`). |
| `JOURNAL_KEY is not a valid Fernet key` | Generate a new key with the command in step 3 (a 44-character URL-safe base64 value) |
| `Refusing to reset: TEST_DATABASE_URL must point at mindbridge_test` | Correct the test database name in `.env`. The reset script refuses other names on purpose. |
| `429 Too many attempts` while testing | Wait a minute, or raise `RATE_LIMIT_PER_MINUTE` in `.env` for development only |
| The page says "The server could not be reached" | The backend is not running on port 8000. Start it (step 6, window 1). |
| Login works but pages say "No profile linked" for a psychologist | Log out and log in again so the session picks up the profile |
| Port 3000 or 8000 already in use | `Get-NetTCPConnection -LocalPort 8000 -State Listen`, then stop the owning process |
| Password reset link | In development it is written to the backend window (search for `DEV password reset link`) |
| Reset the development data | Drop and recreate the database (step 2 creates it), then repeat steps 4 onwards. Keep a backup first. |

## 10. Production checklist (not yet done)

Before real users are involved, the following are required and are not in this version: HTTPS with `COOKIE_SECURE=true`; a real email service for password reset; removal of the development accounts and seed data; a reviewed privacy notice and terms (current texts are drafts); verified crisis contacts for the target region; scheduled encrypted backups; a deployment target and process; and a security review.
