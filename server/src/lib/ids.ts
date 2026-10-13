/** Unambiguous invite alphabet (no 0/O/1/I/L). */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function randomInviteCode(length = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  let out = ''
  for (let i = 0; i < length; i++) {
    const b = bytes[i] ?? 0
    out += ALPHABET[b % ALPHABET.length] ?? 'A'
  }
  return out
}
