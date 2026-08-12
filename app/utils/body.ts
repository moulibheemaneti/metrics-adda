/// --------------------------------------------------
/// utils/body.ts
/// --------------------------------------------------
/// Body composition beyond BMI: fat, lean mass, shape ratios and resting
/// energy.
///
/// Every function here is an *estimate from a regression*, not a
/// measurement. Each was fitted on a particular population — US Navy
/// recruits, Dutch adults, hospital inpatients — and none is within a
/// percentage point of what a scan would say. That is why they return
/// `null` outside a plausibility range rather than printing whatever the
/// arithmetic produced: a formula that hands back −1.1% body fat has left
/// the domain it was fitted on, and rendering that number would be worse
/// than rendering nothing.
///
/// Split from `bmi.ts` rather than added to it. BMI is one division with
/// two thresholds; putting ten fitted regressions in the same file would
/// make the cheap, honest number look like the estimates around it.
///
/// Heights arrive in the unit each published formula is written in —
/// `metres` where the formula divides by height squared, `heightCm` where
/// the fitted coefficients are centimetre-based. Silently rescaling a
/// regression's input is exactly how these go quietly wrong, so the unit
/// is in the parameter name. Circumferences are always centimetres.
///
/// Auto-imported by Nuxt. Tests import it relatively (see test/unit).
/// --------------------------------------------------

import { bandFor, type Band } from "./bands"
import { convert, DIMENSIONS } from "./units"

/**
 * Named `Sex`, not `Gender`.
 *
 * Every formula below is a regression fitted on cohorts split by sex at
 * birth, and there is no third set of coefficients to offer. Calling it
 * what it is beats implying the tool knows something it does not; the
 * copy says as much out loud next to the control.
 */
export const SEXES = ["female", "male"] as const

export type Sex = typeof SEXES[number]

/**
 * Below this age none of these formulas apply.
 *
 * Deurenberg was fitted on adults, and body fat in children is read from
 * age-and-sex percentile charts instead — the same reason the FAQ already
 * says BMI does not apply to under-18s.
 */
export const ADULT_MIN_AGE = 18

/** The oldest age the fitted cohorts extend to, past which nothing is claimed. */
export const MAX_AGE = 120

/// --------------------------------------------------
/// Body fat
/// --------------------------------------------------

/**
 * The window outside which a circumference estimate is rejected rather
 * than shown.
 *
 * Essential fat is around 3% in men and 10% in women, and the highest
 * figures ever recorded sit in the sixties. A result outside this is not
 * a very lean or very heavy reader, it is the regression having left its
 * fitted domain — see `bodyFatNavy` for the case that produces −1%.
 */
export const BODY_FAT_MIN = 3
export const BODY_FAT_MAX = 70

/** The span the body-fat scale draws. One span for both sexes. */
export const BODY_FAT_SCALE_MIN = 0
export const BODY_FAT_SCALE_MAX = 50

export type BodyFatCategory = "essential" | "athlete" | "fitness" | "average" | "obese"

/**
 * ACE categories, which split by sex and not by age.
 *
 * The age-banded alternatives (Gallagher, Jackson–Pollock) need four age
 * brackets per sex and forty hand-entered boundaries with no single
 * canonical source, which is the most expensive data on this page and the
 * easiest to get subtly wrong. Deferred deliberately: adding it later is
 * an `ageYears` argument here and a second key level below.
 *
 * The first band runs from 0 rather than from ACE's 2% / 10% floor. A
 * reading under the floor is not "essential fat", it is implausible, and
 * `BODY_FAT_MIN` rejects it before the lookup runs — which keeps the
 * no-gap invariant testable and puts the honesty in the gate rather than
 * in a mislabelled band.
 */
