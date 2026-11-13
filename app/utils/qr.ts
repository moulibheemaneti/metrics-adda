/// --------------------------------------------------
/// utils/qr.ts
/// --------------------------------------------------
/// QR codes, from text to a grid of modules to an SVG path.
///
/// The encoding itself is `uqr`'s — the one dependency the roadmap set
/// aside for this tool. Reed–Solomon error correction, mask scoring and
/// version selection are exactly the kind of code that looks right and
/// scans wrong, and a hand-rolled copy would be the riskiest file in the
/// repo for no gain. Everything around it is here: which levels the panel
/// offers, the quiet zone, the failures, and drawing the grid.
///
/// Drawing is not `uqr`'s `renderSVG`. That emits one square per dark
/// module, which for a full-length URL is a few thousand path commands;
/// merging each row's runs first makes the same picture several times
/// shorter, and it is the string the page ships in its server HTML.
///
/// Auto-imported by Nuxt. Tests import it relatively (see test/unit).
/// --------------------------------------------------

import { encode } from "uqr"

/**
 * Error-correction levels, weakest to strongest.
 *
 * The order is the slider's order, so index 0 is L. A stronger level
 * survives more damage — a scratch, a crease, a logo printed over the
 * middle — and pays for it with a denser grid that needs a sharper print
 * and a steadier camera.
 */
export const QR_LEVELS = ["L", "M", "Q", "H"] as const

export type QrLevel = typeof QR_LEVELS[number]

/**
 * M, not `uqr`'s own default of L.
 *
 * M is what most generators and the standard's own examples settle on:
 * a short URL still comes out as a small, easy grid, and a code printed on
 * a flyer that gets folded once keeps working. L is for when space is the
 * constraint, and the slider is there for that.
 */
export const QR_DEFAULT_LEVEL: QrLevel = "M"

/** The share of the code that can be lost and still read, in percent. */
export const QR_RECOVERY: Record<QrLevel, number> = { L: 7, M: 15, Q: 25, H: 30 }

/**
 * How the text is packed into bits.
 *
 * The standard has four modes and `uqr` uses three of them, picking one
 * for the whole text: numeric when it is all digits, alphanumeric when it
 * is all digits, capitals, space and `$%*+-./:`, and byte (UTF-8) for
 * anything else. Kanji mode is the fourth; Japanese text is stored as
 * UTF-8 bytes instead, which costs capacity but not readability.
 */
export const QR_MODES = ["numeric", "alphanumeric", "byte"] as const

export type QrMode = typeof QR_MODES[number]

/**
 * `uqr`'s own tests, copied so the panel can tell which limit applies.
 * They have to stay identical to the library's, or a fault message would
 * quote the limit of a mode the text was not encoded in; the capacity
 * tests in `test/unit/qr.test.ts` fail if they drift.
 */
const NUMERIC = /^\d*$/u
const ALPHANUMERIC = /^[A-Z0-9 $%*+./:-]*$/u

/**
 * The most one QR code holds at each level, per mode — version 40's row
 * of the standard's capacity table.
 *
 * Counted in digits for numeric, characters for alphanumeric and bytes for
 * byte mode, because that is the unit each mode spends: a digit costs
 * about 3⅓ bits, a capital 5½, and a byte 8 whatever character it is part
 * of. Quoting the byte limit for a string of digits would understate what
 * fits by more than half.
 */
export const QR_CAPACITY: Record<QrMode, Record<QrLevel, number>> = {
   numeric: { L: 7089, M: 5596, Q: 3993, H: 3057 },
   alphanumeric: { L: 4296, M: 3391, Q: 2420, H: 1852 },
   byte: { L: 2953, M: 2331, Q: 1663, H: 1273 },
}

/**
 * The light margin around the code, in modules.
 *
 * Four is the standard's minimum, not a style choice. A scanner finds the
 * code by its three corner squares, and with less margin than this a busy
 * background beside it can read as part of the pattern. It goes in the
 * downloads too, because a code pasted into a dark slide brings its own.
 */
export const QR_QUIET_ZONE = 4

/** Roughly how wide a downloaded PNG is, in pixels. */
export const QR_PNG_TARGET = 1024

