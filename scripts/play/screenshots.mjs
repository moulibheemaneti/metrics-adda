/// --------------------------------------------------
/// scripts/play/screenshots.mjs
/// --------------------------------------------------
/// Captures the phone and tablet screenshots the Play Console listing needs,
/// from the real production build rather than a mockup.
///
/// Serves `.output/public` and drives the browser over it, so what is
/// captured is exactly what ships — prerendered HTML, self-hosted fonts,
/// real tool markup. Nothing is stubbed.
///
/// Output goes to `play-assets/screenshots/`, which is gitignored: these are
/// bulky, regenerate in seconds, and change with every visual tweak. The
/// script is the reproducible artefact, not its output.
///
///   bun run play:screenshots
///
/// Requires a build (`bun run build`) first.
/// --------------------------------------------------

import { existsSync, mkdirSync } from "node:fs"
import { join, resolve } from "node:path"

import { TOOLS } from "../../app/utils/tools.ts"

const ROOT = resolve(import.meta.dir, "../..")
const DIST = join(ROOT, ".output/public")
const OUT = join(ROOT, "play-assets/screenshots")

const CHROME = process.env.CHROME_BIN
  || "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell"

if (!existsSync(DIST)) {
   console.error(`no build at ${DIST} — run \`bun run build\` first`)
   process.exit(1)
}

/// A store listing shows a handful of screens, not all 18 tools, so this is
/// a curated subset rather than the whole registry. It is still checked
/// against the registry below: a curated list is exactly the kind that goes
/// stale silently when a slug is renamed.
const SHOTS = [
   { name: "1-home", path: "/" },
   { name: "2-weight-converter", path: "/weight-converter" },
   { name: "3-bmi-calculator", path: "/bmi-calculator" },
   { name: "4-word-counter", path: "/word-counter" },
   { name: "5-password-generator", path: "/password-generator" },
   { name: "6-typing-speed-test", path: "/typing-speed-test" },
]

const known = new Set(TOOLS.map((t) => t.path))
const unknown = SHOTS.filter((s) => s.path !== "/" && !known.has(s.path))
if (unknown.length) {
   console.error(`not in the tool registry: ${unknown.map((s) => s.path).join(", ")}`)
   process.exit(1)
}

/// Play rejects a screenshot whose long side is more than twice its short
/// side, so the tall 20:9 shape a modern phone actually has is not usable.
/// Both of these sit comfortably inside the limit.
const DEVICES = [
   { id: "phone", width: 360, height: 640, scale: 3 }, // 1080x1920
   { id: "tablet", width: 800, height: 1280, scale: 2 }, // 1600x2560
]

const THEMES = ["light", "dark"]

/// Static server over the build output. Directory routes resolve to their
/// prerendered index.html the way any static host serves them.
///
/// The theme is forced by stamping `data-theme` onto <html> in the response.
/// That is the same attribute the site's own pre-paint script sets from
/// localStorage (see nuxt.config.ts), and per themes/_dark.scss an explicit
/// attribute beats the OS preference — so this is the documented override,
/// not a trick. Setting localStorage instead would need a navigation to
/// happen first, which is the flash this attribute exists to prevent.
let theme = "light"

const server = Bun.serve({
   port: 0,
   async fetch(req) {
      const { pathname } = new URL(req.url)
      const candidates = [join(DIST, pathname), join(DIST, pathname, "index.html")]

      for (const candidate of candidates) {
         const file = Bun.file(candidate)
         if (!(await file.exists()) || candidate.endsWith("/")) continue

         if (!candidate.endsWith(".html")) return new Response(file)

         const html = (await file.text()).replace("<html ", `<html data-theme="${theme}" `)
         return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } })
      }

      return new Response("not found", { status: 404 })
   },
})

const base = `http://localhost:${server.port}`
let count = 0

for (const device of DEVICES) {
   for (const t of THEMES) {
      theme = t
      const dir = join(OUT, `${device.id}-${t}`)
      mkdirSync(dir, { recursive: true })

      for (const shot of SHOTS) {
         const out = join(dir, `${shot.name}.png`)

         // Spawned asynchronously, and that is load-bearing rather than
         // stylistic: the server answering these requests runs in THIS
         // process, so a synchronous spawn blocks the event loop, the fetch
         // handler never runs, and the browser waits for a response that
         // cannot arrive until it exits. Both sides then sit there until
         // something kills them.
         const proc = Bun.spawn([
            CHROME,
            "--headless",
            "--disable-gpu",
            "--no-sandbox",
            "--hide-scrollbars",
            `--window-size=${device.width},${device.height}`,
            `--force-device-scale-factor=${device.scale}`,
            // Fonts and the theme attribute settle after load; --screenshot
            // does not wait for either.
            "--virtual-time-budget=4000",
            `--screenshot=${out}`,
            `${base}${shot.path}`,
         ], { stdout: "pipe", stderr: "pipe" })

         const status = await proc.exited

         if (status !== 0) {
            console.error(await new Response(proc.stderr).text())
            server.stop(true)
            throw new Error(`chromium exited ${status} on ${shot.path}`)
         }

         count += 1
      }

      console.info(`${device.id}-${t}  ${SHOTS.length} shots  ${dir}`)
   }
}

server.stop(true)
console.info(`\n${count} screenshots at ${DEVICES[0].width * DEVICES[0].scale}x${DEVICES[0].height * DEVICES[0].scale} (phone) and ${DEVICES[1].width * DEVICES[1].scale}x${DEVICES[1].height * DEVICES[1].scale} (tablet)`)
