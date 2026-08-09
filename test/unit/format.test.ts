import { describe, expect, it } from "vitest"
// Relative, not aliased: `~` is a Nuxt convenience that exists only inside
// the Nuxt/Vite environment, and these tests run in plain Node.
import { formatCount, formatDuration, formatQuantity, parseQuantity } from "../../app/utils/format"

describe("formatQuantity", () => {
   it("hides floating-point noise", () => {
      // 1 kg in pounds, straight from the conversion.
      expect(formatQuantity(2.2046226218487757)).toBe("2.2046226")
   })

   it("groups thousands", () => {
      expect(formatQuantity(1234567)).toBe("1,234,567")
   })

   it("leaves a round number without a decimal point", () => {
      expect(formatQuantity(1000)).toBe("1,000")
      expect(formatQuantity(0)).toBe("0")
   })

   it("keeps small values readable", () => {
      expect(formatQuantity(0.001)).toBe("0.001")
   })

   it("honours a custom digit budget", () => {
      expect(formatQuantity(2.2046226218487757, 3)).toBe("2.2")
   })

   it("formats non-finite input as an empty string", () => {
      expect(formatQuantity(Number.NaN)).toBe("")
      expect(formatQuantity(Number.POSITIVE_INFINITY)).toBe("")
   })

   it("keeps negatives negative", () => {
      expect(formatQuantity(-40)).toBe("-40")
   })
})

describe("parseQuantity", () => {
   it("reads a plain number", () => {
      expect(parseQuantity("42")).toBe(42)
      expect(parseQuantity("3.5")).toBe(3.5)
      expect(parseQuantity("-40")).toBe(-40)
   })

   it("accepts its own formatted output", () => {
      expect(parseQuantity(formatQuantity(1234567))).toBe(1234567)
   })

   it("ignores grouping separators and spaces", () => {
      expect(parseQuantity("1,234.5")).toBe(1234.5)
      expect(parseQuantity(" 12 ")).toBe(12)
   })

   it("returns null for an empty field rather than zero", () => {
      // Number("") is 0, which would silently convert a blank input.
      expect(parseQuantity("")).toBeNull()
      expect(parseQuantity("   ")).toBeNull()
   })

   it("returns null for text that is not a number", () => {
      expect(parseQuantity("abc")).toBeNull()
      expect(parseQuantity("1.2.3")).toBeNull()
   })

   it("returns null for a half-typed number", () => {
      expect(parseQuantity("-")).toBeNull()
   })

   it("treats a trailing decimal point as the number so far", () => {
      expect(parseQuantity("1.")).toBe(1)
   })
})

describe("formatCount", () => {
   it("groups thousands", () => {
      expect(formatCount(12345)).toBe("12,345")
   })

   it("shows zero", () => {
      expect(formatCount(0)).toBe("0")
   })

   it("falls back to zero for non-finite input", () => {
      expect(formatCount(Number.NaN)).toBe("0")
   })
})

describe("formatDuration", () => {
   it("reports sub-minute durations in seconds", () => {
      expect(formatDuration(40)).toBe("40 sec")
   })

   it("reports whole minutes without a seconds part", () => {
      expect(formatDuration(120)).toBe("2 min")
   })

   it("reports minutes and seconds together", () => {
      expect(formatDuration(80)).toBe("1 min 20 sec")
   })

   it("reports zero for empty input", () => {
      expect(formatDuration(0)).toBe("0 sec")
      expect(formatDuration(Number.NaN)).toBe("0 sec")
   })
})
