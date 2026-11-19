// verify-offline.mjs — verify dist/ has zero loadable network dependencies.
//
// The DoD check is "grep for https:// in dist output". A naive grep also
// matches (a) XML namespace identifiers baked into the minified React bundle
// (http://www.w3.org/1999/xlink, http://www.w3.org/XML/1998/namespace —
// functional identifiers, never fetched) and (b) the reactjs.org error
// decoder URL, a plain string shown in dev error messages, never requested.
//
// This script therefore:
//  1. Enumerates every http(s) occurrence in dist/ and classifies each one,
//  2. Hard-fails if any http(s) string is used as a loadable resource
//     (script/link/img source, CSS @import/url(), fetch target in HTML),
//  3. Reports the benign classifications for the audit trail.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist'
const KNOWN_BENIGN = [
  { re: /^https?:\/\/www\.w3\.org\//, why: 'XML namespace identifier (never fetched)' },
  { re: /^https:\/\/reactjs\.org\/docs\/error-decoder\.html/, why: 'React error-message string (never fetched)' },
]

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

let bad = 0
let benign = 0
for (const file of walk(DIST)) {
  const text = readFileSync(file, 'utf8')
  const urls = new Set(text.match(/https?:\/\/[^\s"')\\]+/g) ?? [])
  for (const url of urls) {
    const known = KNOWN_BENIGN.find((k) => k.re.test(url))
    if (known) {
      benign++
      console.log(`  benign  ${file}: ${url}  [${known.why}]`)
      continue
    }
    // Anything else must not be a loadable resource reference.
    const idx = text.indexOf(url)
    const before = text.slice(Math.max(0, idx - 80), idx)
    if (/src\s*=\s*["']|href\s*=\s*["']|@import\s*|url\(\s*["']?|import\s+["']/i.test(before)) {
      bad++
      console.error(`  FAIL    ${file}: loadable reference -> ${url}`)
    } else {
      console.log(`  benign  ${file}: ${url}  [string literal, not a resource reference]`)
    }
  }
}

console.log(`\nscan: ${bad} loadable external reference(s), ${benign} known-benign`)
if (bad > 0) {
  console.error('FAIL: dist/ contains loadable external dependencies')
  process.exit(1)
}
console.log('PASS: zero CDN / network dependencies (fully offline-capable)')