export const BODY_FAT_BANDS: Record<Sex, Band<BodyFatCategory>[]> = {
   male: [
      { id: "essential", from: 0, to: 6 },
      { id: "athlete", from: 6, to: 14 },
      { id: "fitness", from: 14, to: 18 },
      { id: "average", from: 18, to: 25 },
      { id: "obese", from: 25, to: Number.POSITIVE_INFINITY },
   ],
   female: [
      { id: "essential", from: 0, to: 14 },
      { id: "athlete", from: 14, to: 21 },
      { id: "fitness", from: 21, to: 25 },
      { id: "average", from: 25, to: 32 },
      { id: "obese", from: 32, to: Number.POSITIVE_INFINITY },
   ],
}

export function bodyFatCategory(percent: number, sex: Sex): BodyFatCategory | null {
   return bandFor(percent, BODY_FAT_BANDS[sex])
}

/** `null` for anything outside the range these methods can speak to. */
function plausibleBodyFat(percent: number): number | null {
   if (!Number.isFinite(percent)) return null
   if (percent < BODY_FAT_MIN || percent > BODY_FAT_MAX) return null

   return percent
}

export interface NavyMeasurements {
   sex: Sex
   heightCm: number
   waistCm: number
   neckCm: number
   /** Required for `sex: "female"`, unused for males. */
   hipCm?: number
}

/**
 * US Navy / Hodgdon–Beckett circumference estimate.
 *
 * The better of the two methods here, because it measures where fat
 * actually sits rather than inferring it from total weight — which is
 * what lets it tell a muscular reader from a heavy one.
 *
 * Two guards, both load-bearing:
 *
 * - **The girth must be positive.** `waist === neck` is the trap: it puts
 *   zero inside `log10`, the denominator runs away to infinity, and the
 *   expression lands on *exactly −450*. That is a finite number, so a
 *   `Number.isFinite` check waves it straight through to the screen.
 * - **The result must be plausible.** A 190 cm reader with a 70 cm waist
 *   and a 40 cm neck yields −1.1%. Nothing about that input is malformed;
 *   the regression has simply left the range it was fitted on.
 */
export function bodyFatNavy(input: NavyMeasurements): number | null {
   const { sex, heightCm, waistCm, neckCm, hipCm } = input

   if (!Number.isFinite(heightCm) || !Number.isFinite(waistCm) || !Number.isFinite(neckCm)) {
      return null
   }

   if (heightCm <= 0 || waistCm <= 0 || neckCm <= 0) return null

   if (sex === "male") {
      const girth = waistCm - neckCm

      if (girth <= 0) return null

      return plausibleBodyFat(
         495 / (1.0324 - 0.19077 * Math.log10(girth) + 0.15456 * Math.log10(heightCm)) - 450,
      )
   }

   if (hipCm === undefined || !Number.isFinite(hipCm) || hipCm <= 0) return null

   const girth = waistCm + hipCm - neckCm

   if (girth <= 0) return null

   return plausibleBodyFat(
      495 / (1.29579 - 0.35004 * Math.log10(girth) + 0.22100 * Math.log10(heightCm)) - 450,
   )
}

/**
 * Deurenberg, from BMI and age.
 *
 * Cheap — it needs no tape measure — but it is *derived from* BMI, so it
 * inherits every flaw BMI has, including calling a muscular person fat.
 * It is shown beside the Navy figure rather than instead of it, and the
 * copy is explicit that the two are not independent opinions.
 */
export function bodyFatDeurenberg(bmi: number, ageYears: number, sex: Sex): number | null {
   if (!Number.isFinite(bmi) || !Number.isFinite(ageYears)) return null
   if (bmi <= 0) return null
   if (ageYears < ADULT_MIN_AGE || ageYears > MAX_AGE) return null

   return plausibleBodyFat(1.2 * bmi + 0.23 * ageYears - 10.8 * (sex === "male" ? 1 : 0) - 5.4)
}

/// --------------------------------------------------
/// Lean mass
/// --------------------------------------------------

/**
 * Boer lean body mass.
 *
 * The female coefficients go negative for a small enough body —
 * `leanBodyMassBoer(10, 80, "female")` is −7.9 kg — and that then
 * propagates into FFMI and Katch–McArdle, so one missing guard here
 * corrupts three readings downstream. Lean mass above total body weight
 * is equally impossible and equally rejected.
 */
