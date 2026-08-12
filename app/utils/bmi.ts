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
/// Everything that needs an age, a sex or a tape measure lives in
/// `body.ts` instead. This file stays the cheap, honest division; mixing
/// it with fitted regressions would make that number look like an
/// estimate rather than the definition it is.
///
/// Conversion is not repeated here. A caller with pounds and feet converts
/// with `utils/units.ts` first and passes kilograms and metres in, which
/// keeps one definition of a pound in the codebase.
///
/// Auto-imported by Nuxt. Tests import it relatively (see test/unit).
/// --------------------------------------------------

import { bandFor, bandPosition, bandWidths, type Band } from "./bands"

/** WHO adult categories. */
export type BmiCategory = "underweight" | "normal" | "overweight" | "obese"

/**
 * The healthy band under the standard WHO adult cut-offs, and the two
 * numbers every other WHO threshold hangs off.
 */
export const HEALTHY_BMI_MIN = 18.5
export const HEALTHY_BMI_MAX = 25

/** Where the category boundaries sit. `to` is exclusive. */
export type BmiBand = Band<BmiCategory>

/**
 * The reference populations whose cut-offs this tool can apply.
 *
 * The same body gets a different label under each, because the risk a
 * given BMI carries genuinely differs between populations — South Asian
 * bodies carry more visceral fat and develop type 2 diabetes and heart
 * disease at lower BMIs than the European cohorts the WHO figures were
 * drawn from.
 *
 * An earlier version of this module offered only `who`, reasoning that a
 * calculator which *silently* used different thresholds from every chart
 * a reader can check would be worse than one that used the standard
 * figures and said the caveat out loud. That reasoning still holds, and
 * it is exactly why the choice is an explicit, labelled control rather
 * than a default: the basic calculator is `who` and nothing else, and a
 * reading is never shown without naming the standard it came from.
 */
export const BMI_POPULATIONS = ["who", "asian", "india"] as const

export type BmiPopulation = typeof BMI_POPULATIONS[number]

/**
 * One band set per population.
 *
 * - `who` — the WHO adult figures, 18.5 / 25 / 30.
 * - `asian` — the lower action points WHO recommended for Asian
 *   populations in 2004: overweight from 23, obese from 27.5.
 * - `india` — the 2009 Asian-Indian consensus statement, which is lower
 *   again: underweight below 18, overweight from 23, obese from 25.
 */
export const BMI_BAND_SETS: Record<BmiPopulation, BmiBand[]> = {
   who: [
      { id: "underweight", from: 0, to: HEALTHY_BMI_MIN },
      { id: "normal", from: HEALTHY_BMI_MIN, to: HEALTHY_BMI_MAX },
      { id: "overweight", from: HEALTHY_BMI_MAX, to: 30 },
      { id: "obese", from: 30, to: Number.POSITIVE_INFINITY },
   ],
   asian: [
      { id: "underweight", from: 0, to: 18.5 },
      { id: "normal", from: 18.5, to: 23 },
      { id: "overweight", from: 23, to: 27.5 },
      { id: "obese", from: 27.5, to: Number.POSITIVE_INFINITY },
   ],
   india: [
      { id: "underweight", from: 0, to: 18 },
      { id: "normal", from: 18, to: 23 },
      { id: "overweight", from: 23, to: 25 },
      { id: "obese", from: 25, to: Number.POSITIVE_INFINITY },
   ],
}

export const DEFAULT_BMI_POPULATION: BmiPopulation = "who"

/**
 * The WHO bands, kept as a named export because they are the default and
 * most callers want exactly them.
 */
export const BMI_BANDS: BmiBand[] = BMI_BAND_SETS.who

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

export function bmiCategory(
   bmi: number,
   population: BmiPopulation = DEFAULT_BMI_POPULATION,
): BmiCategory {
   // Only null for NaN, which `calculateBmi` already screens out.
   return bandFor(bmi, BMI_BAND_SETS[population]) ?? "obese"
}

