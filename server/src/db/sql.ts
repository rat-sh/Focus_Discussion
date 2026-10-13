import { SQL } from 'bun'
import { env } from '../config/env'

let pool: SQL | null = null

export function getSql(): SQL {
  pool ??= new SQL(env().DATABASE_URL)
  return pool
}

export async function closeSql(): Promise<void> {
  if (pool) {
    await pool.close()
    pool = null
  }
}

export async function pingSql(): Promise<boolean> {
  try {
    const sql = getSql()
    await sql`SELECT 1 AS ok`
    return true
  } catch {
    return false
  }
}

/** Admin connection for migrations / test setup. */
export function createAdminSql(url?: string): SQL {
  const adminUrl = url ?? env().DATABASE_URL_ADMIN ?? env().DATABASE_URL
  return new SQL(adminUrl)
}
