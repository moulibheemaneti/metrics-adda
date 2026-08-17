#!/usr/bin/env bash
#
# PWA verification for Metrics Adda.
#
# Asserts the production build is actually installable and actually works
# offline: manifest, icons, service worker, and a precache entry for every
# prerendered route.
#
# This exists because Lighthouse cannot check it any more. The PWA category
# and its `installable-manifest` / `service-worker` audits were removed in
# Lighthouse 12, so `seo:lighthouse` is blind to all of this — and the failure
# mode is silent. `<link rel="manifest">` comes from a <VitePwaManifest />
# component in app.vue that renders null; delete it and every page still
# builds, the worker still installs, and the site simply stops being
# installable with nothing to show for it.
#
# Reads the build output on disk rather than booting a server: everything
# asserted here is a static file, so there is nothing a running server would
# add.
#
# Usage:
#   scripts/pwa/verify.sh           # build if needed, then check
#   BUILD=1 scripts/pwa/verify.sh   # force a fresh build first
#
# Exit code = number of failed checks (0 = all green).

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

DIST=".output/public"

# Same source of truth as scripts/seo/verify.sh — the tool registry, plus the
# pages that are not tools. A hardcoded list here would drift the moment a
# tool is added, which is the exact bug this script is meant to catch.
TOOL_ROUTES="$(bun -e 'import { TOOLS } from "./app/utils/tools.ts"; console.log(TOOLS.map((t) => t.path).join(" "))')" || {
   echo "could not read the tool registry — is bun on PATH?" >&2
   exit 1
}
ROUTES="${ROUTES:-/ $TOOL_ROUTES /about /contact /privacy-policy}"

# ── pretty output ────────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
   G=$'\e[32m'; R=$'\e[31m'; C=$'\e[36m'; D=$'\e[2m'; B=$'\e[1m'; X=$'\e[0m'
else
   G=""; R=""; C=""; D=""; B=""; X=""
fi
PASS=0; FAIL=0

pass()    { printf "  ${G}✔${X} %s\n" "$1"; PASS=$((PASS + 1)); }
fail()    { printf "  ${R}✗${X} %s${D} — %s${X}\n" "$1" "$2"; FAIL=$((FAIL + 1)); }
# Neither passed nor failed: a check that cannot run yet and is not wrong.
# Counted in neither total, so the exit code keeps meaning "things that are
# broken" rather than "things that are unfinished".
skip()    { printf "  ${D}○ %s — %s${X}\n" "$1" "$2"; }
section() { printf "\n${B}%s${X}\n" "$1"; }

# assert_contains "<desc>" "<content>" "<regex>"
assert_contains() {
   if grep -qE -- "$3" <<<"$2"; then pass "$1"; else fail "$1" "missing: $3"; fi
}

# assert_file "<desc>" "<path>"
assert_file() {
   if [[ -f "$2" ]]; then pass "$1 ${D}($(wc -c <"$2" | tr -d ' ') bytes)${X}"; else fail "$1" "no such file: $2"; fi
}

# ── build ────────────────────────────────────────────────────────────────────
if [[ "${BUILD:-0}" == "1" || ! -d "$DIST" ]]; then
   printf "${D}Building production output…${X}\n"
   if ! bun run build >/tmp/pwa-build.log 2>&1; then
      printf "${R}Build failed.${X} See /tmp/pwa-build.log\n"; tail -20 /tmp/pwa-build.log; exit 1
   fi
fi
[[ -d "$DIST" ]] || { printf "${R}No build output at %s${X}\n" "$DIST"; exit 1; }

section "Target: ${C}${DIST}${X}"

# ── manifest ─────────────────────────────────────────────────────────────────
section "manifest"
MANIFEST_PATH="$DIST/manifest.webmanifest"
assert_file "manifest emitted" "$MANIFEST_PATH"

