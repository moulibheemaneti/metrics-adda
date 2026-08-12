import { describe, expect, it } from "vitest"
// Relative, not aliased: `~` is a Nuxt convenience that exists only inside
// the Nuxt/Vite environment, and these tests run in plain Node.
import {
   ACTIVITY_FACTORS,
   ACTIVITY_LEVELS,
   BODY_FAT_BANDS,
   bmrKatchMcArdle,
   bmrMifflin,
   bodyFatCategory,
   bodyFatDeurenberg,
   bodyFatNavy,
   fatFreeMassIndex,
   idealWeights,
   leanBodyMassBoer,
   normalisedFfmi,
   SEXES,
   tdee,
   waistToHeightRatio,
   waistToHipRatio,
   WHR_BANDS,
   WHTR_BANDS,
   whrCategory,
   whtrCategory,
} from "../../app/utils/body"
import { calculateBmi } from "../../app/utils/bmi"

/// One worked person per sex, used throughout so a coefficient typo shows
/// up as a moved number rather than as a vague failure.
const MAN = { metres: 1.75, heightCm: 175, kilograms: 70, age: 30, waist: 85, neck: 38, hip: 95 }
const WOMAN = { metres: 1.65, heightCm: 165, kilograms: 62, age: 35, waist: 76, neck: 32, hip: 98 }

const manBmi = calculateBmi(MAN.kilograms, MAN.metres) ?? 0
const womanBmi = calculateBmi(WOMAN.kilograms, WOMAN.metres) ?? 0

describe("bodyFatNavy", () => {
   it("estimates from circumferences", () => {
      expect(bodyFatNavy({
         sex: "male",
         heightCm: MAN.heightCm,
         waistCm: MAN.waist,
         neckCm: MAN.neck,
      })).toBeCloseTo(16.938027331, 8)

      expect(bodyFatNavy({
         sex: "female",
         heightCm: WOMAN.heightCm,
         waistCm: WOMAN.waist,
         neckCm: WOMAN.neck,
         hipCm: WOMAN.hip,
      })).toBeCloseTo(29.434237565, 8)
   })

   /// The trap this guard exists for: waist === neck puts zero inside
   /// log10, the denominator runs to infinity, and the expression lands on
   /// *exactly* -450. A `Number.isFinite` check passes that straight
   /// through, so the guard has to be on the girth instead.
   it("rejects a waist that is not larger than the neck", () => {
      expect(bodyFatNavy({ sex: "male", heightCm: 175, waistCm: 38, neckCm: 38 })).toBeNull()
      expect(bodyFatNavy({ sex: "male", heightCm: 175, waistCm: 30, neckCm: 38 })).toBeNull()
   })

   /// Nothing is malformed about a tall, very lean reader — the regression
   /// has simply left the domain it was fitted on and returns -1.1%.
   it("rejects a result outside the plausible range", () => {
      expect(bodyFatNavy({ sex: "male", heightCm: 190, waistCm: 70, neckCm: 40 })).toBeNull()
   })

   it("needs a hip measurement for the female form", () => {
      expect(bodyFatNavy({
         sex: "female",
         heightCm: 165,
         waistCm: 76,
         neckCm: 32,
      })).toBeNull()
   })
})

describe("bodyFatDeurenberg", () => {
   it("estimates from BMI, age and sex", () => {
      expect(bodyFatDeurenberg(manBmi, MAN.age, "male")).toBeCloseTo(18.128571428, 8)
      expect(bodyFatDeurenberg(womanBmi, WOMAN.age, "female")).toBeCloseTo(29.977823691, 8)
   })

   /// It was fitted on adults, and the site's own FAQ already says BMI
   /// does not apply to children. 20% for a twelve-year-old is plausible
   /// enough to look right and is not something this formula can claim.
   it("returns null below adulthood", () => {
      expect(bodyFatDeurenberg(18, 12, "male")).toBeNull()
      expect(bodyFatDeurenberg(18, 17.9, "female")).toBeNull()
      expect(bodyFatDeurenberg(18, 18, "male")).not.toBeNull()
   })

   /// The two methods measure different things and will not agree; the
   /// point of the assertion is that they stay in the same conversation,
   /// which a mistyped coefficient would break loudly.
   it("lands within a few points of the circumference method", () => {
      const navy = bodyFatNavy({
         sex: "male",
         heightCm: MAN.heightCm,
         waistCm: MAN.waist,
         neckCm: MAN.neck,
      }) ?? 0
      const deurenberg = bodyFatDeurenberg(manBmi, MAN.age, "male") ?? 0

      expect(Math.abs(navy - deurenberg)).toBeLessThan(8)
   })
})

