import { SQL } from 'bun'
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { loadEnv } from '../src/config/env'
import { installTestSupabaseAuth, resetTestSupabaseAuth } from './supabaseAuth'

const ROOT = resolve(import.meta.dir, '../..')
const SQL_DIR = join(ROOT, 'v2_sql')

export const TEST_ADMIN_URL =
  process.env.TEST_DATABASE_URL_ADMIN ??
  'postgres://studyroom_admin:localdev@127.0.0.1:5432/studyroom_test'

export const TEST_APP_URL =
  process.env.TEST_DATABASE_URL ??
  'postgres://studyroom_app:localdev_app@127.0.0.1:5432/studyroom_test'

export const TEST_VALKEY_URL = process.env.TEST_VALKEY_URL ?? 'redis://127.0.0.1:6379'

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}

let migrated = false

export async function ensureTestDb(): Promise<void> {
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = TEST_ADMIN_URL
  process.env.DATABASE_URL_ADMIN = TEST_ADMIN_URL
  process.env.VALKEY_URL = TEST_VALKEY_URL
  process.env.SUPABASE_URL = 'http://supabase.test'
  process.env.SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.CORS_ORIGINS = 'http://localhost:5173'
  process.env.TRUST_PROXY = 'false'
  loadEnv(process.env)

  if (migrated) return

  const sql = new SQL(TEST_ADMIN_URL)
  try {
    await sql.unsafe(`
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE SCHEMA IF NOT EXISTS storage;
      DO $roles$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
          CREATE ROLE service_role NOLOGIN BYPASSRLS;
        END IF;
      END
      $roles$;
      CREATE TABLE IF NOT EXISTS auth.users (
        id uuid PRIMARY KEY,
        email text UNIQUE,
        raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb
      );
      CREATE OR REPLACE FUNCTION auth.uid()
      RETURNS uuid
      LANGUAGE sql
      STABLE
      AS $$
        SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      CREATE TABLE IF NOT EXISTS storage.buckets (
        id text PRIMARY KEY,
        name text NOT NULL,
        public boolean NOT NULL DEFAULT false,
        file_size_limit bigint,
        allowed_mime_types text[]
      );
      CREATE TABLE IF NOT EXISTS storage.objects (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        bucket_id text NOT NULL REFERENCES storage.buckets(id) ON DELETE CASCADE,
        name text NOT NULL,
        UNIQUE (bucket_id, name)
      );
      CREATE OR REPLACE FUNCTION storage.foldername(object_name text)
      RETURNS text[]
      LANGUAGE sql
      IMMUTABLE
      AS $$
        SELECT string_to_array(object_name, '/')
      $$;
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      GRANT USAGE ON SCHEMA auth, storage TO anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
    `)

    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename text PRIMARY KEY,
        sha256 text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `
    const appliedRows = await sql<{ filename: string; sha256: string }[]>`
      SELECT filename, sha256 FROM schema_migrations
    `
    const applied = new Map(appliedRows.map((r) => [r.filename, r.sha256]))
    const files = (await readdir(SQL_DIR))
      .filter((f) => /^\d{2}_.+\.sql$/.test(f))
      .sort()

    for (const f of files) {
      const content = await readFile(join(SQL_DIR, f), 'utf8')
      const hash = sha256(content)
      const prev = applied.get(f)
      if (prev) {
        if (prev !== hash) {
          throw new Error(`Test migration ${f} checksum mismatch — drop studyroom_test and retry`)
        }
        continue
      }
      await sql.begin(async (tx) => {
        await tx.unsafe(content)
        await tx`INSERT INTO schema_migrations (filename, sha256) VALUES (${f}, ${hash})`
      })
    }
    installTestSupabaseAuth(TEST_ADMIN_URL)
    migrated = true
  } finally {
    await sql.close()
  }
}

export async function truncateAll(): Promise<void> {
  const sql = new SQL(TEST_ADMIN_URL)
  try {
    await sql.unsafe('TRUNCATE auth.users CASCADE')
    resetTestSupabaseAuth()
  } finally {
    await sql.close()
  }
}
