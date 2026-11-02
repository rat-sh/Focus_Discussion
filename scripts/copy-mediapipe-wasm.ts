import { cp, mkdir, readdir, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'

const require = createRequire(import.meta.url)
const packageEntry = require.resolve('@mediapipe/tasks-vision')
const packageDirectory = dirname(packageEntry)
const packageJson = await Bun.file(join(packageDirectory, 'package.json')).json()
if (packageJson.version !== '1.1.0') {
  throw new Error(`Expected @mediapipe/tasks-vision 1.1.0; found ${packageJson.version}`)
}

const source = join(packageDirectory, 'wasm')
const destination = resolve(import.meta.dir, '../public/mediapipe-wasm')
const files = await readdir(source)
await rm(destination, { recursive: true, force: true })
await mkdir(destination, { recursive: true })
await Promise.all(files.map((file) => cp(join(source, file), join(destination, file), { recursive: true })))
