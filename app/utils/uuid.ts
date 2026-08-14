/// --------------------------------------------------
/// utils/uuid.ts
/// --------------------------------------------------
/// Version 4 UUID generation, using the platform CSPRNG.
///
/// `crypto.randomUUID()` does the work wherever it exists. It is only
/// exposed in secure contexts, though — a site opened over plain http on a
/// LAN address has `crypto` but not `randomUUID` — so there is a fallback
/// built from `crypto.getRandomValues`, which has no such restriction. The
/// fallback sets the same version and variant bits, so the two paths are
/// indistinguishable in their output.
///
/// Randomness is never taken from `Math.random()` on either path. A UUID is
/// routinely used as a database key or an idempotency token, and one drawn
/// from a predictable source stops being unique in exactly the case that
/// matters.
///
/// Callers must keep generation off the server, for the same reason
/// `utils/password.ts` must: a UUID rendered during SSR can be cached and
/// handed to every visitor, which would make it neither unique nor
/// unguessable. See `UuidGeneratorPanel.vue`.
///
/// Auto-imported by Nuxt. Tests import it relatively (see test/unit).
/// --------------------------------------------------

export const UUID_MIN_COUNT = 1
export const UUID_MAX_COUNT = 100

export interface UuidOptions {
   count: number
   uppercase: boolean
   /** Keep the 8-4-4-4-12 hyphens. Off gives the 32-character "compact" form. */
   hyphens: boolean
   /** Wrap each value in braces, as Microsoft's registry and GUID tooling do. */
   braces: boolean
}

/**
 * Canonical v4 form, lower-case and hyphenated.
 *
 * Matches the version nibble (`4`) and the variant nibble (`8`, `9`, `a` or
 * `b`) rather than accepting any hex in those positions, so a string that
 * merely looks the right shape does not pass.
 */
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u

const HYPHEN_POSITIONS = [8, 12, 16, 20]

/**
 * Build a v4 UUID from 16 CSPRNG bytes.
 *
 * Byte 6's high nibble becomes `4` (the version) and byte 8's top two bits
 * become `10` (the RFC 4122 variant). Both are required by the spec, and
 * omitting either produces a string that parsers will reject or, worse,
 * silently treat as a different version.
 */
function randomUuidFromBytes(): string {
   const bytes = new Uint8Array(16)

   crypto.getRandomValues(bytes)

   bytes[6] = ((bytes[6] ?? 0) & 0x0F) | 0x40
   bytes[8] = ((bytes[8] ?? 0) & 0x3F) | 0x80

   const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"))

   for (const [offset, position] of HYPHEN_POSITIONS.entries()) {
      hex.splice(position / 2 + offset, 0, "-")
   }

   return hex.join("")
}

/** One v4 UUID in canonical lower-case hyphenated form. */
export function generateUuid(): string {
   return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : randomUuidFromBytes()
}

/** Apply the display options to a canonical UUID. */
export function formatUuid(uuid: string, options: Omit<UuidOptions, "count">): string {
   let formatted = options.hyphens ? uuid : uuid.replaceAll("-", "")

   if (options.uppercase) formatted = formatted.toUpperCase()

   return options.braces ? `{${formatted}}` : formatted
}

/** Clamp a requested count into the allowed range. */
export function clampUuidCount(count: number): number {
   // Only `NaN` needs the guard — it is what an emptied number input gives,
   // and it would pass straight through `Math.min`/`Math.max` unchanged.
   // The infinities are genuinely out of range and clamp on their own.
   if (Number.isNaN(count)) return UUID_MIN_COUNT

   return Math.min(Math.max(Math.trunc(count), UUID_MIN_COUNT), UUID_MAX_COUNT)
}

/** A batch of freshly generated UUIDs, formatted for display. */
export function generateUuids(options: UuidOptions): string[] {
   const count = clampUuidCount(options.count)

   return Array.from({ length: count }, () => formatUuid(generateUuid(), options))
}

/** Whether a string is a canonical v4 UUID, ignoring case and braces. */
export function isUuidV4(value: string): boolean {
   return UUID_V4_PATTERN.test(value.trim().replace(/^\{|\}$/gu, "").toLowerCase())
}
