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

describe("convert — speed", () => {
   const { speed } = DIMENSIONS

   it("converts metres per second to km/h by exactly 3.6", () => {
      expect(convert(1, "mps", "kmh", speed)).toBeCloseTo(3.6, 10)
   })

   it("converts a motorway speed to miles per hour", () => {
      expect(convert(100, "kmh", "mph", speed)).toBeCloseTo(62.1371192237, 8)
   })

   it("derives miles per hour from the exact mile", () => {
      // A mile is 1609.344 m exactly, so 1 mph is that many metres per hour.
      expect(convert(1, "mph", "mps", speed)).toBeCloseTo(1609.344 / 3600, 12)
   })

   it("converts feet per second against the exact foot", () => {
      expect(convert(1, "fps", "mps", speed)).toBeCloseTo(0.3048, 12)
   })

   it("derives the knot from the nautical mile, not the land mile", () => {
      expect(convert(1, "kn", "mps", speed)).toBeCloseTo(1852 / 3600, 12)
      // The two miles differ, so a knot must not equal a mile per hour.
      expect(convert(1, "kn", "mph", speed)).toBeCloseTo(1.1507794480, 9)
   })
})

/// Volume is the dimension where a wrong answer looks most plausible: the
/// US and imperial units share names, so a mix-up reads as a normal number
/// rather than as an obvious error. Both systems are pinned here.

describe("convert — volume", () => {
   const { volume } = DIMENSIONS

   it("derives the US gallon from 231 cubic inches exactly", () => {
      expect(convert(1, "us-gal", "l", volume)).toBeCloseTo(3.785411784, 12)
   })

   it("uses the exact 1985 definition of the imperial gallon", () => {
      expect(convert(1, "imp-gal", "l", volume)).toBeCloseTo(4.54609, 12)
   })

   it("keeps the two gallons about a fifth apart", () => {
      expect(convert(1, "imp-gal", "us-gal", volume)).toBeCloseTo(1.2009499255, 9)
   })

   it("divides each gallon by its own number of fluid ounces", () => {
      // 128 for the US gallon, 160 for the imperial one.
      expect(convert(1, "us-gal", "us-floz", volume)).toBeCloseTo(128, 10)
      expect(convert(1, "imp-gal", "imp-floz", volume)).toBeCloseTo(160, 10)
   })

   it("keeps the two pints distinct", () => {
      expect(convert(1, "us-pt", "ml", volume)).toBeCloseTo(473.176473, 9)
      expect(convert(1, "imp-pt", "ml", volume)).toBeCloseTo(568.26125, 9)
   })

   it("nests the US spoons and cups inside the gallon", () => {
      expect(convert(1, "us-floz", "us-tbsp", volume)).toBeCloseTo(2, 10)
      expect(convert(1, "us-tbsp", "us-tsp", volume)).toBeCloseTo(3, 10)
      expect(convert(1, "us-cup", "us-floz", volume)).toBeCloseTo(8, 10)
      expect(convert(1, "us-qt", "us-pt", volume)).toBeCloseTo(2, 10)
   })

   it("scales the metric units against the litre", () => {
      expect(convert(1, "m3", "l", volume)).toBeCloseTo(1000, 10)
      expect(convert(1, "l", "ml", volume)).toBeCloseTo(1000, 10)
   })
})

/// Area factors are length factors squared, which is the one thing a
/// reader is most likely to assume works linearly.

describe("convert — area", () => {
   const { area } = DIMENSIONS

   it("squares the length conversion rather than reusing it", () => {
      expect(convert(1, "m2", "ft2", area)).toBeCloseTo(10.7639104167, 8)
      // Not 3.2808399 — that would be the unsquared length ratio.
      expect(convert(1, "ft2", "m2", area)).toBeCloseTo(0.09290304, 10)
   })

   it("converts square inches exactly", () => {
      expect(convert(1, "in2", "cm2", area)).toBeCloseTo(6.4516, 10)
   })

   it("defines the acre as 4,840 square yards", () => {
      expect(convert(1, "acre", "yd2", area)).toBeCloseTo(4840, 8)
      expect(convert(1, "acre", "m2", area)).toBeCloseTo(4046.8564224, 7)
   })

   it("relates the hectare and the acre", () => {
      expect(convert(1, "ha", "m2", area)).toBeCloseTo(10_000, 8)
      expect(convert(1, "ha", "acre", area)).toBeCloseTo(2.4710538147, 8)
   })

   it("makes a square mile 640 acres", () => {
      expect(convert(1, "mi2", "acre", area)).toBeCloseTo(640, 6)
   })
})

describe("convert — time", () => {
   const { time } = DIMENSIONS

   it("converts the everyday units", () => {
      expect(convert(1, "min", "s", time)).toBeCloseTo(60, 10)
      expect(convert(1, "h", "min", time)).toBeCloseTo(60, 10)
      expect(convert(1, "d", "h", time)).toBeCloseTo(24, 10)
      expect(convert(1, "wk", "d", time)).toBeCloseTo(7, 10)
   })

   it("puts 86,400 seconds in a day", () => {
      expect(convert(1, "d", "s", time)).toBeCloseTo(86_400, 8)
      expect(convert(1, "wk", "s", time)).toBeCloseTo(604_800, 8)
   })

   it("uses a 365-day year, as the FAQ states", () => {
      expect(convert(1, "yr", "d", time)).toBeCloseTo(365, 8)
      expect(convert(1, "yr", "s", time)).toBeCloseTo(31_536_000, 6)
   })

   it("offers no month, which has no fixed length", () => {
      expect(time.units.map((unit) => unit.id)).not.toContain("mo")
      expect(() => convert(1, "mo", "d", time)).toThrow(/Unknown time unit/)
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
