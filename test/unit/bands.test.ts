import { describe, expect, it } from "vitest"
// Relative, not aliased: `~` is a Nuxt convenience that exists only inside
// the Nuxt/Vite environment, and these tests run in plain Node.
import { bandFor, bandPosition, bandWidths, type Band } from "../../app/utils/bands"

type Grade = "low" | "middle" | "high"

const GRADES: Band<Grade>[] = [
   { id: "low", from: 0, to: 10 },
   { id: "middle", from: 10, to: 20 },
   { id: "high", from: 20, to: Number.POSITIVE_INFINITY },
]

describe("bandFor", () => {
   it("picks the band a reading falls in", () => {
      expect(bandFor(5, GRADES)).toBe("low")
      expect(bandFor(15, GRADES)).toBe("middle")
      expect(bandFor(100, GRADES)).toBe("high")
   })

   /// The rule the whole module rests on, and the one that has to hold
   /// identically for every metric — a boundary belongs to the band above
   /// it, so 10 is "middle" rather than the top of "low".
   it("puts each boundary in the upper band", () => {
      expect(bandFor(9.99, GRADES)).toBe("low")
      expect(bandFor(10, GRADES)).toBe("middle")
      expect(bandFor(19.99, GRADES)).toBe("middle")
      expect(bandFor(20, GRADES)).toBe("high")
   })

   it("returns null rather than guessing for a reading no band covers", () => {
      expect(bandFor(Number.NaN, GRADES)).toBeNull()
      expect(bandFor(-1, GRADES)).toBeNull()
      expect(bandFor(5, [])).toBeNull()
   })
})

describe("bandPosition", () => {
   it("maps a reading to a fraction of the bar", () => {
      expect(bandPosition(15, 15, 40)).toBe(0)
      expect(bandPosition(40, 15, 40)).toBe(1)
      expect(bandPosition(27.5, 15, 40)).toBeCloseTo(0.5, 10)
   })

   it("clamps a reading beyond either end", () => {
      expect(bandPosition(2, 15, 40)).toBe(0)
      expect(bandPosition(200, 15, 40)).toBe(1)
   })
})

describe("bandWidths", () => {
   it("gives bands that fill the bar exactly once", () => {
      const widths = bandWidths(GRADES, 0, 30)

      expect(widths).toHaveLength(GRADES.length)
      expect(widths.reduce((total, band) => total + band.width, 0)).toBeCloseTo(1, 10)
   })

   /// The last band runs to infinity and the first can start below the
   /// drawn minimum, so both have to be clipped to the scale or the widths
   /// stop summing to 1 and the bar overflows its container.
   it("clips the open-ended bands to the drawn scale", () => {
      const widths = bandWidths(GRADES, 5, 25)

      expect(widths[0]?.width).toBeCloseTo(0.25, 10)
      expect(widths[2]?.width).toBeCloseTo(0.25, 10)

      for (const band of widths) {
         expect(band.width).toBeGreaterThan(0)
      }
   })
})
