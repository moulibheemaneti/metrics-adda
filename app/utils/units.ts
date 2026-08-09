/// --------------------------------------------------
/// utils/units.ts
/// --------------------------------------------------
/// The conversion engine behind the weight, height and temperature tools.
///
/// Every unit is defined as an affine transform to its dimension's base
/// unit — `base = value * factor + offset` — which is what lets one
/// `convert()` serve all three tools. Multiplicative units (kg, ft) simply
/// leave `offset` at zero; degrees Fahrenheit and kelvin carry a non-zero
/// one. Without the offset term, temperature would need a special case
/// threaded through every caller.
///
/// Factors are exact by definition wherever an exact definition exists
/// (an inch is exactly 0.0254 m, a pound exactly 453.59237 g), so the only
/// error is floating-point representation, not the constants themselves.
///
/// Auto-imported by Nuxt. Tests import it relatively (see test/unit).
/// --------------------------------------------------

export type DimensionId = "mass" | "length" | "temperature"

export interface UnitDefinition {
   /** Stable key. Also the copy key under `COPY.units.<dimension>.<id>`. */
   id: string
   /** Multiplier taking this unit to the dimension's base unit. */
   factor: number
   /** Added *after* scaling. Only non-zero for temperature scales. */
   offset?: number
}

export interface Dimension {
   id: DimensionId
   /** `id` of the unit all factors are expressed against. */
   base: string
   /** Display order: metric first, then imperial/US. */
   units: UnitDefinition[]
}

/** Metres per inch — exact by international agreement, 1959. */
const METRES_PER_INCH = 0.0254

/** Grams per pound — exact by international agreement, 1959. */
const GRAMS_PER_POUND = 453.59237

export const DIMENSIONS: Record<DimensionId, Dimension> = {
   mass: {
      id: "mass",
      base: "g",
      units: [
         { id: "mg", factor: 0.001 },
         { id: "g", factor: 1 },
         { id: "kg", factor: 1000 },
         { id: "t", factor: 1_000_000 },
         { id: "oz", factor: GRAMS_PER_POUND / 16 },
         { id: "lb", factor: GRAMS_PER_POUND },
         { id: "st", factor: GRAMS_PER_POUND * 14 },
         { id: "ton", factor: GRAMS_PER_POUND * 2000 },
      ],
   },
   length: {
      id: "length",
      base: "m",
      units: [
         { id: "mm", factor: 0.001 },
         { id: "cm", factor: 0.01 },
         { id: "m", factor: 1 },
         { id: "km", factor: 1000 },
         { id: "in", factor: METRES_PER_INCH },
         { id: "ft", factor: METRES_PER_INCH * 12 },
         { id: "yd", factor: METRES_PER_INCH * 36 },
         { id: "mi", factor: METRES_PER_INCH * 63_360 },
      ],
   },
   temperature: {
      // Base is Celsius rather than kelvin purely because it keeps the
      // offsets small and readable; the maths is identical either way.
      id: "temperature",
      base: "c",
      units: [
         { id: "c", factor: 1, offset: 0 },
         { id: "f", factor: 5 / 9, offset: -160 / 9 },
         { id: "k", factor: 1, offset: -273.15 },
      ],
   },
}

/** Look up a unit, failing loudly rather than silently converting wrongly. */
export function findUnit(dimension: Dimension, id: string): UnitDefinition {
   const unit = dimension.units.find((candidate) => candidate.id === id)

   if (!unit) {
      throw new Error(`Unknown ${dimension.id} unit: "${id}"`)
   }

   return unit
}

/**
 * Convert `value` between two units of the same dimension.
 *
 * Returns a raw float — deliberately unrounded, so callers can decide how
 * many digits to show. Use `formatQuantity()` for display.
 */
export function convert(value: number, from: string, to: string, dimension: Dimension): number {
   const source = findUnit(dimension, from)
   const target = findUnit(dimension, to)

   const base = value * source.factor + (source.offset ?? 0)

   return (base - (target.offset ?? 0)) / target.factor
}

/** Convert `value` into every unit of the dimension at once, keyed by unit id. */
export function convertToAll(value: number, from: string, dimension: Dimension): Record<string, number> {
   const results: Record<string, number> = {}

   for (const unit of dimension.units) {
      results[unit.id] = convert(value, from, unit.id, dimension)
   }

   return results
}

export interface FeetInches {
   feet: number
   inches: number
}

/**
 * Split a length in metres into whole feet plus remaining inches — the way
 * heights are actually spoken ("5 ft 11 in") rather than as a decimal.
 *
 * `inchDecimals` rounds the inches and carries into feet when that rounding
 * reaches 12, so a value just under six feet renders as `6 ft 0 in` rather
 * than the nonsensical `5 ft 12 in`.
 */
export function toFeetInches(metres: number, inchDecimals = 1): FeetInches {
   const totalInches = metres / METRES_PER_INCH
   const sign = totalInches < 0 ? -1 : 1
   const absolute = Math.abs(totalInches)

   let feet = Math.trunc(absolute / 12)
   const step = 10 ** inchDecimals
   let inches = Math.round((absolute - feet * 12) * step) / step

   if (inches >= 12) {
      feet += 1
      inches -= 12
   }

   return { feet: sign * feet, inches: sign * inches }
}

/** Recombine feet and inches into metres. Inverse of `toFeetInches`. */
export function fromFeetInches(feet: number, inches: number): number {
   return (feet * 12 + inches) * METRES_PER_INCH
}
