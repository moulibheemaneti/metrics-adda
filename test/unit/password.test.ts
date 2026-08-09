import { describe, expect, it } from "vitest"
// Relative, not aliased: `~` is a Nuxt convenience that exists only inside
// the Nuxt/Vite environment, and these tests run in plain Node.
import {
   AMBIGUOUS_CHARACTERS,
   CHARACTER_SETS,
   generatePassword,
   PASSWORD_MAX_LENGTH,
   passwordEntropyBits,
   passwordStrength,
   type PasswordOptions,
} from "../../app/utils/password"

const baseOptions: PasswordOptions = {
   length: 16,
   lowercase: true,
   uppercase: true,
   digits: true,
   symbols: true,
   excludeAmbiguous: false,
}

const options = (overrides: Partial<PasswordOptions> = {}): PasswordOptions => ({
   ...baseOptions,
   ...overrides,
})

const has = (password: string, pool: string): boolean =>
   [...password].some((character) => pool.includes(character))

describe("generatePassword", () => {
   it("honours the requested length", () => {
      for (const length of [4, 8, 16, 32, PASSWORD_MAX_LENGTH]) {
         expect(generatePassword(options({ length }))).toHaveLength(length)
      }
   })

   it("produces a different password each call", () => {
      const passwords = new Set(
         Array.from({ length: 50 }, () => generatePassword(options())),
      )

      expect(passwords.size).toBe(50)
   })

   it("uses only characters from the enabled sets", () => {
      const allowed = CHARACTER_SETS.lowercase + CHARACTER_SETS.digits
      const password = generatePassword(
         options({ uppercase: false, symbols: false, length: 64 }),
      )

      for (const character of password) {
         expect(allowed, `unexpected character "${character}"`).toContain(character)
      }
   })

   it("omits a set that is switched off", () => {
      const password = generatePassword(options({ symbols: false, length: 64 }))

      expect(has(password, CHARACTER_SETS.symbols)).toBe(false)
   })
})

/// Guaranteeing one character per enabled set is the whole point of
/// enabling a set — a password with no digit fails the policy the user
/// switched digits on to satisfy. At the minimum length there is the least
/// slack, so that is where it is checked hardest.

describe("generatePassword — set coverage", () => {
   it("includes every enabled set on every run", () => {
      for (let run = 0; run < 200; run += 1) {
         const password = generatePassword(options({ length: 4 }))

         expect(has(password, CHARACTER_SETS.lowercase), password).toBe(true)
         expect(has(password, CHARACTER_SETS.uppercase), password).toBe(true)
         expect(has(password, CHARACTER_SETS.digits), password).toBe(true)
         expect(has(password, CHARACTER_SETS.symbols), password).toBe(true)
      }
   })

   it("does not park the guaranteed characters in a fixed prefix", () => {
      // Unshuffled, the first character would always be lowercase.
      const firsts = new Set(
         Array.from({ length: 200 }, () => generatePassword(options()).charAt(0)),
      )
      const classes = [
         CHARACTER_SETS.lowercase,
         CHARACTER_SETS.uppercase,
         CHARACTER_SETS.digits,
         CHARACTER_SETS.symbols,
      ].filter((pool) => [...firsts].some((character) => pool.includes(character)))

      expect(classes.length).toBeGreaterThan(1)
   })
})

describe("generatePassword — ambiguous characters", () => {
   it("excludes look-alike characters when asked", () => {
      const password = generatePassword(
         options({ excludeAmbiguous: true, length: PASSWORD_MAX_LENGTH }),
      )

      for (const character of AMBIGUOUS_CHARACTERS) {
         expect(password, `contained "${character}"`).not.toContain(character)
      }
   })

   it("still satisfies every enabled set once they are filtered", () => {
      const password = generatePassword(options({ excludeAmbiguous: true, length: 4 }))

      expect(has(password, CHARACTER_SETS.digits)).toBe(true)
      expect(has(password, CHARACTER_SETS.uppercase)).toBe(true)
   })
})

describe("generatePassword — invalid input", () => {
   it("refuses when no character set is selected", () => {
      expect(() =>
         generatePassword(
            options({ lowercase: false, uppercase: false, digits: false, symbols: false }),
         ),
      ).toThrow(/at least one character set/i)
   })

   it("refuses a length below the minimum", () => {
      expect(() => generatePassword(options({ length: 3 }))).toThrow(/between/i)
   })

   it("refuses a length above the maximum", () => {
      expect(() => generatePassword(options({ length: PASSWORD_MAX_LENGTH + 1 })))
         .toThrow(/between/i)
   })

   it("refuses a fractional length", () => {
      expect(() => generatePassword(options({ length: 12.5 }))).toThrow(/whole number/i)
   })
})

describe("passwordEntropyBits", () => {
   it("is length times log2 of the pool size", () => {
      const lowercaseOnly = options({
         length: 10,
         uppercase: false,
         digits: false,
         symbols: false,
      })

      expect(passwordEntropyBits(lowercaseOnly)).toBeCloseTo(10 * Math.log2(26), 10)
   })

   it("grows with length", () => {
      expect(passwordEntropyBits(options({ length: 20 })))
         .toBeGreaterThan(passwordEntropyBits(options({ length: 10 })))
   })

   it("grows when another character set is enabled", () => {
      const narrow = options({ uppercase: false, digits: false, symbols: false })

      expect(passwordEntropyBits(options())).toBeGreaterThan(passwordEntropyBits(narrow))
   })

   it("drops when ambiguous characters are excluded", () => {
      expect(passwordEntropyBits(options({ excludeAmbiguous: true })))
         .toBeLessThan(passwordEntropyBits(options()))
   })

   it("is zero when nothing is selected", () => {
      const nothing = options({
         lowercase: false,
         uppercase: false,
         digits: false,
         symbols: false,
      })

      expect(passwordEntropyBits(nothing)).toBe(0)
   })
})

describe("passwordStrength", () => {
   it("labels each band", () => {
      expect(passwordStrength(20)).toBe("weak")
      expect(passwordStrength(39.9)).toBe("weak")
      expect(passwordStrength(40)).toBe("fair")
      expect(passwordStrength(60)).toBe("strong")
      expect(passwordStrength(119.9)).toBe("strong")
      expect(passwordStrength(120)).toBe("excellent")
   })
})

/// A biased generator still passes every test above. This one samples the
/// distribution: with a 26-character pool and 26 000 draws, each letter is
/// expected ~1000 times, and a modulo-biased generator would push the
/// early letters far outside this tolerance.

describe("generatePassword — distribution", () => {
   it("draws characters roughly uniformly", () => {
      const pool = CHARACTER_SETS.lowercase
      const counts = new Map<string, number>()
      const draws = 26_000

      for (let run = 0; run < draws / PASSWORD_MAX_LENGTH; run += 1) {
         const password = generatePassword(
            options({
               length: PASSWORD_MAX_LENGTH,
               uppercase: false,
               digits: false,
               symbols: false,
            }),
         )

         for (const character of password) {
            counts.set(character, (counts.get(character) ?? 0) + 1)
         }
      }

      const expected = draws / pool.length

      expect(counts.size).toBe(pool.length)

      for (const [character, count] of counts) {
         expect(count, `"${character}" appeared ${count} times`).toBeGreaterThan(expected * 0.6)
         expect(count, `"${character}" appeared ${count} times`).toBeLessThan(expected * 1.4)
      }
   })
})
