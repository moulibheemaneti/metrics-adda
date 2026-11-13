import { describe, expect, it } from "vitest"
// Relative, not aliased: `~` is a Nuxt convenience that exists only inside
// the Nuxt/Vite environment, and these tests run in plain Node.
import {
   encodeQr,
   QR_BYTE_CAPACITY,
   QR_DEFAULT_LEVEL,
   QR_LEVELS,
   QR_LOGO_DEFAULT,
   QR_LOGO_LEVEL,
   QR_LOGO_MAX,
   QR_LOGO_MAX_ASPECT,
   QR_LOGO_MIN,
   QR_PNG_TARGET,
   QR_QUIET_ZONE,
   QR_RECOVERY,
   qrByteLength,
   qrExtent,
   qrFitLogo,
   qrLevelAt,
   qrLogoBox,
   qrLogoHole,
   qrPath,
   qrPngScale,
   qrSvg,
   type QrMatrix,
} from "../../app/utils/qr"

/// Most tests want the matrix, and have nothing to say about the wrapper
/// until the encode has succeeded.
function matrixOf(text: string, level = QR_DEFAULT_LEVEL): QrMatrix {
   const result = encodeQr(text, level)

   if (!result.ok) throw new Error(`expected a code, got ${result.fault}`)

   return result.matrix
}

/// Paint `qrPath`'s rectangles back onto a grid, so the path can be
/// checked module for module against the matrix it was drawn from.
function paint(path: string, extent: number): boolean[][] {
   const grid = Array.from({ length: extent }, () => Array.from({ length: extent }, () => false))

   for (const [, x, y, run] of path.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/gu)) {
      const row = grid[Number(y)]

      for (let column = Number(x); column < Number(x) + Number(run); column += 1) {
         if (row) row[column] = true
      }
   }

   return grid
}

describe("QR levels", () => {
   it("orders the levels weakest to strongest", () => {
      expect(QR_LEVELS).toEqual(["L", "M", "Q", "H"])

      const recovery = QR_LEVELS.map((level) => QR_RECOVERY[level])

      expect(recovery).toEqual([...recovery].sort((a, b) => a - b))
   })

   it("defaults to M", () => {
      expect(QR_DEFAULT_LEVEL).toBe("M")
   })

   /// The fault message quotes these, so they have to be the real limits.
   it("states each level's capacity exactly", () => {
      for (const level of QR_LEVELS) {
         const limit = QR_BYTE_CAPACITY[level]

         expect(encodeQr("x".repeat(limit), level).ok, `${level} at its limit`).toBe(true)
         expect(encodeQr("x".repeat(limit + 1), level).ok, `${level} past its limit`).toBe(false)
      }
   })
})

describe("qrLevelAt", () => {
   it("maps each slider position to its level", () => {
      expect(QR_LEVELS.map((_, index) => qrLevelAt(index))).toEqual([...QR_LEVELS])
   })

   it("clamps and rounds a position it was not built for", () => {
      expect(qrLevelAt(-3)).toBe("L")
      expect(qrLevelAt(9)).toBe("H")
      expect(qrLevelAt(1.4)).toBe("M")
      expect(qrLevelAt(Number.NaN)).toBe(QR_DEFAULT_LEVEL)
   })
})

