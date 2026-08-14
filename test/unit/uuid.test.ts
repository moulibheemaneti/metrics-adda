import { afterEach, describe, expect, it } from "vitest"
// Relative, not aliased: `~` is a Nuxt convenience that exists only inside
// the Nuxt/Vite environment, and these tests run in plain Node.
import {
   clampUuidCount,
   formatUuid,
   generateUuid,
   generateUuids,
   isUuidV4,
   UUID_MAX_COUNT,
   UUID_MIN_COUNT,
} from "../../app/utils/uuid"

const PLAIN = { uppercase: false, hyphens: true, braces: false }

const CANONICAL = "b534c753-2258-41de-9882-0931cade0d02"

/// `crypto.randomUUID` is only defined in a secure context, so the module
/// carries a `getRandomValues` fallback for plain-http origins. Both paths
/// have to produce the same shape — the fallback is the one that silently
/// ships wrong version bits if it is never exercised, so these tests run
/// the suite against it explicitly.

const native = globalThis.crypto.randomUUID

function withoutRandomUuid<T>(run: () => T): T {
   Reflect.deleteProperty(globalThis.crypto, "randomUUID")

   try {
      return run()
   }
   finally {
      Object.defineProperty(globalThis.crypto, "randomUUID", {
         value: native,
         configurable: true,
         writable: true,
      })
   }
}

afterEach(() => {
   if (globalThis.crypto.randomUUID !== native) {
      Object.defineProperty(globalThis.crypto, "randomUUID", {
         value: native,
         configurable: true,
         writable: true,
      })
   }
})

describe("generateUuid", () => {
   it("returns a canonical v4 UUID", () => {
      expect(isUuidV4(generateUuid())).toBe(true)
   })

   it("returns 36 characters in 8-4-4-4-12 form", () => {
      const uuid = generateUuid()

      expect(uuid).toHaveLength(36)
      expect(uuid.split("-").map((part) => part.length)).toEqual([8, 4, 4, 4, 12])
   })

   it("sets the version and variant bits", () => {
      for (let index = 0; index < 50; index += 1) {
         const uuid = generateUuid()

         expect(uuid.charAt(14), "version nibble").toBe("4")
         expect("89ab", "variant nibble").toContain(uuid.charAt(19))
      }
   })

   it("does not repeat itself", () => {
      const values = Array.from({ length: 500 }, generateUuid)

      expect(new Set(values).size).toBe(values.length)
   })

   describe("without crypto.randomUUID", () => {
      it("still returns a canonical v4 UUID", () => {
         withoutRandomUuid(() => {
            for (let index = 0; index < 50; index += 1) {
               const uuid = generateUuid()

               expect(isUuidV4(uuid), `${uuid} is not a valid v4`).toBe(true)
               expect(uuid).toHaveLength(36)
            }
         })
      })

      it("does not repeat itself", () => {
         const values = withoutRandomUuid(() => Array.from({ length: 500 }, generateUuid))

         expect(new Set(values).size).toBe(values.length)
      })

      it("puts the hyphens in the same places", () => {
         const uuid = withoutRandomUuid(generateUuid)

         expect(uuid.split("-").map((part) => part.length)).toEqual([8, 4, 4, 4, 12])
      })
   })
})

describe("formatUuid", () => {
   it("leaves the canonical form alone", () => {
      expect(formatUuid(CANONICAL, PLAIN)).toBe(CANONICAL)
   })

   it("upper-cases on request", () => {
      expect(formatUuid(CANONICAL, { ...PLAIN, uppercase: true })).toBe(CANONICAL.toUpperCase())
   })

   it("strips the hyphens on request", () => {
      const compact = formatUuid(CANONICAL, { ...PLAIN, hyphens: false })

      expect(compact).toHaveLength(32)
      expect(compact).not.toContain("-")
   })

   it("wraps in braces on request", () => {
      expect(formatUuid(CANONICAL, { ...PLAIN, braces: true })).toBe(`{${CANONICAL}}`)
   })

   it("combines every option", () => {
      const formatted = formatUuid(CANONICAL, { uppercase: true, hyphens: false, braces: true })

      expect(formatted).toBe(`{${CANONICAL.replaceAll("-", "").toUpperCase()}}`)
   })
})

describe("generateUuids", () => {
   it("returns the requested number", () => {
      expect(generateUuids({ ...PLAIN, count: 7 })).toHaveLength(7)
   })

   it("clamps a count past the maximum", () => {
      expect(generateUuids({ ...PLAIN, count: 5000 })).toHaveLength(UUID_MAX_COUNT)
   })

   it("returns valid, distinct values at the maximum", () => {
      const values = generateUuids({ ...PLAIN, count: UUID_MAX_COUNT })

      expect(new Set(values).size).toBe(UUID_MAX_COUNT)
      expect(values.every(isUuidV4)).toBe(true)
   })

   it("applies the format to every value", () => {
      const values = generateUuids({ count: 5, uppercase: true, hyphens: false, braces: true })

      for (const value of values) {
         expect(value).toMatch(/^\{[0-9A-F]{32}\}$/u)
      }
   })
})

describe("clampUuidCount", () => {
   it("holds a value inside the range", () => {
      expect(clampUuidCount(10)).toBe(10)
   })

   it("pulls a value back to the bounds", () => {
      expect(clampUuidCount(0)).toBe(UUID_MIN_COUNT)
      expect(clampUuidCount(UUID_MAX_COUNT + 1)).toBe(UUID_MAX_COUNT)
   })

   /// An emptied number input gives `NaN` rather than a number.
   it("falls back to the minimum for a non-number", () => {
      expect(clampUuidCount(Number.NaN)).toBe(UUID_MIN_COUNT)
   })

   it("clamps the infinities to the bounds", () => {
      expect(clampUuidCount(Number.POSITIVE_INFINITY)).toBe(UUID_MAX_COUNT)
      expect(clampUuidCount(Number.NEGATIVE_INFINITY)).toBe(UUID_MIN_COUNT)
   })

   it("truncates a fractional count", () => {
      expect(clampUuidCount(3.9)).toBe(3)
   })
})

describe("isUuidV4", () => {
   it("accepts the canonical form", () => {
      expect(isUuidV4(CANONICAL)).toBe(true)
   })

   it("accepts uppercase and braces", () => {
      expect(isUuidV4(`{${CANONICAL.toUpperCase()}}`)).toBe(true)
   })

   it("ignores surrounding whitespace", () => {
      expect(isUuidV4(`  ${CANONICAL}  `)).toBe(true)
   })

   it("rejects the compact form", () => {
      expect(isUuidV4(CANONICAL.replaceAll("-", ""))).toBe(false)
   })

   /// The version and variant nibbles are checked rather than accepted as
   /// any hex, so a v1 UUID — same shape, different meaning — fails.
   it("rejects another UUID version", () => {
      expect(isUuidV4("b534c753-2258-11de-9882-0931cade0d02")).toBe(false)
   })

   it("rejects a bad variant nibble", () => {
      expect(isUuidV4("b534c753-2258-41de-c882-0931cade0d02")).toBe(false)
   })

   it("rejects nonsense", () => {
      expect(isUuidV4("")).toBe(false)
      expect(isUuidV4("not-a-uuid")).toBe(false)
      expect(isUuidV4(`${CANONICAL}-extra`)).toBe(false)
   })
})