export interface WeightRange {
   /** Kilograms at the bottom of the healthy band. */
   min: number
   /** Kilograms at the top of it. */
   max: number
}

/** The healthy BMI band itself, as the two numbers that bound it. */
export function healthyBmiRange(
   population: BmiPopulation = DEFAULT_BMI_POPULATION,
): WeightRange {
   const band = BMI_BAND_SETS[population].find((candidate) => candidate.id === "normal")

   // Every set defines a normal band; the fallback keeps the return type
   // non-nullable rather than pushing a null onto every caller.
   return { min: band?.from ?? HEALTHY_BMI_MIN, max: band?.to ?? HEALTHY_BMI_MAX }
}

/**
 * The weight range that puts a given height in the healthy band.
 *
 * The reason this tool is worth more than a division: "your BMI is 27"
 * prompts "so what would it need to be?", and answering that in kilograms
 * is the part a reader can act on.
 */
export function healthyWeightRange(
   metres: number,
   population: BmiPopulation = DEFAULT_BMI_POPULATION,
): WeightRange | null {
   if (!Number.isFinite(metres) || metres <= 0) return null

   const band = healthyBmiRange(population)

   return {
      min: band.min * metres ** 2,
      max: band.max * metres ** 2,
   }
}

/**
 * BMI as a ratio of the top of the healthy band — the standard "BMI
 * Prime". Under `who` that is the familiar BMI ÷ 25.
 *
 * Reading 1.0 as "exactly at the ceiling" survives a change of
 * population, which is what makes it the one index worth showing beside
 * a population selector: the raw BMI never moves, but its meaning does.
 */
export function bmiPrime(
   bmi: number,
   population: BmiPopulation = DEFAULT_BMI_POPULATION,
): number | null {
   if (!Number.isFinite(bmi) || bmi <= 0) return null

   return bmi / healthyBmiRange(population).max
}

/**
 * Ponderal index — kilograms over metres *cubed*.
 *
 * BMI's squared denominator systematically flatters short people and
 * penalises tall ones, because bodies do not scale as squares. Cubing is
 * the dimensionally honest version, and it is what paediatric and
 * extreme-height work tends to use instead.
 */
export function ponderalIndex(kilograms: number, metres: number): number | null {
   if (!Number.isFinite(kilograms) || !Number.isFinite(metres)) return null
   if (kilograms <= 0 || metres <= 0) return null

   return kilograms / metres ** 3
}

/**
 * Trefethen's "new BMI": 1.3 · kg / m^2.5.
 *
 * A compromise between the square and the cube — the 1.3 is chosen so
 * that it agrees with classic BMI at around 1.69 m, so a reader of
 * average height sees roughly the number they expect while the tall and
 * the short see the correction.
 */
export function newBmi(kilograms: number, metres: number): number | null {
   if (!Number.isFinite(kilograms) || !Number.isFinite(metres)) return null
   if (kilograms <= 0 || metres <= 0) return null

   return (1.3 * kilograms) / metres ** 2.5
}

/**
 * Where a reading sits on the drawn scale, as a fraction from 0 to 1.
 *
 * Clamped, so a BMI of 12 or 60 pins to an end of the bar rather than
 * placing the marker outside it.
 */
export function bmiScalePosition(bmi: number): number {
   return bandPosition(bmi, BMI_SCALE_MIN, BMI_SCALE_MAX)
}

/**
 * Each band's share of the drawn scale, as fractions from 0 to 1.
 *
 * Computed rather than hardcoded in the stylesheet so the bands and the
 * marker are positioned from the same two constants and cannot drift out
 * of alignment.
 */
export function bmiBandWidths(
   population: BmiPopulation = DEFAULT_BMI_POPULATION,
): { id: BmiCategory, width: number }[] {
   return bandWidths(BMI_BAND_SETS[population], BMI_SCALE_MIN, BMI_SCALE_MAX)
}
