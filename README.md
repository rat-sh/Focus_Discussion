# Focus Lock

Focus Lock is a study-room app for small groups, with rooms, friends, shared study materials, scheduling, and a quality-over-quantity focus timer. Focus tracking runs on-device and estimates presence and behavior; it does not measure understanding.

The project is a Bun workspace with a React/Vite frontend, a shared Zod contract package, and a Bun/Hono API. The frontend starts in mock mode. Live features use Supabase, Postgres, Valkey, and LiveKit.

## Quick start

```powershell
bun install
bun run dev
```

Open <http://localhost:5173>. The default mock mode is a UI preview and does not connect to real accounts, cameras, microphones, or shared room services.

Run the frontend checks with:

```powershell
bun run check
```

For live setup, backend integration tests, and contribution guidance, see [RUNNING_AND_CONTRIBUTING.md](./RUNNING_AND_CONTRIBUTING.md). Never commit local environment files, credentials, dependency folders, or build output.
