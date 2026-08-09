import { describe, expect, it } from "vitest"
// Relative, not aliased: `~` is a Nuxt convenience that exists only inside
// the Nuxt/Vite environment, and these tests run in plain Node.
import {
   convert,
   convertToAll,
   DIMENSIONS,
   findUnit,
   fromFeetInches,
   toFeetInches,
} from "../../app/utils/units"

/// Known-value checks come from the exact legal definitions (an inch is
/// 0.0254 m, a pound 453.59237 g), so a wrong factor fails here rather
/// than shipping a converter that is subtly off.

describe("convert — mass", () => {
   const { mass } = DIMENSIONS

   it("converts kilograms to pounds", () => {
      expect(convert(1, "kg", "lb", mass)).toBeCloseTo(2.2046226218, 9)
   })

   it("converts pounds to ounces exactly", () => {
      expect(convert(1, "lb", "oz", mass)).toBeCloseTo(16, 10)
   })

   it("converts stone to pounds exactly", () => {
      expect(convert(1, "st", "lb", mass)).toBeCloseTo(14, 10)
   })

   it("converts a US short ton to pounds exactly", () => {
      expect(convert(1, "ton", "lb", mass)).toBeCloseTo(2000, 8)
   })

   it("scales within the metric system", () => {
      expect(convert(1, "kg", "g", mass)).toBeCloseTo(1000, 10)
      expect(convert(1, "t", "kg", mass)).toBeCloseTo(1000, 10)
      expect(convert(1, "g", "mg", mass)).toBeCloseTo(1000, 10)
   })
})

describe("convert — length", () => {
   const { length } = DIMENSIONS

   it("converts miles to metres exactly", () => {
      expect(convert(1, "mi", "m", length)).toBeCloseTo(1609.344, 9)
   })

   it("converts inches to centimetres exactly", () => {
      expect(convert(1, "in", "cm", length)).toBeCloseTo(2.54, 10)
   })

   it("converts feet to inches exactly", () => {
      expect(convert(1, "ft", "in", length)).toBeCloseTo(12, 10)
   })

   it("converts yards to feet exactly", () => {
      expect(convert(1, "yd", "ft", length)).toBeCloseTo(3, 10)
   })

   it("converts a common height", () => {
      expect(convert(180.34, "cm", "in", length)).toBeCloseTo(71, 8)
   })
})

/// Temperature is the reason units are modelled as affine transforms
/// rather than plain multipliers, so it gets the closest look.

describe("convert — temperature", () => {
   const { temperature } = DIMENSIONS

   it("converts the freezing and boiling points of water", () => {
      expect(convert(0, "c", "f", temperature)).toBeCloseTo(32, 10)
      expect(convert(100, "c", "f", temperature)).toBeCloseTo(212, 10)
      expect(convert(0, "c", "k", temperature)).toBeCloseTo(273.15, 10)
      expect(convert(100, "c", "k", temperature)).toBeCloseTo(373.15, 10)
   })

   it("converts back from Fahrenheit", () => {
      expect(convert(32, "f", "c", temperature)).toBeCloseTo(0, 10)
      expect(convert(212, "f", "c", temperature)).toBeCloseTo(100, 10)
      expect(convert(98.6, "f", "c", temperature)).toBeCloseTo(37, 10)
   })

   it("handles the scales crossing at -40", () => {
      expect(convert(-40, "c", "f", temperature)).toBeCloseTo(-40, 10)
      expect(convert(-40, "f", "c", temperature)).toBeCloseTo(-40, 10)
   })

   it("converts absolute zero", () => {
      expect(convert(0, "k", "c", temperature)).toBeCloseTo(-273.15, 10)
      expect(convert(-273.15, "c", "k", temperature)).toBeCloseTo(0, 10)
   })

   it("converts between Fahrenheit and kelvin across the base unit", () => {
      expect(convert(212, "f", "k", temperature)).toBeCloseTo(373.15, 10)
   })
})

/// A wrong factor can still round-trip (the error cancels), but a wrong
/// *offset* or a mixed-up direction cannot — so both checks earn their keep.

describe("convert — round trips", () => {
   for (const dimension of Object.values(DIMENSIONS)) {
      it(`returns the original value for every ${dimension.id} unit pair`, () => {
         for (const from of dimension.units) {
            for (const to of dimension.units) {
               const value = 12.5
               const there = convert(value, from.id, to.id, dimension)
               const back = convert(there, to.id, from.id, dimension)

               expect(back, `${from.id} → ${to.id} → ${from.id}`).toBeCloseTo(value, 8)
            }
         }
      })
   }
})

describe("convert — identity", () => {
   it("leaves a value untouched when both units match", () => {
      expect(convert(7.5, "kg", "kg", DIMENSIONS.mass)).toBeCloseTo(7.5, 12)
      expect(convert(7.5, "f", "f", DIMENSIONS.temperature)).toBeCloseTo(7.5, 12)
   })
})

describe("findUnit", () => {
   it("throws on an unknown unit rather than converting wrongly", () => {
      expect(() => findUnit(DIMENSIONS.mass, "parsec")).toThrow(/Unknown mass unit/)
   })

   it("propagates the failure through convert", () => {
      expect(() => convert(1, "kg", "parsec", DIMENSIONS.mass)).toThrow(/Unknown mass unit/)
   })
})

describe("convertToAll", () => {
   it("returns one entry per unit in the dimension", () => {
      const all = convertToAll(1, "kg", DIMENSIONS.mass)

      expect(Object.keys(all)).toEqual(DIMENSIONS.mass.units.map((unit) => unit.id))
      expect(all.g).toBeCloseTo(1000, 8)
      expect(all.lb).toBeCloseTo(2.2046226218, 9)
   })
})

describe("feet and inches", () => {
   it("splits a height into whole feet plus inches", () => {
      const height = toFeetInches(1.8034)

      expect(height.feet).toBe(5)
      expect(height.inches).toBeCloseTo(11, 1)
   })

   it("carries into the next foot instead of reporting 12 inches", () => {
      // 1.8287 m is 5 ft 11.98 in — rounding the inches alone would give
      // the nonsensical "5 ft 12.0 in".
      const height = toFeetInches(1.8287)

      expect(height.feet).toBe(6)
      expect(height.inches).toBeCloseTo(0, 6)
   })

   it("round-trips at full precision", () => {
      for (const metres of [0, 0.3048, 1.5, 1.8034, 2.11]) {
         const { feet, inches } = toFeetInches(metres, 12)

         expect(fromFeetInches(feet, inches)).toBeCloseTo(metres, 10)
      }
   })

   it("keeps feet and inches consistently signed", () => {
      const below = toFeetInches(-1.8034, 12)

      expect(below.feet).toBeLessThanOrEqual(0)
      expect(below.inches).toBeLessThanOrEqual(0)
      expect(fromFeetInches(below.feet, below.inches)).toBeCloseTo(-1.8034, 10)
   })

   it("agrees with the length dimension", () => {
      const metres = fromFeetInches(5, 11)

      expect(convert(metres, "m", "cm", DIMENSIONS.length)).toBeCloseTo(180.34, 8)
   })
})
