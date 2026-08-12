/// --------------------------------------------------
/// utils/bands.ts
/// --------------------------------------------------
/// Mapping a reading to a named band, and a band set to a drawn scale.
///
/// Generalised out of `bmi.ts`, which invented the shape: an ordered array
/// of `{ id, from, to }` with `to` exclusive, no gaps and no overlaps.
/// Several metrics use it now — BMI, body fat, FFMI, waist-to-height,
/// waist-to-hip — and duplicating the `.find()` once per metric is how
/// four of them end up with a different boundary rule from the fifth.
///
/// Nothing here knows what it is banding. The thresholds and their
/// meanings live with the metric, in `bmi.ts` or `body.ts`.
///
/// Auto-imported by Nuxt. Tests import it relatively (see test/unit).
/// --------------------------------------------------

/** One band of a scale. `to` is exclusive. */
export interface Band<Id extends string> {
   id: Id
   from: number
   /** Exclusive — every boundary belongs to the band above it. */
   to: number
}

/**
 * The band a reading falls in.
 *
 * `null` rather than a guessed id for a reading no band covers, which in
 * practice means `NaN`. A caller that cannot have one — `bmiCategory`,
 * whose input is already screened — supplies its own fallback.
 */
export function bandFor<Id extends string>(value: number, bands: Band<Id>[]): Id | null {
   if (!Number.isFinite(value)) return null

   return bands.find((candidate) => value >= candidate.from && value < candidate.to)?.id ?? null
}

/**
 * Where a reading sits on a drawn scale, as a fraction from 0 to 1.
 *
 * Clamped, so a reading past either end pins to that end rather than
 * placing a marker outside the bar.
 */
export function bandPosition(value: number, min: number, max: number): number {
   const offset = (value - min) / (max - min)

   return Math.min(Math.max(offset, 0), 1)
}

/**
 * Each band's share of a drawn scale, as fractions from 0 to 1.
 *
 * Computed rather than hardcoded in a stylesheet so the bands and the
 * marker are positioned from the same two constants and cannot drift out
 * of alignment.
 */
export function bandWidths<Id extends string>(
   bands: Band<Id>[],
   min: number,
   max: number,
): { id: Id, width: number }[] {
   const span = max - min

   return bands.map((band) => ({
      id: band.id,
      width: (Math.min(band.to, max) - Math.max(band.from, min)) / span,
   }))
}
