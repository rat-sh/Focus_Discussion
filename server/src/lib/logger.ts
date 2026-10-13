type Level = 'debug' | 'info' | 'warn' | 'error'

function write(level: Level, msg: string, fields?: Record<string, unknown>): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...sanitize(fields),
  })
  if (level === 'error') {
    console.error(line)
  } else if (level === 'warn') {
    console.warn(line)
  } else {
    // intentional: structured logger only
    console.info(line)
  }
}

const SECRET_KEYS = /password|token|secret|cookie|authorization|refresh/i

function sanitize(fields?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!fields) return undefined
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(fields)) {
    out[k] = SECRET_KEYS.test(k) ? '[redacted]' : v
  }
  return out
}

export const logger = {
  debug: (msg: string, fields?: Record<string, unknown>) => {
    write('debug', msg, fields)
  },
  info: (msg: string, fields?: Record<string, unknown>) => {
    write('info', msg, fields)
  },
  warn: (msg: string, fields?: Record<string, unknown>) => {
    write('warn', msg, fields)
  },
  error: (msg: string, fields?: Record<string, unknown>) => {
    write('error', msg, fields)
  },
}
