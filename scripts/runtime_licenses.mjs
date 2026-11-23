import fs from 'node:fs'
import path from 'node:path'

const destination = 'public/licenses'
fs.mkdirSync(destination, { recursive: true })
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'))
const seen = new Set()
const list = []
for (const [folder, info] of Object.entries(lock.packages)) {
  if (!folder || info.dev || !fs.existsSync(path.join(folder, 'package.json'))) continue
  const { name, version, license } = JSON.parse(fs.readFileSync(path.join(folder, 'package.json'), 'utf8'))
  const key = `${name}@${version}`
  if (seen.has(key)) continue
  seen.add(key)
  const sources = fs.readdirSync(folder, { withFileTypes: true })
    .filter(entry => entry.isFile() && /^(licen[sc]e|copying|notice|third[-_ ]party)/i.test(entry.name))
  const prefix = key.replace(/[^a-zA-Z0-9._-]/g, '_')
  const copied = sources.map(({ name }) => {
    const file = `${prefix}_${name}`
    fs.copyFileSync(path.join(folder, name), path.join(destination, file))
    return file
  })
  list.push(`${key} | ${license ?? '见上游声明'} | ${copied.join(', ') || '包清单声明'}`)
}
fs.writeFileSync(path.join(destination, 'RUNTIME-LICENSES.txt'), list.sort().join('\n') + '\n')
console.log(`Indexed ${list.length} runtime packages`)