describe("encodeQr", () => {
   it("encodes a URL into a square grid of its version's size", () => {
      const matrix = matrixOf("https://www.metricsadda.com")

      // Every version adds four modules a side to version 1's 21.
      expect(matrix.size).toBe(17 + 4 * matrix.version)
      expect(matrix.modules).toHaveLength(matrix.size)

      for (const row of matrix.modules) expect(row).toHaveLength(matrix.size)
   })

   it("draws the three finder squares in their corners", () => {
      const { modules, size } = matrixOf("https://www.metricsadda.com")

      // The outer ring of each 7×7 finder is dark all the way round.
      for (const [top, left] of [[0, 0], [0, size - 7], [size - 7, 0]] as const) {
         for (let offset = 0; offset < 7; offset += 1) {
            expect(modules[top]?.[left + offset]).toBe(true)
            expect(modules[top + 6]?.[left + offset]).toBe(true)
            expect(modules[top + offset]?.[left]).toBe(true)
            expect(modules[top + offset]?.[left + 6]).toBe(true)
         }
      }
   })

   /// The trade the slider exists to make: a stronger level never comes
   /// out smaller.
   it("never shrinks the grid as the level rises", () => {
      const sizes = QR_LEVELS.map((level) => matrixOf("https://www.metricsadda.com/qr", level).size)

      expect(sizes).toEqual([...sizes].sort((a, b) => a - b))
      expect(sizes.at(-1)).toBeGreaterThan(sizes[0] ?? 0)
   })

   it("encodes text outside ASCII", () => {
      expect(encodeQr("café ☕ 🎉").ok).toBe(true)
   })

   it("reports text too long for one code", () => {
      expect(encodeQr("x".repeat(3000), "L")).toEqual({ ok: false, fault: "tooLong" })
   })

   /// `uqr` reaches UTF-8 through `encodeURI`, which throws on half an
   /// astral character. That is a different problem from length and gets
   /// a different message.
   it("reports a lone surrogate separately", () => {
      expect(encodeQr("broken \uD83D here")).toEqual({ ok: false, fault: "loneSurrogate" })
   })
})

describe("qrPath", () => {
   it("covers exactly the dark modules, offset by the quiet zone", () => {
      const matrix = matrixOf("https://www.metricsadda.com")
      const extent = qrExtent(matrix)
      const painted = paint(qrPath(matrix), extent)

      expect(extent).toBe(matrix.size + QR_QUIET_ZONE * 2)

      for (let y = 0; y < extent; y += 1) {
         for (let x = 0; x < extent; x += 1) {
            const inside = matrix.modules[y - QR_QUIET_ZONE]?.[x - QR_QUIET_ZONE] ?? false

            expect(painted[y]?.[x], `module ${x},${y}`).toBe(inside)
         }
      }
   })

   /// The reason it is not `uqr`'s own renderer: one rectangle per run
   /// rather than per module.
   it("merges each row's dark runs", () => {
      const matrix = matrixOf("https://www.metricsadda.com")
      const darkModules = matrix.modules.flat().filter(Boolean).length
      const rectangles = qrPath(matrix).split("M").length - 1

      expect(rectangles).toBeLessThan(darkModules)
   })
})

describe("qrSvg", () => {
   it("is a standalone black-on-white document with its quiet zone", () => {
      const matrix = matrixOf("hello")
      const extent = qrExtent(matrix)
      const svg = qrSvg(matrix)

      expect(svg.startsWith("<svg xmlns=\"http://www.w3.org/2000/svg\"")).toBe(true)
      expect(svg).toContain(`viewBox="0 0 ${extent} ${extent}"`)
      expect(svg).toContain("fill=\"#ffffff\"")
      expect(svg).toContain("fill=\"#000000\"")
      expect(svg).toContain(qrPath(matrix))
      expect(svg.endsWith("</svg>")).toBe(true)
   })
})

describe("qrPngScale", () => {
   it("uses whole pixels per module and never undershoots the target", () => {
      for (const text of ["a", "https://www.metricsadda.com", "x".repeat(2000)]) {
         const matrix = matrixOf(text, "L")
         const scale = qrPngScale(matrix)

         expect(Number.isInteger(scale)).toBe(true)
         expect(scale * qrExtent(matrix)).toBeGreaterThanOrEqual(QR_PNG_TARGET)
      }
   })
})

describe("qrByteLength", () => {
   it("counts UTF-8 bytes, not characters", () => {
      expect(qrByteLength("abc")).toBe(3)
      expect(qrByteLength("é")).toBe(2)
      expect(qrByteLength("🎉")).toBe(4)
   })
})

