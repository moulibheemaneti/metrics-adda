/// --------------------------------------------------
/// utils/format.ts
/// --------------------------------------------------
/// Turning numbers into strings a person would write.
///
/// Kept separate from the maths in `units.ts` so conversion stays exact and
/// only the display layer rounds. The main job is hiding floating-point
/// noise: 1 kg in pounds is 2.2046226218487757 as a double, and showing
/// every one of those digits is both wrong-looking and unhelpful.
///
/// Auto-imported by Nuxt. Tests import it relatively (see test/unit).
/// --------------------------------------------------

/** Digits kept by default — enough for engineering use, short enough to read. */
export const DEFAULT_SIGNIFICANT_DIGITS = 8

/**
 * Format a converted quantity for display: grouped thousands, trailing
 * zeroes dropped, and significant digits capped so float noise never
 * reaches the page. Non-finite input formats as an empty string, so a
 * half-typed field renders blank rather than "NaN".
 */
export function formatQuantity(value: number, significantDigits = DEFAULT_SIGNIFICANT_DIGITS): string {
   if (!Number.isFinite(value)) return ""

   return new Intl.NumberFormat("en-US", {
      maximumSignificantDigits: significantDigits,
   }).format(value)
}

/** Format a whole-number count (word counts, character counts). */
export function formatCount(value: number): string {
   if (!Number.isFinite(value)) return "0"

   return new Intl.NumberFormat("en-US").format(Math.round(value))
}

/**
 * Format a duration for reading- and speaking-time readouts.
 *
 * Anything under a minute reads as seconds, because "0 min" tells a reader
 * nothing about a 40-second article.
 */
export function formatDuration(seconds: number): string {
   if (!Number.isFinite(seconds) || seconds <= 0) return "0 sec"

   const whole = Math.round(seconds)

   if (whole < 60) return `${whole} sec`

   const minutes = Math.floor(whole / 60)
   const remainder = whole % 60

   if (remainder === 0) return `${minutes} min`

   return `${minutes} min ${remainder} sec`
}
