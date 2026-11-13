import { describe, expect, it } from "vitest"
// Relative, not aliased: `~` is a Nuxt convenience that exists only inside
// the Nuxt/Vite environment, and these tests run in plain Node.
import {
   encodeQr,
   QR_BYTE_CAPACITY,
   QR_DEFAULT_LEVEL,
   QR_LEVELS,
   QR_PNG_TARGET,
   QR_QUIET_ZONE,
   QR_RECOVERY,
   qrByteLength,
   qrExtent,
   qrLevelAt,
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
