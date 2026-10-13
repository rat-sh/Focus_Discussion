const PALETTE = ['#2d5a4a', '#2f4f7a', '#7a5a2d', '#7a3d4a', '#2d6b73', '#5a4a7a']
export const avatarColor = (name: string) => {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return PALETTE[h % PALETTE.length]
}
