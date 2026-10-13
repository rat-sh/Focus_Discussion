import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { SQL } from 'bun'

const ROOT = resolve(import.meta.dir, '../..')
const SQL_DIR = join(ROOT, 'v2_sql')

function adminUrl(): string {
  return (
    process.env.DATABASE_URL_ADMIN ??
    process.env.DATABASE_URL ??
    'postgres://studyroom_admin:localdev@127.0.0.1:5432/studyroom'
  )
}

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}

async function listMigrationFiles(): Promise<string[]> {
  const entries = await readdir(SQL_DIR)
  return entries.filter((f) => /^\d{2}_.+\.sql$/.test(f)).sort()
}

async function ensureMigrationsTable(sql: SQL): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      sha256 text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `
}

async function appliedMap(sql: SQL): Promise<Map<string, string>> {
  const rows = await sql<{ filename: string; sha256: string }[]>`
    SELECT filename, sha256 FROM schema_migrations ORDER BY filename
  `
  const map = new Map<string, string>()
  for (const r of rows) map.set(r.filename, r.sha256)
  return map
}

async function status(): Promise<void> {
  const sql = new SQL(adminUrl())
  try {
    await ensureMigrationsTable(sql)
    const applied = await appliedMap(sql)
    const files = await listMigrationFiles()
    for (const f of files) {
      const content = await readFile(join(SQL_DIR, f), 'utf8')
      const hash = sha256(content)
      const prev = applied.get(f)
      if (!prev) {
        console.info(`pending  ${f}`)
      } else if (prev !== hash) {
        console.info(`CHANGED ${f} (checksum mismatch)`)
      } else {
        console.info(`applied  ${f}`)
      }
    }
  } finally {
    await sql.close()
  }
}

async function migrate(): Promise<void> {
  const sql = new SQL(adminUrl())
  try {
    await ensureMigrationsTable(sql)
    const applied = await appliedMap(sql)
    const files = await listMigrationFiles()

    for (const f of files) {
      const content = await readFile(join(SQL_DIR, f), 'utf8')
      const hash = sha256(content)
      const prev = applied.get(f)
      if (prev) {
        if (prev !== hash) {
          throw new Error(`Migration ${f} was modified after apply (checksum mismatch)`)
        }
        continue
      }

      await sql.begin(async (tx) => {
        await tx.unsafe(content)
        await tx`
          INSERT INTO schema_migrations (filename, sha256)
          VALUES (${f}, ${hash})
        `
      })
      console.info(`applied ${f}`)
    }
  } finally {
    await sql.close()
  }
}

const args = process.argv.slice(2)
if (args.includes('--status')) {
  await status()
} else {
  await migrate()
}
