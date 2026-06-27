/**
 * Development server launcher.
 * Reads port/host/basePath from deployment.config.js and starts Next.js dev server.
 * Run via: pnpm dev
 */
const { port, host, basePath } = require('../deployment.config')
const { spawn } = require('node:child_process')

process.env.NEXTAUTH_URL = `${host}:${port}${basePath}`

console.log(`Starting dev server on ${process.env.NEXTAUTH_URL}`)

const isWin = process.platform === 'win32'
const nextBin = isWin ? String.raw`node_modules\.bin\next.cmd` : 'node_modules/.bin/next'

const child = spawn(
  nextBin,
  ['dev', '-p', String(port)],
  { stdio: 'inherit', shell: isWin }
)

child.on('exit', (code) => process.exit(code ?? 0))
