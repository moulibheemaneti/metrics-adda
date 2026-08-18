/// --------------------------------------------------
/// scripts/android/version.mjs
/// --------------------------------------------------
/// Stamps the Android version fields into `android/twa-manifest.json` before
/// a build.
///
/// Two numbers, and they answer to different masters:
///
///   appVersionCode — an integer Play uses to order releases. It must
///     increase on every upload, forever, and it is invisible to users. It
///     has nothing to do with semver: a 1.14.1 → 1.15.0 bump could be
///     versionCode 47.
///   appVersion     — the version NAME, shown in the store listing. This is
///     the semver from package.json, so a listing maps back to a git tag.
///
/// Bubblewrap can set the name (`update --appVersionName`) but not the code,
/// so both are written here and `bubblewrap update` is then run with
/// `--skipVersionUpgrade` so it does not auto-increment on top.
///
///   VERSION_CODE=42 bun scripts/android/version.mjs
///   VERSION_CODE=42 VERSION_NAME=1.15.0 bun scripts/android/version.mjs
/// --------------------------------------------------

import { readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

const ROOT = resolve(import.meta.dirname, "../..")
const MANIFEST = join(ROOT, "android/twa-manifest.json")

const code = Number(process.env.VERSION_CODE)

/// Rejected rather than defaulted. A wrong versionCode is not a build
/// failure — Play accepts the upload and then refuses every later one that
/// does not exceed it, and versionCodes cannot be reused or walked back.
if (!Number.isInteger(code) || code < 1) {
   console.error(`VERSION_CODE must be a positive integer, got: ${process.env.VERSION_CODE ?? "(unset)"}`)
   process.exit(1)
}

const name = process.env.VERSION_NAME
  || JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"))
const previous = { code: manifest.appVersionCode, name: manifest.appVersion }

manifest.appVersionCode = code
manifest.appVersion = name

/// Three spaces and a trailing newline, matching the committed file and the
/// repo's .editorconfig — so a local run leaves a diff of two lines rather
/// than a reformat of the whole manifest.
writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 3)}\n`)

console.info(`versionCode  ${previous.code} → ${code}`)
console.info(`versionName  ${previous.name} → ${name}`)