describe("bodyFatCategory", () => {
   it("reads the same percentage differently by sex", () => {
      expect(bodyFatCategory(22, "male")).toBe("average")
      expect(bodyFatCategory(22, "female")).toBe("fitness")
   })

   it("puts each boundary in the upper band", () => {
      expect(bodyFatCategory(24.99, "male")).toBe("average")
      expect(bodyFatCategory(25, "male")).toBe("obese")
      expect(bodyFatCategory(31.99, "female")).toBe("average")
      expect(bodyFatCategory(32, "female")).toBe("obese")
   })
})

describe("leanBodyMassBoer", () => {
   it("splits weight into lean mass", () => {
      expect(leanBodyMassBoer(MAN.kilograms, MAN.heightCm, "male")).toBeCloseTo(56.015, 8)
      expect(leanBodyMassBoer(WOMAN.kilograms, WOMAN.heightCm, "female")).toBeCloseTo(45.369, 8)
   })

   /// The coefficients go negative for a small enough body, and that then
   /// propagates into FFMI and Katch-McArdle — one missing guard here
   /// corrupts three readings downstream.
   it("returns null rather than a negative or impossible mass", () => {
      expect(leanBodyMassBoer(10, 80, "female")).toBeNull()
      expect(leanBodyMassBoer(30, 200, "male")).toBeNull()
      expect(leanBodyMassBoer(0, 175, "male")).toBeNull()
   })
})

describe("fat-free mass index", () => {
   it("carries lean mass on a frame, and corrects for height", () => {
      const lean = leanBodyMassBoer(MAN.kilograms, MAN.heightCm, "male") ?? 0
      const ffmi = fatFreeMassIndex(lean, MAN.metres) ?? 0

      expect(ffmi).toBeCloseTo(18.290612244, 8)
      expect(normalisedFfmi(ffmi, MAN.metres)).toBeCloseTo(18.595612244, 8)
   })

   /// The whole point of normalising: a shorter person carrying the same
   /// lean mass per square metre is doing more, so the correction is
   /// upward below 1.8 m and downward above it.
   it("normalises towards a 1.8 m frame", () => {
      expect(normalisedFfmi(20, 1.8)).toBeCloseTo(20, 10)
      expect(normalisedFfmi(20, 1.6)).toBeGreaterThan(20)
      expect(normalisedFfmi(20, 1.95)).toBeLessThan(20)
   })
})

describe("shape ratios", () => {
   it("divides waist by height and by hip", () => {
      expect(waistToHeightRatio(MAN.waist, MAN.heightCm)).toBeCloseTo(0.485714285, 8)
      expect(waistToHipRatio(MAN.waist, MAN.hip)).toBeCloseTo(0.894736842, 8)
      expect(waistToHeightRatio(WOMAN.waist, WOMAN.heightCm)).toBeCloseTo(0.460606060, 8)
      expect(waistToHipRatio(WOMAN.waist, WOMAN.hip)).toBeCloseTo(0.775510204, 8)
   })

   /// "Keep your waist to less than half your height" is the whole rule,
   /// so 0.5 itself has to fall on the raised side of it.
   it("puts half your height on the raised side", () => {
      expect(whtrCategory(0.49)).toBe("healthy")
      expect(whtrCategory(0.5)).toBe("raised")
      expect(whtrCategory(0.6)).toBe("high")
      expect(whtrCategory(0.35)).toBe("slim")
   })

   it("uses the WHO cut-off for each sex", () => {
      expect(whrCategory(0.89, "male")).toBe("healthy")
      expect(whrCategory(0.9, "male")).toBe("raised")
      expect(whrCategory(0.84, "female")).toBe("healthy")
      expect(whrCategory(0.85, "female")).toBe("raised")
   })
})