/**
 * The biggest logo each level allows, as the side of a square in percent
 * of the code's width. A logo that is not square gets the same area.
 *
 * Measured, not taken from a rule of thumb. Codes at every version from 1
 * to 25 were drawn with a cleared square of growing size in the middle,
 * filled with random noise to stand in for a logo, and read back with a
 * decoder until they stopped scanning. The worst version at each level
 * held out to about 24% of the width at M, 32% at Q and 30% at H; these
 * caps sit roughly a fifth under that. Rectangles of the same area, out to
 * 2:1 either way, were then checked at every version and all still read.
 * Phone scanners are better decoders than the one used, so the margin is
 * real rather than nominal.
 *
 * From version 7 up the cleared space also covers alignment patterns —
 * function patterns, which error correction does not repair, and which a
 * scanner uses to follow the grid across a tilted or curved code. That was
 * measured too, with ZXing: versions 7, 13 and 25 at H and M, photographed
 * at tilts up to 70° and wrapped round cylinders up to 180°, blurred and
 * noised. Keeping the alignment patterns visible through the logo changed
 * the breaking point in none of the 24 cases, so they are not preserved.
 * The logo itself costs one 15° step of curvature in 2 of 12 codes, and
 * nothing at any tilt.
 *
 * L has no cap because it has no logo. Its worst case was 17%, which
 * after a margin leaves a square too small to hold anything recognisable,
 * and a 7% recovery level has no business being spent on decoration.
 */
export const QR_LOGO_MAX: Record<QrLevel, number> = { L: 0, M: 15, Q: 20, H: 25 }

/** The smallest logo the size slider offers, in percent. */
export const QR_LOGO_MIN = 10

/** Where the size slider starts: inside every level that allows a logo but M. */
export const QR_LOGO_DEFAULT = 20

/**
 * The level a logo switches the code to.
 *
 * H, because it is the only level whose cap leaves a logo room to be
 * read as one. Someone can still lower it afterwards; the cap then
 * shrinks the logo with it rather than letting it break the code.
 */
export const QR_LOGO_LEVEL: QrLevel = "H"

/**
 * Why a code could not be made.
 *
 * Two different fixes, so two different faults: one is solved by less
 * text or a weaker level, the other by retyping a broken character.
 */
export type QrFault
   /** More than one QR code holds at this level. */
   = | "tooLong"
   /** Half of an emoji or other astral character, with no UTF-8 spelling. */
     | "loneSurrogate"

/**
 * Why a chosen logo file was not used.
 *
 * Declared here rather than beside the loader so the copy can key its
 * messages on it, the same way it does every other tool's faults.
 */
export type QrLogoFault
   /** Not an image at all — a PDF or a document picked by mistake. */
   = | "notImage"
   /** Over the size limit, refused before decoding. */
     | "tooLarge"
   /** An image type the browser could not decode, or would not let a canvas read. */
     | "unreadable"

export interface QrMatrix {
   /** QR version, 1–40. Each step adds four modules a side. */
   version: number
   /** Modules per side, not counting the quiet zone. */
   size: number
   /** `modules[row][column]`, true for dark. */
   modules: boolean[][]
}

export type QrResult
   = | { ok: true, matrix: QrMatrix }
     | { ok: false, fault: QrFault }

/**
 * The rectangle cleared for a logo, in matrix coordinates — modules, quiet
 * zone not counted. Always centred, so `x` and `y` are where it starts and
 * the same distance is left on the far side.
 */
export interface QrHole {
   x: number
   y: number
   width: number
   height: number
}

/** A rectangle in the drawing's units, quiet zone included. */
export interface QrRect {
   x: number
   y: number
   width: number
   height: number
}

/**
 * The widest a cleared rectangle gets, either way round.
 *
 * The measured limit: past 2:1 a strip that long crosses enough columns
 * of codewords that equal area stops meaning equal damage. A 3:1 wordmark
 * still fits — it is drawn inside a 2:1 space, with white above and below.
 */
export const QR_LOGO_MAX_ASPECT = 2

/**
 * The level at a slider position.
 *
 * Clamped and rounded rather than trusted, because a range input's value
 * arrives as a string and the panel should never be one bad parse away
 * from indexing past the end of the list.
 */
export function qrLevelAt(index: number): QrLevel {
   const position = Number.isFinite(index) ? Math.round(index) : QR_LEVELS.indexOf(QR_DEFAULT_LEVEL)
   const clamped = Math.min(Math.max(position, 0), QR_LEVELS.length - 1)

   return QR_LEVELS[clamped] ?? QR_DEFAULT_LEVEL
}

