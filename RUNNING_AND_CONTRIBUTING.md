# Focus Lock: Run, Test & Contribute

> **Windows / PowerShell guide — Docker is not required to run the UI.**
> For the fastest start, use **Quick start** below. Docker is only an optional way to run local backend test services.

## Choose what you want to do

| Goal | Setup needed | Go to |
|---|---|---|
| Preview the approved UI | Bun | [A. Quick start — mock mode](#a-quick-start--mock-mode) |
| Run the real app without Docker | Supabase, hosted Valkey, LiveKit | [B. Real mode setup](#b-real-mode-setup) |
| Run checks before contributing | Bun; optional Docker for backend tests | [C. Test the project](#c-test-the-project) |

### What “mock” and “real” mean

- **Mock mode** is a UI preview. It does not connect to real accounts, camera/mic, or shared room services.
- **Real mode** uses Supabase and the backend. Live video/audio additionally requires LiveKit.
- Never put passwords, database URLs, Supabase service-role keys, or LiveKit secrets in frontend files or Git. Keep secrets only in your ignored local env files.
- **Never point backend integration tests at a real database.** The tests prepare and truncate the isolated `studyroom_test` database.

## A. Quick start — mock mode

### 1. Install Bun

Open PowerShell and run:

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

Restart PowerShell if needed, then verify:

```powershell
bun --version
git --version
```

If Git is not installed, use:

```powershell
winget install --id Git.Git --exact
```

### 2. Clone and install

Paste the HTTPS clone URL provided by the project maintainer:

```powershell
$repoUrl = Read-Host "Paste the HTTPS repository clone URL"
git clone $repoUrl
$repoFolder = ($repoUrl.TrimEnd('/').Split('/')[-1] -replace '\.git$', '')
Set-Location $repoFolder
bun install --frozen-lockfile
```

Run project commands from this repository folder.

### 3. Start the UI

From the repository root, run:

```powershell
bun install --frozen-lockfile
$env:VITE_USE_MOCK = "true"
bun run dev
```

Open **http://localhost:5173**. This command uses mock mode for this terminal only; it does not overwrite `.env.local`. Leave the terminal running and press `Ctrl+C` to stop. **No Docker, API, or secrets are needed for this UI preview.**

## B. Real mode setup

> **You need for real mode:** a Supabase project, a hosted/reachable Valkey service, and a LiveKit deployment for room video/audio. Apply the project migrations to the intended Supabase database. **You do not need Docker if these services are hosted.**

### 1. Use hosted services (no Docker)

Create/configure Supabase and LiveKit, and obtain a hosted Valkey connection URL from your service provider. No local Docker installation is needed.

### 2. Create local environment files

From the repository root:

```powershell
Copy-Item .env.example .env.local
Copy-Item server/.env.example server/.env
code .env.local
code server/.env
```

Set these values in `.env.local`:

```dotenv
VITE_USE_MOCK=false
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_PUBLIC_KEY
```

Fill in the real values in `server/.env`:

| Variable | Value |
|---|---|
| `DATABASE_URL` | PostgreSQL connection URL for the intended Supabase project |
| `DATABASE_URL_ADMIN` | Admin/migration connection URL for that same project |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VALKEY_URL` | Connection URL for your hosted Valkey service; do not leave the local default unless Valkey is running on your computer |
| `LIVEKIT_URL` | LiveKit server URL |
| `LIVEKIT_API_KEY` | LiveKit server-side API key |
| `LIVEKIT_API_SECRET` | LiveKit server-side API secret |
| `YOUTUBE_API_KEY` | Optional; only needed for in-app YouTube search |

**Do not use local Docker Postgres as the real app database.** The application migration chain relies on Supabase Auth and Storage objects.

### 3. Configure Supabase Auth and apply migrations

In Supabase **Authentication → URL Configuration**, allow the password-reset callback URLs used by your app:

```text
http://localhost:5173/reset-password
http://127.0.0.1:5173/reset-password
```

Add your production callback only if you have a production domain. If email confirmation is enabled in Supabase Auth, new users must confirm their email before signing in.

After checking that the `server/.env` database URLs point to the intended Supabase project, run the numbered migrations in order:

```powershell
bun run db:migrate
bun --env-file=server/.env server/scripts/migrate.ts --status
```

The migration chain is in `v2_sql/` and currently runs from `01_extensions.sql` through `14_whiteboard_custom_colors.sql`. Apply the **whole chain in order**; for example, migration 14 depends on the whiteboard table created by migration 08. Do not apply these migrations to a database that already has the old custom-user migrations.

### 4. Start the real app with one command

Run this from the repository root:

```powershell
bun run start:real
```

The launcher installs locked dependencies, selects real mode, asks (with hidden input) for a new Supabase database password if the database URLs are not configured, starts Docker Desktop and the local Valkey container when `VALKEY_URL` is local, and opens separate API and web terminals. It saves the database URLs only to the ignored `server/.env`; it does not display the password. It does not rerun migrations already applied in Supabase. It stops with a clear message if other required settings are missing or ports 5173/8787 are already in use. Open **http://localhost:5173**. The API should report `ok`, `postgres`, and `valkey` as `true` at `http://localhost:8787/readyz`.

The SQL migration chain is not rerun by the launcher. This is intentional: apply migrations once to the intended Supabase project, not on every app start.

### 5. Manually test as a new user

1. Open **http://localhost:5173/signup** and create an account.
2. Use a valid name, username (3–24 lowercase letters, numbers, dots, or underscores), email, and password (at least 10 characters).
3. If email confirmation is enabled, confirm from the email before signing in.
4. Sign in, create a room, and copy its invite link.
5. Open a second browser or browser profile, sign in as a second user, and join that room.
6. Enable camera/mic on the join screen and allow the browser permission prompt.
7. Check participant video/audio, chat, presence, shared whiteboard/colors, and shared playback.
8. To test recovery, choose **Forgot password?** on sign in and follow the email link.

Camera and microphone work on `localhost` in supported browsers, but live room media also needs valid LiveKit settings and network access to that deployment.

## C. Test the project

### Frontend checks

```powershell
bun run check
```

This runs frontend typecheck, lint, tests, and production build.

### Backend checks

Backend integration tests are optional. If you already have Docker Desktop and want to run them against the isolated local test database:

```powershell
docker compose up -d postgres valkey
docker compose ps
bun run --cwd server check
```

The test setup uses the isolated `studyroom_test` database. **Never set test database URLs to a real or production database.** You can run the frontend checks without Docker:

```powershell
bun run check
```

Stop local services when finished:

```powershell
docker compose down
```

This preserves database volumes. Avoid `docker compose down -v` unless you intentionally want to delete local data.

### Run all checks

With backend test dependencies running:

```powershell
bun run check:all
```

A large-chunk warning from the frontend build is not, by itself, a failed build.

## D. Contribute safely

Check the worktree, then create a branch:

```powershell
git status --short
git switch -c fix/live-room-permissions
```

Choose a different short branch name if that example already exists. Keep changes focused in the relevant feature folder. For database changes, add a **new numbered migration** under `v2_sql/`; do not edit an already-applied migration. Add or update tests for behavior changes.

Before sharing your changes:

```powershell
bun run check
bun run --cwd server typecheck
bun run --cwd server lint
git diff --check
git status --short
git --no-pager diff
```

Run backend integration tests too when Docker is available:

```powershell
bun run --cwd server test
```

Never commit `.env.local`, `server/.env`, database credentials, service-role keys, LiveKit secrets, model caches, or personal test data. Local env files are ignored by Git; commit only example templates with placeholder values.

## E. Troubleshooting

### Vite reports `ECONNREFUSED` for `/api/...`

The frontend cannot reach the API. Start Terminal 2 with `bun run dev:api` and check `http://localhost:8787/healthz`.

### `/readyz` says Postgres or Valkey is unavailable

Check the URLs in `server/.env`; start local Valkey if using it. Live writes fail when Valkey is unavailable.

### API says port 8787 is already in use

Check which process owns it before taking action:

```powershell
Get-NetTCPConnection -LocalPort 8787 -State Listen |
  Select-Object LocalAddress, LocalPort, OwningProcess
```

Inspect that process using its reported process ID:

```powershell
Get-CimInstance Win32_Process -Filter "ProcessId = <PID>" |
  Select-Object ProcessId, Name, CommandLine
```

Replace `<PID>` with the number shown. Reuse the process if it is the Focus Lock API you expect. Do not stop an unidentified process.

### Stop everything

Press `Ctrl+C` in the terminals running the web app and API. Stop local Docker services while preserving their data with:

```powershell
docker compose stop
```

Start the existing services again with:

```powershell
docker compose start postgres valkey
```