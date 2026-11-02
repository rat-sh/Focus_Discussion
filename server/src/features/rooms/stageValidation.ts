import { safeHttpUrl } from '../../lib/safeUrl'

export function isValidStageUrl(input: string): boolean {
  return safeHttpUrl(input, false) !== null
}
