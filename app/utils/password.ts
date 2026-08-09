/// --------------------------------------------------
/// utils/password.ts
/// --------------------------------------------------
/// Password generation, using the platform CSPRNG.
///
/// Two details here are easy to get wrong and quietly weaken every
/// password produced:
///
///  1. `Math.random()` is not cryptographically secure and must never be
///     used for this. Randomness comes from `crypto.getRandomValues`.
///  2. Reducing a random 32-bit number with `% poolSize` biases the result
///     toward the start of the pool whenever the pool size does not divide
///     2^32 evenly — which, for a 26- or 86-character pool, it does not.
///     `randomIndex` rejects the tail of the range instead, so every
///     character is equally likely.
///
/// Callers must also keep generation off the server: a password rendered
/// during SSR can be cached and served to more than one visitor. See
/// `PasswordGeneratorPanel.vue`.
///
/// Auto-imported by Nuxt. Tests import it relatively (see test/unit).
/// --------------------------------------------------

export const CHARACTER_SETS = {
   lowercase: "abcdefghijklmnopqrstuvwxyz",
   uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
   digits: "0123456789",
   symbols: "!@#$%^&*()-_=+[]{}:;,.?/",
} as const

export type CharacterSetName = keyof typeof CHARACTER_SETS

/**
 * Characters that are hard to tell apart in common fonts. Excluding them
 * costs a little entropy and saves a lot of failed logins when a password
 * is read off a screen or written down.
 */
export const AMBIGUOUS_CHARACTERS = "0O1lI"

export const PASSWORD_MIN_LENGTH = 4
export const PASSWORD_MAX_LENGTH = 128

export type PasswordStrength = "weak" | "fair" | "strong" | "excellent"

export interface PasswordOptions {
   length: number
   lowercase: boolean
   uppercase: boolean
   digits: boolean
   symbols: boolean
   excludeAmbiguous: boolean
}

/**
 * A uniformly distributed integer in `[0, max)`.
 *
 * Draws 32 random bits and discards any draw landing in the short final
 * block, which is what removes the modulo bias described above.
 */
function randomIndex(max: number): number {
   if (max <= 0) {
      throw new RangeError("randomIndex: max must be positive")
   }

   const range = 0x1_0000_0000
   const limit = Math.floor(range / max) * max
   const buffer = new Uint32Array(1)

   for (;;) {
      crypto.getRandomValues(buffer)

      const [value = 0] = buffer

      if (value < limit) return value % max
   }
}

function swap(items: string[], a: number, b: number): void {
   const first = items[a]
   const second = items[b]

   if (first === undefined || second === undefined) return

   items[a] = second
   items[b] = first
}

/** Fisher–Yates, driven by the same unbiased source as selection. */
function shuffle(items: string[]): string[] {
   for (let index = items.length - 1; index > 0; index -= 1) {
      swap(items, index, randomIndex(index + 1))
   }

   return items
}

/** The enabled character pools, with ambiguous characters already removed. */
export function activePools(options: PasswordOptions): string[] {
   const enabled: CharacterSetName[] = []

   if (options.lowercase) enabled.push("lowercase")
   if (options.uppercase) enabled.push("uppercase")
   if (options.digits) enabled.push("digits")
   if (options.symbols) enabled.push("symbols")

   return enabled
      .map((name) => {
         const pool = CHARACTER_SETS[name]

         return options.excludeAmbiguous
            ? [...pool].filter((character) => !AMBIGUOUS_CHARACTERS.includes(character)).join("")
            : pool
      })
      .filter((pool) => pool.length > 0)
}

/**
 * Generate a password matching `options`.
 *
 * Every enabled character set is guaranteed to appear at least once —
 * otherwise a 12-character password could legitimately come out with no
 * digit and fail the very policy the user enabled digits to satisfy. The
 * guaranteed characters are placed first and then shuffled, so they do not
 * sit in a predictable prefix.
 */
export function generatePassword(options: PasswordOptions): string {
   const pools = activePools(options)

   if (pools.length === 0) {
      throw new Error("Select at least one character set.")
   }

   if (!Number.isInteger(options.length)) {
      throw new RangeError("Password length must be a whole number.")
   }

   if (options.length < PASSWORD_MIN_LENGTH || options.length > PASSWORD_MAX_LENGTH) {
      throw new RangeError(
         `Password length must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH}.`,
      )
   }

   if (options.length < pools.length) {
      throw new RangeError("Password is too short to include every selected character set.")
   }

   const combined = pools.join("")
   const characters = pools.map((pool) => pool.charAt(randomIndex(pool.length)))

   while (characters.length < options.length) {
      characters.push(combined.charAt(randomIndex(combined.length)))
   }

   return shuffle(characters).join("")
}

/**
 * Shannon entropy of the *generator*, in bits: how much work a brute-force
 * search faces given the chosen length and pools. This describes the
 * settings, not any particular password string.
 */
export function passwordEntropyBits(options: PasswordOptions): number {
   const poolSize = activePools(options).join("").length

   if (poolSize === 0 || options.length <= 0) return 0

   return options.length * Math.log2(poolSize)
}

/**
 * Bucket entropy into a label. Boundaries follow the usual guidance: under
 * 40 bits is trivially crackable offline, 60 resists casual attack, and
 * 120+ is beyond foreseeable brute force.
 */
export function passwordStrength(bits: number): PasswordStrength {
   if (bits < 40) return "weak"
   if (bits < 60) return "fair"
   if (bits < 120) return "strong"

   return "excellent"
}
