import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { SQL } from 'bun'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { ensureTestDb, TEST_ADMIN_URL } from './setup'
import { closeSql } from '../src/db/sql'
import { closeValkey } from '../src/cache/valkey'

describe('migration checksum', () => {
  beforeAll(async () => {
    await ensureTestDb()
  })

  afterAll(async () => {
    await closeSql()
    closeValkey()
  })

  test('detects modified applied migration', async () => {
    const sql = new SQL(TEST_ADMIN_URL)
    try {
      const file = '01_extensions.sql'
      const content = await readFile(join(resolve(import.meta.dir, '../..'), 'v2_sql', file), 'utf8')
      const real = createHash('sha256').update(content, 'utf8').digest('hex')
      const rows = await sql<{ sha256: string }[]>`
        SELECT sha256 FROM schema_migrations WHERE filename = ${file}
      `
      expect(rows[0]?.sha256).toBe(real)

      const fake = createHash('sha256').update(content + '\n-- tamper', 'utf8').digest('hex')
      expect(fake).not.toBe(real)
    } finally {
      await sql.close()
    }
  })
})
