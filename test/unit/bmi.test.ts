import { describe, expect, it } from "vitest"
// Relative, not aliased: `~` is a Nuxt convenience that exists only inside
// the Nuxt/Vite environment, and these tests run in plain Node.
import {
   BMI_BANDS,
   BMI_SCALE_MAX,
   BMI_SCALE_MIN,
   bmiBandWidths,
   bmiCategory,
   bmiScalePosition,
   calculateBmi,
   HEALTHY_BMI_MAX,
   HEALTHY_BMI_MIN,
   healthyWeightRange,
} from "../../app/utils/bmi"
import { convert, DIMENSIONS, fromFeetInches } from "../../app/utils/units"

describe("calculateBmi", () => {
   it("divides kilograms by metres squared", () => {
      expect(calculateBmi(70, 1.75)).toBeCloseTo(22.857142857, 8)
      expect(calculateBmi(60, 1.6)).toBeCloseTo(23.4375, 8)
   })

   /// The imperial path converts and then divides, so both unit systems
   /// have to land on the same number — otherwise the toggle changes the
   /// answer rather than the units.
   it("agrees between metric and imperial input", () => {
      const metric = calculateBmi(70, 1.75)
      const imperial = calculateBmi(
         convert(154.323584, "lb", "kg", DIMENSIONS.mass),
         fromFeetInches(5, 8.8976378),
      )

      expect(imperial).toBeCloseTo(metric ?? 0, 4)
   })

   it("returns null rather than a non-number for unusable input", () => {
      expect(calculateBmi(0, 1.75)).toBeNull()
      expect(calculateBmi(70, 0)).toBeNull()
      expect(calculateBmi(-70, 1.75)).toBeNull()
      expect(calculateBmi(Number.NaN, 1.75)).toBeNull()
      expect(calculateBmi(70, Number.POSITIVE_INFINITY)).toBeNull()
   })
})

describe("bmiCategory", () => {
   it("places a reading in the right band", () => {
      expect(bmiCategory(16)).toBe("underweight")
      expect(bmiCategory(22)).toBe("normal")
      expect(bmiCategory(27)).toBe("overweight")
      expect(bmiCategory(35)).toBe("obese")
   })

   /// Every boundary belongs to the band above it, so 25.0 is overweight
   /// rather than healthy. Off-by-one here changes a reader's category.
   it("puts each boundary in the upper band", () => {
      expect(bmiCategory(18.49)).toBe("underweight")
      expect(bmiCategory(HEALTHY_BMI_MIN)).toBe("normal")
      expect(bmiCategory(24.99)).toBe("normal")
      expect(bmiCategory(HEALTHY_BMI_MAX)).toBe("overweight")
      expect(bmiCategory(29.99)).toBe("overweight")
      expect(bmiCategory(30)).toBe("obese")
   })

   it("handles readings past either end of the drawn scale", () => {
      expect(bmiCategory(5)).toBe("underweight")
      expect(bmiCategory(120)).toBe("obese")
   })

   it("leaves no gap or overlap between bands", () => {
      for (const [index, band] of BMI_BANDS.entries()) {
         expect(band.from).toBeLessThan(band.to)

         const next = BMI_BANDS[index + 1]

         if (next) expect(next.from).toBe(band.to)
      }
   })
})

describe("healthyWeightRange", () => {
   it("returns the kilograms that reach the healthy band", () => {
      const range = healthyWeightRange(1.75)

      expect(range?.min).toBeCloseTo(56.65625, 5)
      expect(range?.max).toBeCloseTo(76.5625, 5)
   })

   /// The range and the categories have to agree, or the tool would tell
   /// someone a weight is healthy and then call the resulting BMI
   /// something else.
   it("agrees with bmiCategory at both ends", () => {
      const metres = 1.68
      const range = healthyWeightRange(metres)
      const low = calculateBmi(range?.min ?? 0, metres) ?? 0
      const high = calculateBmi(range?.max ?? 0, metres) ?? 0

      expect(bmiCategory(low)).toBe("normal")
      expect(low).toBeCloseTo(HEALTHY_BMI_MIN, 8)
      // The top of the range is the boundary itself, which reads as the
      // band above — a hair under it is the last healthy weight.
      expect(high).toBeCloseTo(HEALTHY_BMI_MAX, 8)
      expect(bmiCategory(high - 0.001)).toBe("normal")
   })

   it("returns null for a height that cannot produce one", () => {
      expect(healthyWeightRange(0)).toBeNull()
      expect(healthyWeightRange(Number.NaN)).toBeNull()
   })
})

describe("the drawn scale", () => {
   it("maps a reading to a fraction of the bar", () => {
      expect(bmiScalePosition(BMI_SCALE_MIN)).toBe(0)
      expect(bmiScalePosition(BMI_SCALE_MAX)).toBe(1)
      expect(bmiScalePosition((BMI_SCALE_MIN + BMI_SCALE_MAX) / 2)).toBeCloseTo(0.5, 10)
   })

   it("clamps a reading beyond either end", () => {
      expect(bmiScalePosition(2)).toBe(0)
      expect(bmiScalePosition(200)).toBe(1)
   })

   it("gives bands that fill the bar exactly once", () => {
      const widths = bmiBandWidths()

      expect(widths).toHaveLength(BMI_BANDS.length)
      expect(widths.reduce((total, band) => total + band.width, 0)).toBeCloseTo(1, 10)

      for (const band of widths) {
         expect(band.width).toBeGreaterThan(0)
      }
   })
})
