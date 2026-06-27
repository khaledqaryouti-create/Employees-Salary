/**
 * Production server launcher.
 * Reads port/host/basePath from deployment.config.js and starts Next.js production server.
 * Run via: pnpm start
 */
const { port, host, basePath } = require('../deployment.config')
const { spawn } = require('child_process')

process.env.NEXTAUTH_URL = `${host}:${port}${basePath}`

console.log(`Starting production server on ${process.env.NEXTAUTH_URL}`)

const isWin = process.platform === 'win32'
const nextBin = isWin ? 'node_modules\\.bin\\next.cmd' : 'node_modules/.bin/next'

const child = spawn(
  nextBin,
  ['start', '-p', String(port)],
  { stdio: 'inherit', shell: isWin }
)

child.on('exit', (code) => process.exit(code ?? 0))
