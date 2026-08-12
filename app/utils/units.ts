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

export type DimensionId
   = | "mass"
     | "length"
     | "temperature"
     | "speed"
     | "volume"
     | "area"
     | "time"
     | "data"

export interface UnitDefinition {
   /** Stable key. Also the copy key under `COPY.units.<dimension>.<id>`. */
   id: string
   /** Multiplier taking this unit to the dimension's base unit. */
   factor: number
   /** Added *after* scaling. Only non-zero for temperature scales. */
   offset?: number
   /**
    * Optional heading this unit sits under, as a key into
    * `COPY.unitGroups.<dimension>`.
    *
    * Only set where a flat list would mislead — data storage, where
    * "Kilobyte" and "Kibibyte" are a letter apart and a thousand-and-a-bit
    * bytes apart. A dimension either groups every unit or none of them;
    * `test/unit/units.test.ts` holds that line, because a half-grouped
    * dropdown would silently drop the ungrouped options in most browsers.
    */
   group?: string
}

/** One heading and the units filed under it, for a grouped dimension. */
export interface UnitGroup {
   id: string
   units: UnitDefinition[]
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

/** Inches per mile — exact: 5,280 feet of 12 inches. */
const INCHES_PER_MILE = 63_360

/** Metres per nautical mile — exact by definition, and the basis of the knot. */
const METRES_PER_NAUTICAL_MILE = 1852

/** Seconds per hour, spelled out where it divides a per-hour speed. */
const SECONDS_PER_HOUR = 3600

/** Metres per foot and per yard — exact, from the exact inch. */
const METRES_PER_FOOT = METRES_PER_INCH * 12
const METRES_PER_YARD = METRES_PER_INCH * 36

/** Metres per mile — exact, and squared for the square mile. */
const METRES_PER_MILE = METRES_PER_INCH * INCHES_PER_MILE

/**
 * Litres per gallon — and there are two gallons.
 *
 * The US gallon is defined as exactly 231 cubic inches; the imperial gallon
 * was redefined in 1985 as exactly 4.54609 litres. They differ by about 20%,
 * which is why every US unit below derives from the first constant and every
 * imperial one from the second. Deriving a pint from "the" gallon without
 * saying which is exactly how a volume converter ends up quietly wrong.
 */
const LITRES_PER_US_GALLON = 231 * (METRES_PER_INCH * 100) ** 3 / 1000
const LITRES_PER_IMPERIAL_GALLON = 4.54609

/** Bytes per kibibyte — 2^10, the base of every IEC binary prefix. */
const BYTES_PER_KIBIBYTE = 1024

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
         { id: "ft", factor: METRES_PER_FOOT },
         { id: "yd", factor: METRES_PER_YARD },
         { id: "mi", factor: METRES_PER_MILE },
      ],
   },
   speed: {
      // Base is metres per second — the SI unit, and the only one of the
      // five that needs no division. Every factor below is exact: the
      // imperial speeds inherit the exact inch, and the knot is defined
      // from the nautical mile rather than approximated from a mile.
      id: "speed",
      base: "mps",
      units: [
         { id: "mps", factor: 1 },
         { id: "kmh", factor: 1000 / SECONDS_PER_HOUR },
         { id: "mph", factor: METRES_PER_MILE / SECONDS_PER_HOUR },
         { id: "fps", factor: METRES_PER_FOOT },
         { id: "kn", factor: METRES_PER_NAUTICAL_MILE / SECONDS_PER_HOUR },
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
   volume: {
      // Base is the litre rather than the cubic metre: it keeps the metric
      // factors at the scale people actually type, and the cubic metre is
      // then simply a thousand of them.
      //
      // Unit ids carry their measurement system as a prefix because the
      // names collide — a US pint and an imperial pint are both "a pint",
      // and they differ by a fifth.
      id: "volume",
      base: "l",
      units: [
         { id: "ml", factor: 0.001 },
         { id: "l", factor: 1 },
         { id: "m3", factor: 1000 },
         // A US gallon is 128 fl oz, 16 cups, 8 pints or 4 quarts; a fl oz
         // is 2 tbsp or 6 tsp, which puts 768 teaspoons in the gallon.
         { id: "us-tsp", factor: LITRES_PER_US_GALLON / 768 },
         { id: "us-tbsp", factor: LITRES_PER_US_GALLON / 256 },
         { id: "us-floz", factor: LITRES_PER_US_GALLON / 128 },
         { id: "us-cup", factor: LITRES_PER_US_GALLON / 16 },
         { id: "us-pt", factor: LITRES_PER_US_GALLON / 8 },
         { id: "us-qt", factor: LITRES_PER_US_GALLON / 4 },
         { id: "us-gal", factor: LITRES_PER_US_GALLON },
         // The imperial gallon divides into 160 fluid ounces, not 128 —
         // one more reason the two systems cannot share a unit id.
         { id: "imp-floz", factor: LITRES_PER_IMPERIAL_GALLON / 160 },
         { id: "imp-pt", factor: LITRES_PER_IMPERIAL_GALLON / 8 },
         { id: "imp-gal", factor: LITRES_PER_IMPERIAL_GALLON },
      ],
   },
   area: {
      // Every imperial factor is the matching length factor squared, so
      // they inherit the exact inch rather than restating a rounded
      // constant. The acre is the one that is not a square of anything
      // tidy: it is defined as 4,840 square yards.
      id: "area",
      base: "m2",
      units: [
         { id: "mm2", factor: 0.000_001 },
         { id: "cm2", factor: 0.000_1 },
         { id: "m2", factor: 1 },
         { id: "ha", factor: 10_000 },
         { id: "km2", factor: 1_000_000 },
         { id: "in2", factor: METRES_PER_INCH ** 2 },
         { id: "ft2", factor: METRES_PER_FOOT ** 2 },
         { id: "yd2", factor: METRES_PER_YARD ** 2 },
         { id: "acre", factor: METRES_PER_YARD ** 2 * 4840 },
         { id: "mi2", factor: METRES_PER_MILE ** 2 },
      ],
   },
   time: {
      // No month. A month has no fixed length, so any factor for one would
      // be a guess printed to eight significant digits. The year is the
      // common 365 days, which the FAQ states rather than leaves inferred.
      id: "time",
      base: "s",
      units: [
         { id: "ms", factor: 0.001 },
         { id: "s", factor: 1 },
         { id: "min", factor: 60 },
         { id: "h", factor: SECONDS_PER_HOUR },
         { id: "d", factor: SECONDS_PER_HOUR * 24 },
         { id: "wk", factor: SECONDS_PER_HOUR * 24 * 7 },
         { id: "yr", factor: SECONDS_PER_HOUR * 24 * 365 },
      ],
   },
   data: {
      // The only grouped dimension, and the reason grouping exists: a
      // kilobyte and a kibibyte differ by one letter on screen and by 24
      // bytes in fact, and the gap compounds — a terabyte and a tebibyte
      // are about 10% apart. Listing all twelve flat would put "Kilobyte"
      // and "Kibibyte" adjacent with nothing to say which is which.
      //
      // Base is the byte. The bit is included because network speeds are
      // quoted in bits while storage is quoted in bytes, which is its own
      // reliable source of confusion.
      id: "data",
      base: "byte",
      units: [
         { id: "bit", factor: 1 / 8, group: "base" },
         { id: "byte", factor: 1, group: "base" },
         { id: "kb", factor: 1e3, group: "decimal" },
         { id: "mb", factor: 1e6, group: "decimal" },
         { id: "gb", factor: 1e9, group: "decimal" },
         { id: "tb", factor: 1e12, group: "decimal" },
         { id: "pb", factor: 1e15, group: "decimal" },
         { id: "kib", factor: BYTES_PER_KIBIBYTE, group: "binary" },
         { id: "mib", factor: BYTES_PER_KIBIBYTE ** 2, group: "binary" },
         { id: "gib", factor: BYTES_PER_KIBIBYTE ** 3, group: "binary" },
         { id: "tib", factor: BYTES_PER_KIBIBYTE ** 4, group: "binary" },
         { id: "pib", factor: BYTES_PER_KIBIBYTE ** 5, group: "binary" },
      ],
   },
}

/**
 * The dimension's units split into their headings, in declaration order,
 * or `null` when the dimension is ungrouped.
 *
 * Returning `null` rather than one synthetic group keeps the flat case
 * exactly as it was for the seven dimensions that do not group.
 */
export function unitGroups(dimension: Dimension): UnitGroup[] | null {
   if (!dimension.units.some((unit) => unit.group)) return null

   const groups: UnitGroup[] = []

   for (const unit of dimension.units) {
      // A unit with no group in a grouped dimension is a copy/registry
      // error, not a layout choice — see the note on `UnitDefinition.group`.
      const id = unit.group ?? ""
      const existing = groups.find((group) => group.id === id)

      if (existing) {
         existing.units.push(unit)
      }
      else {
         groups.push({ id, units: [unit] })
      }
   }

   return groups
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