describe("logo caps", () => {
   /// A stronger level can always carry at least as big a logo.
   it("never shrink as the level rises", () => {
      const caps = QR_LEVELS.map((level) => QR_LOGO_MAX[level])

      expect(caps).toEqual([...caps].sort((a, b) => a - b))
   })

   it("allow no logo at L, and stay under each level's recovery", () => {
      expect(QR_LOGO_MAX.L).toBe(0)

      // A logo w wide covers about w² of the code; that has to sit well
      // inside the share the level can recover.
      for (const level of QR_LEVELS) {
         expect((QR_LOGO_MAX[level] / 100) ** 2 * 100).toBeLessThan(QR_RECOVERY[level])
      }
   })

   /// The slider's range has to be non-empty at every level that has one,
   /// and the starting size has to be inside the range at the logo level.
   it("leave the slider a usable range", () => {
      for (const level of QR_LEVELS) {
         if (QR_LOGO_MAX[level] > 0) expect(QR_LOGO_MAX[level]).toBeGreaterThanOrEqual(QR_LOGO_MIN)
      }

      expect(QR_LOGO_DEFAULT).toBeGreaterThanOrEqual(QR_LOGO_MIN)
      expect(QR_LOGO_DEFAULT).toBeLessThanOrEqual(QR_LOGO_MAX[QR_LOGO_LEVEL])
      expect(QR_LOGO_LEVEL).toBe("H")
   })
})

describe("qrLogoHole", () => {
   const matrices = ["a", "https://www.metricsadda.com", "x".repeat(400), "x".repeat(1200)]
      .map((text) => matrixOf(text, "H"))

   /// The rule the measured caps depend on: whatever shape the logo, the
   /// space cleared for it never exceeds the cap's area.
   it("is odd on each side, centred, and inside the level's cap at any shape", () => {
      for (const matrix of matrices) {
         for (const aspect of [1, 3, 0.25, 2, 0.5, 1.6]) {
            for (const level of ["M", "Q", "H"] as const) {
               const cap = QR_LOGO_MAX[level]

               for (let percent = QR_LOGO_MIN; percent <= cap; percent += 1) {
                  const hole = qrLogoHole(matrix, percent, aspect, cap)
                  const label = `${percent}% at ${aspect}:1 on ${matrix.size}`

                  expect(hole.width % 2, label).toBe(1)
                  expect(hole.height % 2, label).toBe(1)
                  expect(hole.x * 2 + hole.width, label).toBe(matrix.size)
                  expect(hole.y * 2 + hole.height, label).toBe(matrix.size)
                  expect(hole.width * hole.height, label)
                     .toBeLessThanOrEqual(Math.max(((matrix.size * cap) / 100) ** 2, 9))
               }
            }
         }
      }
   })

   it("gives a square logo a square space", () => {
      for (const matrix of matrices) {
         const hole = qrLogoHole(matrix, QR_LOGO_DEFAULT, 1, QR_LOGO_MAX.H)

         expect(hole.width).toBe(hole.height)
      }
   })

   /// A wordmark gets a wide space, but no wider than the 2:1 that was
   /// measured — a 3:1 logo gets the same space as a 2:1 one.
   it("gives a wide logo a wider space, up to 2:1", () => {
      for (const matrix of matrices.slice(1)) {
         const wide = qrLogoHole(matrix, QR_LOGO_DEFAULT, 3, QR_LOGO_MAX.H)
         const tall = qrLogoHole(matrix, QR_LOGO_DEFAULT, 1 / 3, QR_LOGO_MAX.H)

         expect(wide.width).toBeGreaterThan(wide.height)
         expect(wide).toEqual(qrLogoHole(matrix, QR_LOGO_DEFAULT, QR_LOGO_MAX_ASPECT, QR_LOGO_MAX.H))
         expect(wide.width / wide.height).toBeLessThan(QR_LOGO_MAX_ASPECT + 0.5)
         expect([tall.width, tall.height]).toEqual([wide.height, wide.width])
      }
   })

   /// Rounding down drew a "20%" logo at 15% on a short link. A 33-module
   /// code at 20% is 6.6 modules, and the nearest odd span is 7.
   it("tracks the slider rather than always rounding down", () => {
      const matrix = matrixOf("https://www.metricsadda.com", "H")

      expect(matrix.size).toBe(33)
      expect(qrLogoHole(matrix, 20, 1, QR_LOGO_MAX.H).width).toBe(7)
   })

   it("keeps at least three modules, so there is room to show an image", () => {
      const hole = qrLogoHole(matrixOf("a", "H"), 1)

      expect([hole.width, hole.height]).toEqual([3, 3])
   })

   /// 3 × 3 is the floor on the smallest code there is, and it must not
   /// break the smallest cap — or M would show a logo bigger than it allows.
   it("keeps the three-module floor under the smallest cap", () => {
      expect(3 * 3).toBeLessThanOrEqual(((21 * QR_LOGO_MAX.M) / 100) ** 2)
   })
})

