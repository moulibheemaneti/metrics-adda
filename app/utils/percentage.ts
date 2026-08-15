/// --------------------------------------------------
/// utils/percentage.ts
/// --------------------------------------------------
/// The percentage questions people type into a search box, as four modes
/// over the same pair of numbers.
///
/// They are separated because the *question* differs, not the arithmetic —
/// every one of them is a multiply and a divide. Folding them into one
/// "percentage" field would leave the reader to work out which of the four
/// the answer belongs to, which is the part they came here to avoid.
///
/// Each solver returns `null` where the maths is genuinely undefined
/// rather than a number nobody asked for: "12 is what percent of 0" has no
/// answer, and `Infinity` printed as a result reads as a bug. Missing
/// input is the caller's problem, not this module's — everything here
/// takes numbers that have already parsed.
///
/// Auto-imported by Nuxt. Tests import it relatively (see test/unit).
/// --------------------------------------------------

/** The four questions, in the order the panel offers them. */
export const PERCENTAGE_MODES = ["of", "ratio", "change", "adjust"] as const

export type PercentageMode = typeof PERCENTAGE_MODES[number]

/**
 * One line of the answer.
 *
 * A list rather than a single number because `adjust` has two honest
 * answers — "add 20%" and "take 20% off" are both what someone means by
 * that mode, and asking them to type `-20` to get the second is friction
 * with nothing behind it. The other three modes return a one-item list, so
 * the panel renders every mode the same way.
 */
export interface PercentageReadout {
   /** Selects the row's label and its caption in `COPY.percentage`. */
   id: "of" | "ratio" | "change" | "increased" | "decreased"
   value: number
   /** Whether the row's value is itself a percentage or a plain quantity. */
   unit: "percent" | "value"
}

/** What is `percent`% of `value`? */
export function percentageOf(percent: number, value: number): number {
   return (percent / 100) * value
}

/**
 * `part` is what percent of `whole`?
 *
 * `null` at `whole === 0`, where every part is an equally valid answer.
 */
export function percentageRatio(part: number, whole: number): number | null {
   if (whole === 0) return null

   return (part / whole) * 100
}

/**
 * The percentage change from `from` to `to`, signed — negative is a fall.
 *
 * `null` at `from === 0`. Growth from nothing has no percentage: every
 * increase off a zero base is infinite, which is why the figure is quoted
 * as "n/a" rather than as a very large number wherever it comes up.
 */
export function percentageChange(from: number, to: number): number | null {
   if (from === 0) return null

   return ((to - from) / from) * 100
}

/** `value` with `percent`% added. Pass a negative percent to take it off. */
export function applyPercentage(value: number, percent: number): number {
   return value * (1 + percent / 100)
}

/**
 * Answer whichever question `mode` names, from the two fields on screen.
 *
 * `first` and `second` are positional on purpose: the panel keeps two
 * inputs and relabels them per mode, so the solver takes them in the order
 * they appear rather than by name. `null` means the question has no
 * answer — the panel says so instead of printing one.
 */
export function solvePercentage(
   mode: PercentageMode,
   first: number,
   second: number,
): PercentageReadout[] | null {
   // A non-finite input reaches here only from Infinity typed by hand;
   // `parseQuantity` already screens the rest. Either way there is no
   // answer worth printing.
   if (!Number.isFinite(first) || !Number.isFinite(second)) return null

   switch (mode) {
      case "of":
         return [{ id: "of", value: percentageOf(first, second), unit: "value" }]

      case "ratio": {
         const ratio = percentageRatio(first, second)

         return ratio === null ? null : [{ id: "ratio", value: ratio, unit: "percent" }]
      }

      case "change": {
         const change = percentageChange(first, second)

         return change === null ? null : [{ id: "change", value: change, unit: "percent" }]
      }

      case "adjust":
         return [
            { id: "increased", value: applyPercentage(first, second), unit: "value" },
            { id: "decreased", value: applyPercentage(first, -second), unit: "value" },
         ]
   }
}

/** Which way a change went, for the label beside a signed percentage. */
export function changeDirection(value: number): "increase" | "decrease" | "unchanged" {
   if (value > 0) return "increase"
   if (value < 0) return "decrease"

   return "unchanged"
}
