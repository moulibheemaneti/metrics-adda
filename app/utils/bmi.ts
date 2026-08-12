/// --------------------------------------------------
/// utils/bmi.ts
/// --------------------------------------------------
/// Body mass index, its categories, and the weight range that reaches the
/// healthy one.
///
/// BMI itself is one division — the value here is in the thresholds, the
/// range calculation and being straight about what the number does not
/// measure. It cannot tell muscle from fat, it is not valid for children,
/// and the standard cut-offs were drawn from European populations. The FAQ
/// says all three; this module holds the arithmetic they describe.
///
/// Conversion is not repeated here. A caller with pounds and feet converts
/// with `utils/units.ts` first and passes kilograms and metres in, which
/// keeps one definition of a pound in the codebase.
///
/// Auto-imported by Nuxt. Tests import it relatively (see test/unit).
/// --------------------------------------------------

/** WHO adult categories. */
export type BmiCategory = "underweight" | "normal" | "overweight" | "obese"

/**
 * The healthy band, and the two numbers every other threshold hangs off.
 *
 * 18.5 and 25 are the WHO adult figures. They are deliberately *not*
 * adjusted for the lower action points WHO suggests for Asian populations
 * (23 and 27.5) — a calculator that silently used different thresholds
 * from every chart a reader can check would be worse than one that uses
 * the standard figures and says the caveat out loud.
 */
export const HEALTHY_BMI_MIN = 18.5
export const HEALTHY_BMI_MAX = 25

/** Where the category boundaries sit. `to` is exclusive. */
export interface BmiBand {
   id: BmiCategory
   from: number
   to: number
}

export const BMI_BANDS: BmiBand[] = [
   { id: "underweight", from: 0, to: HEALTHY_BMI_MIN },
   { id: "normal", from: HEALTHY_BMI_MIN, to: HEALTHY_BMI_MAX },
   { id: "overweight", from: HEALTHY_BMI_MAX, to: 30 },
   { id: "obese", from: 30, to: Number.POSITIVE_INFINITY },
]

/**
 * The span the on-screen scale draws.
 *
 * Not 0–100: almost every reading falls between 15 and 40, and a scale
 * running to 100 would squeeze all four bands into its first third and
 * leave the marker somewhere in the left margin.
 */
export const BMI_SCALE_MIN = 15
export const BMI_SCALE_MAX = 40

/**
 * Body mass index from kilograms and metres.
 *
 * Returns `null` rather than a number for input that cannot produce one —
 * a blank field, a zero height — so a caller can tell "nothing entered
 * yet" from a real result, instead of rendering `Infinity` or `NaN`.
 */
export function calculateBmi(kilograms: number, metres: number): number | null {
   if (!Number.isFinite(kilograms) || !Number.isFinite(metres)) return null
   if (kilograms <= 0 || metres <= 0) return null

   return kilograms / metres ** 2
}

export function bmiCategory(bmi: number): BmiCategory {
   const band = BMI_BANDS.find((candidate) => bmi >= candidate.from && bmi < candidate.to)

   // Only unreachable for NaN, which `calculateBmi` already screens out.
   return band?.id ?? "obese"
}

export interface WeightRange {
   /** Kilograms at the bottom of the healthy band. */
   min: number
   /** Kilograms at the top of it. */
   max: number
}

/**
 * The weight range that puts a given height in the healthy band.
 *
 * The reason this tool is worth more than a division: "your BMI is 27"
 * prompts "so what would it need to be?", and answering that in kilograms
 * is the part a reader can act on.
 */
export function healthyWeightRange(metres: number): WeightRange | null {
   if (!Number.isFinite(metres) || metres <= 0) return null

   return {
      min: HEALTHY_BMI_MIN * metres ** 2,
      max: HEALTHY_BMI_MAX * metres ** 2,
   }
}

/**
 * Where a reading sits on the drawn scale, as a fraction from 0 to 1.
 *
 * Clamped, so a BMI of 12 or 60 pins to an end of the bar rather than
 * placing the marker outside it.
 */
export function bmiScalePosition(bmi: number): number {
   const span = BMI_SCALE_MAX - BMI_SCALE_MIN
   const offset = (bmi - BMI_SCALE_MIN) / span

   return Math.min(Math.max(offset, 0), 1)
}

/**
 * Each band's share of the drawn scale, as fractions from 0 to 1.
 *
 * Computed rather than hardcoded in the stylesheet so the bands and the
 * marker are positioned from the same two constants and cannot drift out
 * of alignment.
 */
export function bmiBandWidths(): { id: BmiCategory, width: number }[] {
   const span = BMI_SCALE_MAX - BMI_SCALE_MIN

   return BMI_BANDS.map((band) => {
      const from = Math.max(band.from, BMI_SCALE_MIN)
      const to = Math.min(band.to, BMI_SCALE_MAX)

      return { id: band.id, width: (to - from) / span }
   })
}