export function leanBodyMassBoer(
   kilograms: number,
   heightCm: number,
   sex: Sex,
): number | null {
   if (!Number.isFinite(kilograms) || !Number.isFinite(heightCm)) return null
   if (kilograms <= 0 || heightCm <= 0) return null

   const lean = sex === "male"
      ? 0.407 * kilograms + 0.267 * heightCm - 19.2
      : 0.252 * kilograms + 0.473 * heightCm - 48.3

   if (lean <= 0 || lean > kilograms) return null

   return lean
}

/** Lean mass carried on a frame — the same shape as BMI, minus the fat. */
export function fatFreeMassIndex(leanKilograms: number, metres: number): number | null {
   if (!Number.isFinite(leanKilograms) || !Number.isFinite(metres)) return null
   if (leanKilograms <= 0 || metres <= 0) return null

   return leanKilograms / metres ** 2
}

/**
 * FFMI corrected to a 1.8 m frame.
 *
 * This is the direct answer to the FAQ's "why does BMI call a muscular
 * person overweight?" — it separates the two things BMI cannot.
 */
export function normalisedFfmi(ffmi: number, metres: number): number | null {
   if (!Number.isFinite(ffmi) || !Number.isFinite(metres)) return null
   if (ffmi <= 0 || metres <= 0) return null

   return ffmi + 6.1 * (1.8 - metres)
}

/// --------------------------------------------------
/// Shape
/// --------------------------------------------------

/** "Keep your waist to less than half your height." */
export const WHTR_HEALTHY_MAX = 0.5

export type WhtrCategory = "slim" | "healthy" | "raised" | "high"

/**
 * Ashwell / NICE bands.
 *
 * The best-sourced table in this module and the cheapest to reach: it
 * needs one tape measurement and a height already on screen, and it
 * predicts cardiometabolic risk better than BMI does.
 */
export const WHTR_BANDS: Band<WhtrCategory>[] = [
   { id: "slim", from: 0, to: 0.4 },
   { id: "healthy", from: 0.4, to: WHTR_HEALTHY_MAX },
   { id: "raised", from: WHTR_HEALTHY_MAX, to: 0.6 },
   { id: "high", from: 0.6, to: Number.POSITIVE_INFINITY },
]

export function waistToHeightRatio(waistCm: number, heightCm: number): number | null {
   if (!Number.isFinite(waistCm) || !Number.isFinite(heightCm)) return null
   if (waistCm <= 0 || heightCm <= 0) return null

   return waistCm / heightCm
}

export function whtrCategory(ratio: number): WhtrCategory | null {
   return bandFor(ratio, WHTR_BANDS)
}

export type WhrCategory = "healthy" | "raised"

/**
 * WHO 2008 abdominal-obesity cut-offs.
 *
 * Two bands per sex rather than the common low/moderate/high three: the
 * middle boundary in those versions is invented, and inventing a
 * threshold is the one economy not worth making in a health tool.
 */
export const WHR_BANDS: Record<Sex, Band<WhrCategory>[]> = {
   male: [
      { id: "healthy", from: 0, to: 0.9 },
      { id: "raised", from: 0.9, to: Number.POSITIVE_INFINITY },
   ],
   female: [
      { id: "healthy", from: 0, to: 0.85 },
      { id: "raised", from: 0.85, to: Number.POSITIVE_INFINITY },
   ],
}

export function waistToHipRatio(waistCm: number, hipCm: number): number | null {
   if (!Number.isFinite(waistCm) || !Number.isFinite(hipCm)) return null
   if (waistCm <= 0 || hipCm <= 0) return null

   return waistCm / hipCm
}

export function whrCategory(ratio: number, sex: Sex): WhrCategory | null {
   return bandFor(ratio, WHR_BANDS[sex])
}

/// --------------------------------------------------
/// Energy
/// --------------------------------------------------

/**
 * Mifflin–St Jeor resting metabolic rate, in kilocalories a day.
 *
 * The default because it needs no body-fat estimate, and the one most
 * clinical guidance points at.
 */