describe("qrPath with a logo", () => {
   it("leaves the cleared rectangle empty and draws everything else", () => {
      const matrix = matrixOf("https://www.metricsadda.com", "H")
      const hole = qrLogoHole(matrix, QR_LOGO_MAX.H, 2)
      const painted = paint(qrPath(matrix, hole), qrExtent(matrix))

      for (let y = 0; y < matrix.size; y += 1) {
         for (let x = 0; x < matrix.size; x += 1) {
            const cleared = x >= hole.x && x < hole.x + hole.width
              && y >= hole.y && y < hole.y + hole.height
            const expected = cleared ? false : matrix.modules[y]?.[x] ?? false

            expect(painted[y + QR_QUIET_ZONE]?.[x + QR_QUIET_ZONE], `module ${x},${y}`).toBe(expected)
         }
      }
   })
})

describe("qrLogoBox", () => {
   it("sits inside the cleared rectangle, inset evenly from its edges", () => {
      const hole = { x: 10, y: 12, width: 9, height: 5 }
      const box = qrLogoBox(hole)
      const left = hole.x + QR_QUIET_ZONE
      const top = hole.y + QR_QUIET_ZONE

      expect(box.x).toBeGreaterThan(left)
      expect(box.y).toBeGreaterThan(top)
      expect(box.x - left).toBeCloseTo(box.y - top)
      expect(box.x - left).toBeCloseTo(left + hole.width - (box.x + box.width))
      expect(box.y - top).toBeCloseTo(top + hole.height - (box.y + box.height))
   })
})

describe("qrFitLogo", () => {
   const box = { x: 10, y: 10, width: 6, height: 6 }

   it("keeps a wide logo's shape and centres it vertically", () => {
      expect(qrFitLogo(box, 300, 100)).toEqual({ x: 10, y: 12, width: 6, height: 2 })
   })

   it("keeps a tall logo's shape and centres it horizontally", () => {
      expect(qrFitLogo(box, 100, 200)).toEqual({ x: 11.5, y: 10, width: 3, height: 6 })
   })

   it("fills the box with a logo of the box's own shape", () => {
      expect(qrFitLogo({ x: 2, y: 3, width: 8, height: 4 }, 200, 100))
         .toEqual({ x: 2, y: 3, width: 8, height: 4 })
   })
})

describe("qrSvg with a logo", () => {
   it("embeds the image over the cleared square, readable by older tools too", () => {
      const matrix = matrixOf("hello", "H")
      const hole = qrLogoHole(matrix, QR_LOGO_DEFAULT)
      const box = qrLogoBox(hole)
      const svg = qrSvg(matrix, { hole, href: "data:image/png;base64,AAAA" })

      expect(svg).toContain("xmlns:xlink=\"http://www.w3.org/1999/xlink\"")
      expect(svg).toContain(" href=\"data:image/png;base64,AAAA\"")
      expect(svg).toContain("xlink:href=\"data:image/png;base64,AAAA\"")
      expect(svg).toContain(`x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}"`)
      expect(svg).toContain(qrPath(matrix, hole))
   })

   it("escapes the href so it cannot close its own attribute", () => {
      const matrix = matrixOf("hello", "H")
      const svg = qrSvg(matrix, { hole: qrLogoHole(matrix, 20), href: "a\"><script>&" })

      expect(svg).not.toContain("<script>")
      expect(svg).toContain("a&quot;>&lt;script>&amp;")
   })

   it("has no image without a logo", () => {
      expect(qrSvg(matrixOf("hello"))).not.toContain("<image")
   })
})
