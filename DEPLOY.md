# Deploy on Render

This repository deploys as one Docker web service. The Vite frontend and Hono API share the same origin, so browser API requests and the strict refresh cookie stay same-origin.

## 1. Create and migrate Supabase

1. Create a Supabase project and wait for its database to finish provisioning.
2. In the Supabase project settings, copy the PostgreSQL connection string and the project URL and anon/publishable key. The browser key is public; use only the anon/publishable key.
3. On your own machine, create or update the ignored `server/.env` with `DATABASE_URL_ADMIN` set to the Supabase PostgreSQL connection string. Do not put this file in Git.
4. From the repository root, run the migration once:

   ```sh
   bun run db:migrate
   ```

Migrations are a manual one-time setup step and are not run by the container.

## 2. Configure Render

1. Create a Render Key Value instance, or let the Blueprint create `focus-lock-valkey`. Keep the instance in the same region as the web service.
2. Create a Blueprint from this repository using `render.yaml`. It defines one Docker web service and one Key Value service.
3. In the web service's Environment settings, enter the values for the variables marked `sync: false`:
   - `DATABASE_URL`: Supabase PostgreSQL connection string for the application.
   - `DATABASE_URL_ADMIN`: Supabase PostgreSQL connection string with migration/admin privileges.
   - `SUPABASE_URL` and `SUPABASE_ANON_KEY`: Supabase project URL and anon/publishable key.
   - `CORS_ORIGINS`: the exact HTTPS origin of the Render web service.
   - `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET`: your LiveKit server settings.
   - `YOUTUBE_API_KEY`: optional YouTube Data API credential.
   - `VITE_USE_MOCK`: set to `false` for the live app.
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`: the public Supabase project URL and anon/publishable key used at build time.
4. In the web service's Docker build settings, add `VITE_USE_MOCK`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY` as Docker build arguments, using the matching environment variable values.
5. Set the `DATABASE_URL` and `DATABASE_URL_ADMIN` values to production Supabase connection strings, not local Docker Compose settings. Leave the non-secret `NODE_ENV`, `TRUST_PROXY`, `COOKIE_SECURE`, and `PORT` Blueprint values as configured.

The Blueprint supplies `VALKEY_URL` from the Key Value connection string. VITE values are public build-time settings and are passed as Docker build arguments; never put server credentials in them.

## 3. Verify deployment

After deploy, open `https://<your-service>.onrender.com/readyz`. A healthy response is:

```json
{"ok":true,"postgres":true,"valkey":true}
```

The health endpoint `/healthz` should return `{"ok":true}`. The web service health check uses `/readyz`, which reports Postgres and Valkey connectivity.