/**
 * Encode `text` as a QR code at `level`.
 *
 * Returns a result rather than throwing, the same contract as
 * `utils/url.ts`: `uqr` throws `RangeError` when the text does not fit and
 * — because it reaches UTF-8 through `encodeURI` — `URIError` on a lone
 * surrogate, and the panel has a different message for each.
 *
 * The empty string is the caller's to handle. It encodes perfectly well,
 * to a code that scans as nothing, which is not something to offer as a
 * download.
 */
export function encodeQr(text: string, level: QrLevel = QR_DEFAULT_LEVEL): QrResult {
   try {
      const encoded = encode(text, { ecc: level, border: 0 })

      return {
         ok: true,
         matrix: { version: encoded.version, size: encoded.size, modules: encoded.data },
      }
   }
   catch(cause) {
      if (cause instanceof URIError) return { ok: false, fault: "loneSurrogate" }
      if (cause instanceof RangeError) return { ok: false, fault: "tooLong" }

      throw cause
   }
}

/**
 * The centred rectangle to clear for a logo of `percent` and shape
 * `aspect` (width over height), never bigger than `maxPercent` allows.
 *
 * `percent` is the side of the square the logo's area matches, so a wide
 * logo is given the same area as a square one at the same setting — area,
 * not width, is what the error correction pays for.
 *
 * Each side is an odd number of modules, because every QR code is an odd
 * number of modules wide and only an odd span sits exactly in the middle
 * of one. That makes the choice a search rather than a rounding: of the
 * odd-sided rectangles inside the level's cap, take the one closest to the
 * logo's shape first and to the requested size second. Rounding each side
 * down would draw a "20%" logo at 15% on a small code; rounding to nearest
 * and trimming would hand a square logo an oblong space. The search is at
 * most 88 × 88 candidates, and stops early along every row.
 *
 * Three modules a side at the least: anything smaller cannot show an
 * image, and 3 × 3 on the smallest code is still inside every cap.
 */
export function qrLogoHole(matrix: QrMatrix, percent: number, aspect = 1, maxPercent = percent): QrHole {
   const ratio = Math.min(Math.max(aspect, 1 / QR_LOGO_MAX_ASPECT), QR_LOGO_MAX_ASPECT)
   const target = ((matrix.size * percent) / 100) ** 2
   const limit = Math.max(((matrix.size * maxPercent) / 100) ** 2, 9)
   let best = { width: 3, height: 3, cost: Number.POSITIVE_INFINITY }

   for (let width = 3; width <= matrix.size; width += 2) {
      for (let height = 3; height <= matrix.size && width * height <= limit; height += 2) {
         const shape = Math.log(width / height) - Math.log(ratio)
         const size = Math.log((width * height) / target)
         // Shape weighs four times size: a logo in a space of the wrong
         // shape looks wrong, one a module smaller than asked does not.
         const cost = 4 * shape * shape + size * size

         if (cost < best.cost) best = { width, height, cost }
      }
   }

   return {
      x: (matrix.size - best.width) / 2,
      y: (matrix.size - best.height) / 2,
      width: best.width,
      height: best.height,
   }
}

/**
 * Where the logo image goes, in the drawing's units — quiet zone included.
 *
 * Inset from the cleared rectangle so the logo does not touch the modules
 * around it: a dark logo edge meeting a dark module reads to a scanner as
 * one bigger module. Half a module is enough to keep them apart; a large
 * logo gets a little more, so the white around it still reads as a frame.
 */
export function qrLogoBox(hole: QrHole): QrRect {
   const inset = Math.max(0.5, Math.min(hole.width, hole.height) * 0.06)

   return {
      x: hole.x + QR_QUIET_ZONE + inset,
      y: hole.y + QR_QUIET_ZONE + inset,
      width: hole.width - inset * 2,
      height: hole.height - inset * 2,
   }
}

/**
 * Fit a `width` × `height` image inside `box`, keeping its shape and
 * centring it — what `preserveAspectRatio="xMidYMid meet"` does for the
 * SVG, worked out by hand for the canvas, which has no equivalent.
 */