export function bmrMifflin(
   kilograms: number,
   heightCm: number,
   ageYears: number,
   sex: Sex,
): number | null {
   if (!Number.isFinite(kilograms) || !Number.isFinite(heightCm) || !Number.isFinite(ageYears)) {
      return null
   }

   if (kilograms <= 0 || heightCm <= 0) return null
   if (ageYears < ADULT_MIN_AGE || ageYears > MAX_AGE) return null

   const base = 10 * kilograms + 6.25 * heightCm - 5 * ageYears

   const bmr = sex === "male" ? base + 5 : base - 161

   return bmr > 0 ? bmr : null
}

/**
 * Katch–McArdle, from lean mass.
 *
 * Better than Mifflin when lean mass is known, and sex-free by design —
 * the sex difference in resting rate is mostly a lean-mass difference, so
 * a formula given lean mass directly does not need to ask.
 */
export function bmrKatchMcArdle(leanKilograms: number): number | null {
   if (!Number.isFinite(leanKilograms) || leanKilograms <= 0) return null

   return 370 + 21.6 * leanKilograms
}

export const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "active", "veryActive"] as const

export type ActivityLevel = typeof ACTIVITY_LEVELS[number]

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
   sedentary: 1.2,
   light: 1.375,
   moderate: 1.55,
   active: 1.725,
   veryActive: 1.9,
}

export const DEFAULT_ACTIVITY: ActivityLevel = "light"

/** Total daily energy expenditure — resting rate times how much you move. */
export function tdee(bmr: number, level: ActivityLevel): number | null {
   if (!Number.isFinite(bmr) || bmr <= 0) return null

   return bmr * ACTIVITY_FACTORS[level]
}

/// --------------------------------------------------
/// Target weight
/// --------------------------------------------------

export const IDEAL_WEIGHT_FORMULAS = ["hamwi", "devine", "robinson", "miller"] as const

export type IdealWeightFormula = typeof IDEAL_WEIGHT_FORMULAS[number]

/**
 * Four "ideal body weight" formulas, in the order they were published.
 *
 * All four are `base + n per inch over five feet`, all four were written
 * for drug dosing rather than health, and they disagree with each other
 * by several kilograms for the same person. They are shown *together*,
 * and below `healthyWeightRange`, precisely so that spread is visible —
 * one of them alone would read as a target, which is not something any of
 * them can support.
 */
const IDEAL_WEIGHT_COEFFICIENTS: Record<
   IdealWeightFormula,
   Record<Sex, { base: number, perInch: number }>
> = {
   hamwi: { male: { base: 48, perInch: 2.7 }, female: { base: 45.5, perInch: 2.2 } },
   devine: { male: { base: 50, perInch: 2.3 }, female: { base: 45.5, perInch: 2.3 } },
   robinson: { male: { base: 52, perInch: 1.9 }, female: { base: 49, perInch: 1.7 } },
   miller: { male: { base: 56.2, perInch: 1.41 }, female: { base: 53.1, perInch: 1.36 } },
}

export interface IdealWeight {
   id: IdealWeightFormula
   kilograms: number
}

/**
 * Every ideal weight that produces a usable number for this height.
 *
 * All four extrapolate downwards without limit below five feet, so a
 * short enough reader gets a negative "ideal" weight from formulas that
 * simply have nothing to say about them. Those are dropped rather than
 * clamped — a clamped figure would look like an answer.
 *
 * The inch comes from `units.ts` rather than a restated 2.54, so there is
 * still one definition of an inch in the codebase.
 */
export function idealWeights(metres: number, sex: Sex): IdealWeight[] {
   if (!Number.isFinite(metres) || metres <= 0) return []

   const inchesOverFiveFeet = convert(metres, "m", "in", DIMENSIONS.length) - 60

   return IDEAL_WEIGHT_FORMULAS.flatMap((id) => {
      const { base, perInch } = IDEAL_WEIGHT_COEFFICIENTS[id][sex]
      const kilograms = base + perInch * inchesOverFiveFeet

      return kilograms > 0 ? [{ id, kilograms }] : []
   })
}
