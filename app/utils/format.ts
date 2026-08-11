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

/**
 * Read a number back out of a text field — the inverse of
 * `formatQuantity`, so a value this module printed can be re-parsed.
 *
 * Returns `null` rather than `NaN` for anything that is not yet a number,
 * which lets a converter tell "still typing" (`"-"`, `"1."`, `""`) apart
 * from "genuinely invalid" and avoids flashing an error at someone
 * mid-keystroke.
 */
export function parseQuantity(text: string): number | null {
   // Grouping separators and stray spaces come straight from formatted
   // output being pasted back in.
   const cleaned = text.replace(/[\s,]/gu, "")

   if (cleaned === "") return null

   const value = Number(cleaned)

   return Number.isFinite(value) ? value : null
}

/** Format a whole-number count (word counts, character counts). */
export function formatCount(value: number): string {
   if (!Number.isFinite(value)) return "0"

   return new Intl.NumberFormat("en-US").format(Math.round(value))
}

/**
 * Format a duration for reading- and speaking-time readouts.
 *
 * Compact units — "1m 3s", not "1 min 3 sec". The stat tiles are only as
 * wide as a grid track, and the spaced form wrapped onto a second line,
 * which left the two timing tiles taller than the six counts beside them.
 *
 * Anything under a minute reads as seconds, because "0m" tells a reader
 * nothing about a 40-second article.
 */
export function formatDuration(seconds: number): string {
   if (!Number.isFinite(seconds) || seconds <= 0) return "0s"

   const whole = Math.round(seconds)

   if (whole < 60) return `${whole}s`

   const minutes = Math.floor(whole / 60)
   const remainder = whole % 60

   if (remainder === 0) return `${minutes}m`

   return `${minutes}m ${remainder}s`
}

/**
 * The same duration spelled out, for a screen reader.
 *
 * A voice reads "1m 3s" as "one m three s", so the compact form above is
 * display-only. Anything on the page that exists purely to be spoken —
 * the word counter's live region — uses this instead.
 */
export function formatDurationSpoken(seconds: number): string {
   if (!Number.isFinite(seconds) || seconds <= 0) return "0 seconds"

   const whole = Math.round(seconds)
   const minutes = Math.floor(whole / 60)
   const remainder = whole % 60
   const parts: string[] = []

   if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`)
   if (remainder > 0) parts.push(`${remainder} ${remainder === 1 ? "second" : "seconds"}`)

   return parts.join(" ")
}
