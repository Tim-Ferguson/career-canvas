// Builds the committed tree (never the working copy) and deploys it to Cloudflare.
// Untracked files such as src/personal/*.json cannot reach the bundle, and the build is
// scanned for every personal resume's identity before anything is uploaded.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const dryRun = process.argv.includes('--dry-run')
const run = (command, args, cwd) => execFileSync(command, args, { cwd, stdio: 'inherit' })

if (execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: root, encoding: 'utf8' }).trim()) {
  console.warn('Uncommitted changes are not deployed: building HEAD only.')
}

function personalMarkers() {
  const dir = join(root, 'src/personal')
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((name) => name.endsWith('.json')).flatMap((name) => {
    const { profile = {} } = JSON.parse(readFileSync(join(dir, name), 'utf8'))
    const phoneDigits = String(profile.phone ?? '').replace(/\D/g, '')
    return [profile.name, profile.email, profile.phone, phoneDigits.length >= 7 ? phoneDigits : '']
  }).map((value) => String(value ?? '').trim().toLowerCase()).filter((value) => value.length >= 5)
}

function filesUnder(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? filesUnder(path) : [path]
  })
}

const workdir = mkdtempSync(join(tmpdir(), 'career-canvas-deploy-'))
try {
  execFileSync('sh', ['-c', `git archive HEAD | tar -x -C "${workdir}"`], { cwd: root, stdio: 'inherit' })
  if (existsSync(join(workdir, 'src/personal'))) throw new Error('src/personal is committed; refusing to deploy.')
  symlinkSync(join(root, 'node_modules'), join(workdir, 'node_modules'), 'dir')
  run('npm', ['run', 'build'], workdir)

  const markers = [...new Set(personalMarkers())]
  const leaks = filesUnder(join(workdir, 'dist')).flatMap((file) => {
    const text = readFileSync(file, 'latin1').toLowerCase()
    return markers.filter((marker) => text.includes(marker)).map(() => file.slice(workdir.length + 1))
  })
  if (leaks.length) throw new Error(`Personal resume data found in the build, not deploying:\n${[...new Set(leaks)].join('\n')}`)
  console.log(`Privacy scan passed: ${markers.length} personal markers checked, none in the build.`)

  if (dryRun) console.log('Dry run: skipping wrangler deploy.')
  else run('npx', ['wrangler', 'deploy'], workdir)
} finally {
  rmSync(workdir, { recursive: true, force: true })
}