if [[ -f "$MANIFEST_PATH" ]]; then
   MANIFEST="$(cat "$MANIFEST_PATH")"
   assert_contains "has a name"            "$MANIFEST" '"name":"[^"]+"'
   assert_contains "has a short_name"      "$MANIFEST" '"short_name":"[^"]+"'
   # Installability minimums: without start_url and a standalone-family
   # display mode the browser will not offer to install at all.
   assert_contains "start_url is the root" "$MANIFEST" '"start_url":"/"'
   assert_contains "scope is the root"     "$MANIFEST" '"scope":"/"'
   assert_contains "display: standalone"   "$MANIFEST" '"display":"standalone"'
   # A stable id keeps an installed app the *same* app across deploys, which
   # is what Play looks at when a TWA is updated.
   assert_contains "has a stable id"       "$MANIFEST" '"id":"/"'
   assert_contains "192px icon declared"   "$MANIFEST" '"sizes":"192x192"'
   assert_contains "512px icon declared"   "$MANIFEST" '"sizes":"512x512"'
   # Android crops icons to the launcher's shape. Without a maskable one it
   # crops the plain icon instead and clips the artwork.
   assert_contains "maskable icon declared" "$MANIFEST" '"purpose":"maskable"'

   # Every icon the manifest promises has to actually exist, or install
   # silently falls back to a screenshot of the page.
   while read -r icon; do
      assert_file "icon on disk ${C}${icon}${X}" "$DIST$icon"
   done < <(grep -oE '"src":"[^"]+"' <<<"$MANIFEST" | sed 's/"src":"//;s/"//')
fi

# iOS ignores the manifest entirely and reads this instead.
assert_file "apple touch icon" "$DIST/apple-touch-icon.png"

# ── service worker ───────────────────────────────────────────────────────────
section "service worker"
SW_PATH="$DIST/sw.js"
assert_file "service worker emitted" "$SW_PATH"
if ! compgen -G "$DIST/workbox-*.js" >/dev/null; then
   fail "workbox runtime emitted" "no $DIST/workbox-*.js"
else
   pass "workbox runtime emitted"
fi

if [[ -f "$SW_PATH" ]]; then
   SW="$(cat "$SW_PATH")"
   assert_contains "precache manifest present" "$SW" "precacheAndRoute"
   # registerType: "autoUpdate" — a worker that waits for every tab to close
   # would strand users on a stale build.
   assert_contains "activates immediately"     "$SW" "skipWaiting"
   assert_contains "navigation fallback"       "$SW" "NavigationRoute"
   # Self-hosted, and the whole point of hosting them is that they load with
   # no network. Missing here means offline text reflows to a system font.
   assert_contains "Inter precached"           "$SW" "fonts/inter-latin-variable\.woff2"
   assert_contains "Sora precached"            "$SW" "fonts/sora-latin-variable\.woff2"
fi