describe("resting and daily energy", () => {
   it("computes Mifflin-St Jeor", () => {
      expect(bmrMifflin(MAN.kilograms, MAN.heightCm, MAN.age, "male")).toBeCloseTo(1648.75, 8)
      expect(bmrMifflin(WOMAN.kilograms, WOMAN.heightCm, WOMAN.age, "female"))
         .toBeCloseTo(1315.25, 8)
   })

   it("computes Katch-McArdle from lean mass", () => {
      expect(bmrKatchMcArdle(56.015)).toBeCloseTo(1579.924, 8)
      expect(bmrKatchMcArdle(0)).toBeNull()
   })

   it("refuses an age the formula was not fitted on", () => {
      expect(bmrMifflin(70, 175, 12, "male")).toBeNull()
      expect(bmrMifflin(70, 175, 200, "male")).toBeNull()
   })

   it("scales the resting rate by activity", () => {
      expect(tdee(1648.75, "moderate")).toBeCloseTo(2555.5625, 8)
      expect(tdee(1648.75, "sedentary")).toBeCloseTo(1978.5, 8)
      expect(tdee(0, "moderate")).toBeNull()
   })

   /// A factor below 1 would say a body burns less than it does at rest.
   it("has a factor for every level, all above resting", () => {
      for (const level of ACTIVITY_LEVELS) {
         expect(ACTIVITY_FACTORS[level]).toBeGreaterThan(1)
      }
   })
})

describe("idealWeights", () => {
   it("returns every formula, in publication order", () => {
      const weights = idealWeights(MAN.metres, "male")

      expect(weights.map((entry) => entry.id)).toEqual(["hamwi", "devine", "robinson", "miller"])
      expect(weights[0]?.kilograms).toBeCloseTo(72.023622047, 8)
      expect(weights[1]?.kilograms).toBeCloseTo(70.464566929, 8)
      expect(weights[2]?.kilograms).toBeCloseTo(68.905511811, 8)
      expect(weights[3]?.kilograms).toBeCloseTo(68.745669291, 8)
   })

   it("uses the female coefficients", () => {
      const weights = idealWeights(WOMAN.metres, "female")

      expect(weights[0]?.kilograms).toBeCloseTo(56.413385826, 8)
      expect(weights[3]?.kilograms).toBeCloseTo(59.846456692, 8)
   })

   /// All four are "base plus n per inch over five feet" and extrapolate
   /// downwards without limit, so a short enough reader gets a negative
   /// ideal weight. Dropped rather than clamped — a clamped figure would
   /// look like an answer.
   it("drops a formula that goes non-positive rather than clamping it", () => {
      const weights = idealWeights(1, "male")

      expect(weights.map((entry) => entry.id)).not.toContain("hamwi")
      expect(weights).toHaveLength(3)

      for (const entry of weights) {
         expect(entry.kilograms).toBeGreaterThan(0)
      }
   })

   it("returns nothing for a height that cannot produce one", () => {
      expect(idealWeights(0, "male")).toEqual([])
      expect(idealWeights(Number.NaN, "female")).toEqual([])
   })
})

/// The same invariant `test/unit/bmi.test.ts` holds over BMI_BANDS, run
/// across every table in the module: a gap silently returns null for a
/// real reading, an overlap makes the first match win by accident.
describe("every band table", () => {
   const tables: [string, { from: number, to: number }[]][] = [
      ["whtr", WHTR_BANDS],
      ...SEXES.map((sex): [string, { from: number, to: number }[]] =>
         [`bodyFat.${sex}`, BODY_FAT_BANDS[sex]]),
      ...SEXES.map((sex): [string, { from: number, to: number }[]] =>
         [`whr.${sex}`, WHR_BANDS[sex]]),
   ]

   it.each(tables)("leaves no gap or overlap in %s", (_name, bands) => {
      expect(bands[0]?.from).toBe(0)
      expect(bands.at(-1)?.to).toBe(Number.POSITIVE_INFINITY)

      for (const [index, band] of bands.entries()) {
         expect(band.from).toBeLessThan(band.to)

         const next = bands[index + 1]

         if (next) expect(next.from).toBe(band.to)
      }
   })
})