export function qrFitLogo(box: QrRect, width: number, height: number): QrRect {
   const fit = Math.min(box.width / width, box.height / height)
   const fitted = { width: width * fit, height: height * fit }

   return {
      x: box.x + (box.width - fitted.width) / 2,
      y: box.y + (box.height - fitted.height) / 2,
      ...fitted,
   }
}

function inHole(hole: QrHole | null, x: number, y: number): boolean {
   if (hole === null) return false

   return x >= hole.x && x < hole.x + hole.width && y >= hole.y && y < hole.y + hole.height
}

/** Modules per side, quiet zone included — the SVG's viewBox and the PNG's grid. */
export function qrExtent(matrix: QrMatrix): number {
   return matrix.size + QR_QUIET_ZONE * 2
}

/**
 * The dark modules as one SVG path, in module units, quiet zone included.
 *
 * Each row's consecutive dark modules become a single rectangle. The
 * picture is identical to a square per module and the string is several
 * times shorter, which matters because it is server-rendered into the
 * page and written into every SVG download.
 *
 * Modules inside `hole` are left out rather than painted over, so the
 * logo sits on clean white and the preview, the SVG and the PNG all clear
 * exactly the same square.
 */
export function qrPath(matrix: QrMatrix, hole: QrHole | null = null): string {
   const commands: string[] = []
   const dark = (x: number, y: number, row: boolean[]): boolean => row[x] === true && !inHole(hole, x, y)

   matrix.modules.forEach((row, y) => {
      let x = 0

      while (x < row.length) {
         if (!dark(x, y, row)) {
            x += 1
            continue
         }

         const start = x

         while (x < row.length && dark(x, y, row)) x += 1

         const run = x - start

         commands.push(`M${start + QR_QUIET_ZONE} ${y + QR_QUIET_ZONE}h${run}v1h-${run}z`)
      }
   })

   return commands.join("")
}

/** Make a string safe inside a double-quoted XML attribute. */
function escapeAttribute(value: string): string {
   return value
      .replaceAll("&", "&amp;")
      .replaceAll("\"", "&quot;")
      .replaceAll("<", "&lt;")
}

/**
 * A standalone SVG document of the code, for download.
 *
 * Black on white whatever the site's theme. Plenty of scanners cannot
 * read an inverted code, and a file someone downloads is going on paper or
 * into a slide, not back onto this page.
 *
 * A logo is embedded as a data URL rather than linked, so the file works
 * on its own once it leaves this tab. It carries both `href` and the older
 * `xlink:href`, because some design tools still only read the second.
 */
export function qrSvg(matrix: QrMatrix, logo: { hole: QrHole, href: string } | null = null): string {
   const extent = qrExtent(matrix)
   const parts = [
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${extent} ${extent}" width="${extent * 10}" height="${extent * 10}" shape-rendering="crispEdges">`,
      `<rect width="${extent}" height="${extent}" fill="#ffffff"/>`,
      `<path d="${qrPath(matrix, logo?.hole ?? null)}" fill="#000000"/>`,
   ]

   if (logo !== null) {
      const box = qrLogoBox(logo.hole)
      const href = escapeAttribute(logo.href)

      parts.push(`<image href="${href}" xlink:href="${href}" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" preserveAspectRatio="xMidYMid meet"/>`)
   }

   parts.push("</svg>")

   return parts.join("")
}

/**
 * Whole pixels per module for a PNG of about `QR_PNG_TARGET` across.
 *
 * Whole, because a fractional module smears into grey edges when the
 * canvas resamples it, and a blurred edge is what a phone camera then has
 * to guess at. Rounded up, so the image never comes out smaller than the
 * target — a small code gets chunky modules, which scan better anyway.
 */
export function qrPngScale(matrix: QrMatrix): number {
   return Math.max(1, Math.ceil(QR_PNG_TARGET / qrExtent(matrix)))
}

/** The mode `uqr` will encode `text` in. */
export function qrMode(text: string): QrMode {
   if (NUMERIC.test(text)) return "numeric"
   if (ALPHANUMERIC.test(text)) return "alphanumeric"

   return "byte"
}

/**
 * How long `text` is in its own mode's unit — digits, characters or UTF-8
 * bytes — so it can be set against that mode's row of `QR_CAPACITY`.
 */
export function qrLength(text: string, mode: QrMode = qrMode(text)): number {
   return mode === "byte" ? new TextEncoder().encode(text).length : text.length
}
