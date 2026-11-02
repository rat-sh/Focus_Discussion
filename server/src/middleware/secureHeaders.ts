import { secureHeaders } from 'hono/secure-headers'

export const securityHeaders = secureHeaders({
  // Hono's default is "no-referrer", which makes every YouTube embed fail with Error 153.
  referrerPolicy: 'strict-origin-when-cross-origin',
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    objectSrc: ["'none'"],
    frameAncestors: ["'self'"],
    scriptSrc: ["'self'", "'wasm-unsafe-eval'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
    fontSrc: ["'self'", 'data:'],
    connectSrc: ["'self'", 'https:', 'wss:'],
    workerSrc: ["'self'", 'blob:'],
    mediaSrc: ["'self'", 'blob:', 'data:', 'https:'],
    frameSrc: ['https://www.youtube-nocookie.com', 'https://www.youtube.com', 'https://youtube.com'],
    formAction: ["'self'"],
  },
})