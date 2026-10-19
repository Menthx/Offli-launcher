// Project rule: no source file over 200 lines (a few more tolerated); fails above LIMIT
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const LIMIT = 210
const ROOTS = ['src', 'tests', 'scripts']
const EXT = /\.(ts|tsx|mts|mjs|js|css)$/

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) yield* walk(path)
    else if (EXT.test(name)) yield path
  }
}

const tooLong = []
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const lines = readFileSync(file, 'utf8').split('\n').length - 1
    if (lines > LIMIT) tooLong.push(`${relative('.', file)} : ${lines} lignes`)
  }
}

if (tooLong.length) {
  console.error(`Fichiers de plus de ${LIMIT} lignes (à découper par thème) :\n  ${tooLong.join('\n  ')}`)
  process.exit(1)
}
console.log(`Tous les fichiers font ${LIMIT} lignes ou moins.`)