# ── routes ───────────────────────────────────────────────────────────────────
# Both halves matter and they fail independently: a route can be prerendered
# but missing from the precache (offline miss), or precached but not
# prerendered (the worker caches a 404).
section "routes ${D}(prerendered + precached + manifest link)${X}"
for route in $ROUTES; do
   if [[ "$route" == "/" ]]; then
      html="$DIST/index.html"
      # Workbox writes the root as "/" and every other route bare, without a
      # leading slash — matched relative to the worker's scope.
      precache_key='{url:"/"'
   else
      html="$DIST${route}/index.html"
      precache_key="{url:\"${route#/}\""
   fi

   if [[ ! -f "$html" ]]; then
      fail "${C}${route}${X}" "not prerendered ($html)"
      continue
   fi

   missing=()
   grep -qF 'rel="manifest"' "$html" || missing+=("no manifest link")
   grep -qF "$precache_key" "$SW_PATH" 2>/dev/null || missing+=("not precached")

   if [[ ${#missing[@]} -eq 0 ]]; then
      pass "${C}${route}${X}"
   else
      fail "${C}${route}${X}" "$(IFS='; '; echo "${missing[*]}")"
   fi
done

# ── digital asset links ──────────────────────────────────────────────────────
# The Play Store build (see android/README.md) is a Trusted Web Activity, and
# Chrome only drops the browser chrome if this file vouches for the app's
# signing certificate. Get it wrong and the app still launches — with an
# address bar — which reads as a styling bug rather than a failed trust check.
#
# Checked here for two reasons the rest of this script does not cover:
#
#   1. It is the one asset that can break AFTER release. It deploys with the
#      website, not with the app, so every installed user is affected by a
#      change no Android release was involved in.
#   2. It lives in a dot-directory. Nitro does copy those out of `public/`
#      — verified against this build, not assumed — but a `**/*` glob skips
#      dot-prefixed paths unless it opts in, so that behaviour is a choice
#      upstream could revisit. Cheap to assert, and the failure is otherwise
#      invisible until an installed app grows an address bar.
section "digital asset links ${D}(Android TWA)${X}"

AL_PATH="$DIST/.well-known/assetlinks.json"
assert_file "assetlinks.json emitted" "$AL_PATH"

if [[ -f "$AL_PATH" ]]; then
   AL="$(cat "$AL_PATH")"

   # Same source-of-truth rule as the tool registry above: read the package id
   # from the Bubblewrap manifest rather than repeating it, or the two drift
   # and the drift is invisible until an installed app grows an address bar.
   PACKAGE_ID="$(bun -e 'console.log(JSON.parse(await Bun.file("android/twa-manifest.json").text()).packageId ?? "")' 2>/dev/null)"

   if [[ -z "$PACKAGE_ID" ]]; then
      fail "package id readable from twa-manifest" "android/twa-manifest.json missing or has no packageId"
   else
      assert_contains "package matches ${C}${PACKAGE_ID}${X}" "$AL" "\"package_name\":[[:space:]]*\"${PACKAGE_ID}\""
   fi

   assert_contains "android_app namespace"   "$AL" '"namespace":[[:space:]]*"android_app"'
   assert_contains "handle_all_urls relation" "$AL" 'delegate_permission/common\.handle_all_urls'

   # Reads the fingerprints out, and doubles as the JSON parse check: a
   # malformed file throws here, which is a failure rather than something
   # pending.
   #
   # The path goes through the environment rather than an argument because
   # `bun -e` puts the first argument at process.argv[1], not [2] as a
   # file-based script would. Getting that wrong does not error — it reads as
   # "no fingerprints", i.e. a green build with the check silently disabled.
   if FINGERPRINTS="$(AL_PATH="$AL_PATH" bun -e '
      const doc = JSON.parse(await Bun.file(process.env.AL_PATH).text())
      const fps = doc.flatMap((s) => s?.target?.sha256_cert_fingerprints ?? [])
      console.log(fps.join("\n"))
   ' 2>/dev/null)"; then
      pass "parses as JSON"
      PARSED=1
   else
      fail "parses as JSON" "malformed, or not an array of statements"
      PARSED=0
   fi

   # Fingerprints are pending until the first AAB reaches Play — Google
   # generates the app signing key and only reveals its SHA-256 afterwards.
   # An empty list is therefore the correct pre-launch state, not a failure;
   # failing on it would red every build until launch and teach everyone to
   # ignore this section. Once populated, the format is checked strictly.
   if [[ "$PARSED" -eq 0 ]]; then
      : # already reported; saying anything about fingerprints here would be a guess
   elif [[ -z "$FINGERPRINTS" ]]; then
      skip "signing fingerprints" "none yet — added after the first Play upload"
   else
      bad=0
      while read -r fp; do
         [[ -z "$fp" ]] && continue
         # SHA-256 as Play prints it: 32 colon-separated uppercase hex pairs.
         grep -qE '^[0-9A-F]{2}(:[0-9A-F]{2}){31}$' <<<"$fp" || bad=$((bad + 1))
      done <<<"$FINGERPRINTS"

      count="$(grep -c . <<<"$FINGERPRINTS")"
      if [[ "$bad" -eq 0 ]]; then
         pass "signing fingerprints ${D}(${count} well-formed)${X}"
      else
         fail "signing fingerprints" "${bad} of ${count} are not colon-separated SHA-256"
      fi

      # Both the app signing key and the upload key belong here. With only one
      # it is almost always the upload key that is missing, which verifies in
      # production and fails on every locally built APK.
      if [[ "$count" -lt 2 ]]; then
         skip "both keys listed" "only ${count} — add the upload key as well as the app signing key"
      else
         pass "both keys listed"
      fi
   fi
fi

# ── summary ──────────────────────────────────────────────────────────────────
printf "\n${B}Summary${X}  ${G}%d passed${X}  ${R}%d failed${X}\n" "$PASS" "$FAIL"
exit "$FAIL"
