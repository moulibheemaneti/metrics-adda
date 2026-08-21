/// --------------------------------------------------
/// scripts/play/assets.mjs
/// --------------------------------------------------
/// Generates the two pieces of store artwork the Play Console listing
/// requires and the repo does not already have: the 512x512 app icon and the
/// 1024x500 feature graphic.
///
/// These are NOT website assets. Nothing under `play-assets/` is served, is
/// referenced by the site, or ends up in `.output/` — they are uploaded by
/// hand to Play Console. That is why they live outside `public/`.
///
/// Run with bun (it imports a .ts module directly):
///   bun run play:assets
/// --------------------------------------------------

import { spawnSync } from "node:child_process"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

import sharp from "sharp"

import { COPY } from "../../app/utils/copy.ts"

const ROOT = resolve(import.meta.dir, "../..")
const OUT = join(ROOT, "play-assets")
const LOGO = join(ROOT, "public/logo.png")

/// `--accent-solid` in app/assets/scss/base/_global.scss. If the brand colour
/// moves, it moves here too — same rule public/README.md states for the icon
/// pipeline it documents.
const BRAND = { r: 0x4f, g: 0x46, b: 0xe5, alpha: 1 }

mkdirSync(OUT, { recursive: true })

/// ── app icon ────────────────────────────────────────────────────────────
///
/// Flattened onto the brand colour rather than left transparent, for the
/// same reason public/README.md gives for the maskable and Apple icons:
/// Play rounds the corners itself, so the artwork has to reach the edge or
/// the rounding bites into empty space.
///
/// `ensureAlpha` after `flatten` looks contradictory and is not. Flatten
/// composites the transparency away and drops to 3 channels; Play documents
/// the icon as a 32-bit PNG, so the channel is added back fully opaque. The
/// pixels are unchanged either way — this only satisfies the stated format.
const iconPath = join(OUT, "icon-512.png")
await sharp(LOGO)
   .resize(512, 512)
   .flatten({ background: BRAND })
   .ensureAlpha()
   .png({ compressionLevel: 9 })
   .toFile(iconPath)
console.info(`icon          ${iconPath}`)

/// ── feature graphic ─────────────────────────────────────────────────────
///
/// Rendered by Chromium rather than composed with sharp, because it carries
/// type and the type has to be the site's own. sharp would rasterise SVG
/// text through fontconfig, which on this machine offers DejaVu and FreeSans
/// and nothing the brand uses. Chromium loads the self-hosted woff2 files
/// straight out of public/fonts/ and lays the text out exactly as the site
/// does.
///
/// It also means one renderer for this and for the screenshots next door,
/// and no new dependency: docs/roadmap.md keeps Playwright deliberately out
/// of the tree, so this drives the browser binary directly.
/// `headless_shell`, not `chrome --headless`. The full browser reserves room
/// for UI it is not drawing: asked for a 1024x500 window it lays out a
/// 1024x413 viewport and pads the capture with white, which produces a
/// correctly sized image with a blank band across the bottom. The shell
/// binary reports the viewport it was asked for. Measured, not assumed —
/// and `--headless=old`, the usual workaround, is gone from this build.
const CHROME = process.env.CHROME_BIN
  || "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell"

/// Play may crop the feature graphic for some placements, so nothing that
/// carries meaning goes near an edge — hence the generous padding and the
/// vertically centred single row.
///
/// The strapline is `COPY.home.heading`, the site's own <h1>, rather than a
/// second copy written for the store. Store artwork that restates the
/// product in slightly different words is how the two drift apart.
const html = `<!doctype html>
<meta charset="utf-8">
<style>
  @font-face {
    font-family: "Sora";
    src: url("file://${join(ROOT, "public/fonts/sora-latin-variable.woff2")}") format("woff2");
    font-weight: 500 700;
  }
  @font-face {
    font-family: "Inter";
    src: url("file://${join(ROOT, "public/fonts/inter-latin-variable.woff2")}") format("woff2");
    font-weight: 400 700;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1024px; height: 500px; display: flex; align-items: center; gap: 56px;
    padding: 0 80px;
    background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
    color: #fff;
  }
  img { width: 168px; height: 168px; flex: none; }
  h1 {
    font-family: "Sora", system-ui, sans-serif; font-weight: 700;
    font-size: 62px; letter-spacing: -0.02em; line-height: 1.05;
  }
  p {
    font-family: "Inter", system-ui, sans-serif; font-weight: 400;
    font-size: 27px; line-height: 1.4; margin-top: 16px;
    color: rgba(255, 255, 255, 0.82);
  }
</style>
<img src="file://${LOGO}" alt="">
<div>
  <h1>Metrics Adda</h1>
  <p>${COPY.home.heading}</p>
</div>
`

const htmlPath = join(OUT, ".feature-graphic.html")
writeFileSync(htmlPath, html)

const featurePath = join(OUT, "feature-graphic-1024x500.png")
const result = spawnSync(CHROME, [
   "--headless",
   "--disable-gpu",
   "--no-sandbox",
   "--hide-scrollbars",
   "--window-size=1024,500",
   "--force-device-scale-factor=1",
   // Webfonts are fetched after the load event, and --screenshot does not
   // wait for them. Virtual time lets the page settle before the capture, or
   // the type falls back to the system font on a fast machine.
   "--virtual-time-budget=3000",
   `--screenshot=${featurePath}`,
   `file://${htmlPath}`,
], { encoding: "utf8" })

if (result.status !== 0) {
   console.error(result.stderr?.split("\n").filter((l) => !l.includes("dbus")).join("\n"))
   throw new Error(`chromium exited ${result.status} — set CHROME_BIN if the path is wrong`)
}
/// Guards the failure above rather than trusting it stays fixed. A short
/// viewport still yields an image of exactly the right dimensions, so size
/// proves nothing — the tell is the padding colour. This artwork is a dark
/// indigo gradient edge to edge, so a near-white bottom row means the page
/// was truncated and padded.
const { data: bottomRow } = await sharp(featurePath)
   .extract({ left: 0, top: 499, width: 1024, height: 1 })
   .stats()
   .then((st) => ({ data: st.channels.map((c) => c.mean) }))

if (bottomRow.every((mean) => mean > 240)) {
   throw new Error(
      "feature graphic is white along the bottom edge — the browser laid out a "
      + "shorter viewport than the window and padded the capture. Check CHROME_BIN "
      + "points at headless_shell.",
   )
}

rmSync(htmlPath, { force: true })

console.info(`feature       ${featurePath}`)
