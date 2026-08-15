import { describe, expect, it } from "vitest"
// Relative, not aliased: `~` is a Nuxt convenience that exists only inside
// the Nuxt/Vite environment, and these tests run in plain Node.
import {
   applyPercentage,
   changeDirection,
   PERCENTAGE_MODES,
   percentageChange,
   percentageOf,
   percentageRatio,
   solvePercentage,
} from "../../app/utils/percentage"

describe("percentageOf", () => {
   it("takes a percentage of a number", () => {
      expect(percentageOf(20, 80)).toBe(16)
   })

   it("handles a percentage over 100", () => {
      expect(percentageOf(150, 40)).toBe(60)
   })

   it("returns zero for a zero percentage", () => {
      expect(percentageOf(0, 80)).toBe(0)
   })

   it("handles a negative percentage", () => {
      expect(percentageOf(-25, 80)).toBe(-20)
   })
})

describe("percentageRatio", () => {
   it("reports one number as a percentage of another", () => {
      expect(percentageRatio(16, 80)).toBe(20)
   })

   it("reports a part larger than the whole as over 100", () => {
      expect(percentageRatio(120, 80)).toBe(150)
   })

   /// Every part is an equally good answer when the whole is nothing, so
   /// there is no figure to print. Returning Infinity here would render
   /// as "∞%" on the page and read as a broken tool rather than as an
   /// undefined question.
   it("has no answer for a whole of zero", () => {
      expect(percentageRatio(12, 0)).toBeNull()
   })

   it("still answers for a part of zero", () => {
      expect(percentageRatio(0, 80)).toBe(0)
   })
})

describe("percentageChange", () => {
   it("reports a rise as a positive percentage", () => {
      expect(percentageChange(80, 100)).toBe(25)
   })

   it("reports a fall as a negative percentage", () => {
      expect(percentageChange(100, 80)).toBe(-20)
   })

   /// The asymmetry people get wrong, and the reason the FAQ names it: the
   /// two directions between the same pair of numbers are different sizes,
   /// because the base changes.
   it("is not symmetric between the same two numbers", () => {
      expect(percentageChange(80, 100)).not.toBe(-(percentageChange(100, 80) as number))
   })

   it("reports no change as zero", () => {
      expect(percentageChange(80, 80)).toBe(0)
   })

   it("has no answer for growth from zero", () => {
      expect(percentageChange(0, 50)).toBeNull()
   })
})

describe("applyPercentage", () => {
   it("adds a percentage to a value", () => {
      expect(applyPercentage(80, 20)).toBe(96)
   })

   it("takes a percentage off a value", () => {
      expect(applyPercentage(80, -20)).toBe(64)
   })

   /// Taking off what was just added does not return the original, for the
   /// same reason percentage change is not symmetric — the second
   /// percentage applies to the larger number.
   it("does not round-trip through add then subtract", () => {
      expect(applyPercentage(applyPercentage(80, 20), -20)).toBeCloseTo(76.8, 10)
   })
})

describe("solvePercentage", () => {
   it("answers every mode", () => {
      for (const mode of PERCENTAGE_MODES) {
         expect(solvePercentage(mode, 20, 80), `${mode} has no answer`).not.toBeNull()
      }
   })

   it("returns one row for the single-answer modes", () => {
      expect(solvePercentage("of", 20, 80)).toEqual([{ id: "of", value: 16, unit: "value" }])
      expect(solvePercentage("ratio", 16, 80)).toEqual([{ id: "ratio", value: 20, unit: "percent" }])
      expect(solvePercentage("change", 80, 100)).toEqual([
         { id: "change", value: 25, unit: "percent" },
      ])
   })

   /// Both directions, because both are what someone means by "adjust by
   /// 20%" — and neither requires them to discover that a negative
   /// percentage is how you ask for the other one.
   it("returns both directions for adjust", () => {
      expect(solvePercentage("adjust", 80, 20)).toEqual([
         { id: "increased", value: 96, unit: "value" },
         { id: "decreased", value: 64, unit: "value" },
      ])
   })

   it("passes an undefined answer through as null", () => {
      expect(solvePercentage("ratio", 12, 0)).toBeNull()
      expect(solvePercentage("change", 0, 50)).toBeNull()
   })

   it("has no answer for a non-finite input", () => {
      expect(solvePercentage("of", Number.POSITIVE_INFINITY, 80)).toBeNull()
      expect(solvePercentage("of", 20, Number.NaN)).toBeNull()
   })
})

describe("changeDirection", () => {
   it("names each direction", () => {
      expect(changeDirection(25)).toBe("increase")
      expect(changeDirection(-20)).toBe("decrease")
      expect(changeDirection(0)).toBe("unchanged")
   })
})
