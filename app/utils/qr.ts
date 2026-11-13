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
 * The most bytes one QR code holds at each level, in byte mode.
 *
 * Version 40's capacity, from the standard's table. Digits and upper-case
 * text pack tighter than this, so it is the honest limit for ordinary text
 * rather than the absolute one — which is the number someone who has just
 * hit it needs.
 */
export const QR_BYTE_CAPACITY: Record<QrLevel, number> = { L: 2953, M: 2331, Q: 1663, H: 1273 }

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
 */
export function qrPath(matrix: QrMatrix): string {
   const commands: string[] = []

   matrix.modules.forEach((row, y) => {
      let x = 0

      while (x < row.length) {
         if (!row[x]) {
            x += 1
            continue
         }

         const start = x

         while (x < row.length && row[x]) x += 1

         const run = x - start

         commands.push(`M${start + QR_QUIET_ZONE} ${y + QR_QUIET_ZONE}h${run}v1h-${run}z`)
      }
   })

   return commands.join("")
}

/**
 * A standalone SVG document of the code, for download.
 *
 * Black on white whatever the site's theme. Plenty of scanners cannot
 * read an inverted code, and a file someone downloads is going on paper or
 * into a slide, not back onto this page.
 */
export function qrSvg(matrix: QrMatrix): string {
   const extent = qrExtent(matrix)

   return [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${extent} ${extent}" width="${extent * 10}" height="${extent * 10}" shape-rendering="crispEdges">`,
      `<rect width="${extent}" height="${extent}" fill="#ffffff"/>`,
      `<path d="${qrPath(matrix)}" fill="#000000"/>`,
      "</svg>",
   ].join("")
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

/** UTF-8 length of `text`, for telling someone how far over the limit they are. */
export function qrByteLength(text: string): number {
   return new TextEncoder().encode(text).length
}
