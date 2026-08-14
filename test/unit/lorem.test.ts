import { describe, expect, it } from "vitest"
// Relative, not aliased: `~` is a Nuxt convenience that exists only inside
// the Nuxt/Vite environment, and these tests run in plain Node.
import {
   clampCount,
   generateLorem,
   LOREM_LIMITS,
   LOREM_OPENING,
   LOREM_UNITS,
   LOREM_WORDS,
} from "../../app/utils/lorem"

const paragraphs = (text: string): string[] => text.split("\n\n")
const sentences = (text: string): string[] => text.split(".").filter((part) => part.trim() !== "")
const words = (text: string): string[] => text.trim().split(/\s+/u)

describe("LOREM_WORDS", () => {
   it("holds no duplicates", () => {
      expect(new Set(LOREM_WORDS).size).toBe(LOREM_WORDS.length)
   })

   it("is lower-case and unpunctuated", () => {
      for (const word of LOREM_WORDS) {
         expect(word, `${word} is not a bare lowercase word`).toMatch(/^[a-z]+$/)
      }
   })

   it("contains every word of the canonical opening", () => {
      for (const word of LOREM_OPENING) {
         expect(LOREM_WORDS, `${word} is missing from the bank`).toContain(word)
      }
   })
})

/// Seeding is the property the whole module is built around: the panel
/// server-renders its first passage, so the same seed has to produce the
/// same characters in Node and in the browser. If this drifts, the tool
/// starts reporting hydration mismatches in production.

describe("generateLorem is deterministic", () => {
   it("returns the same passage for the same seed", () => {
      const options = { unit: "paragraphs", count: 3, startWithLorem: true } as const

      expect(generateLorem(options, 42)).toBe(generateLorem(options, 42))
   })

   it("returns a different passage for a different seed", () => {
      const options = { unit: "paragraphs", count: 3, startWithLorem: false } as const

      expect(generateLorem(options, 1)).not.toBe(generateLorem(options, 2))
   })

   it("is stable across every unit", () => {
      for (const unit of LOREM_UNITS) {
         const options = { unit, count: 4, startWithLorem: false }

         expect(generateLorem(options, 7), `${unit} is not stable`).toBe(
            generateLorem(options, 7),
         )
      }
   })
})

describe("generateLorem counts", () => {
   it("returns the requested number of paragraphs", () => {
      for (const count of [1, 3, 10]) {
         const text = generateLorem({ unit: "paragraphs", count, startWithLorem: false }, count)

         expect(paragraphs(text)).toHaveLength(count)
      }
   })

   it("returns the requested number of sentences", () => {
      for (const count of [1, 5, 20]) {
         const text = generateLorem({ unit: "sentences", count, startWithLorem: false }, count)

         expect(sentences(text)).toHaveLength(count)
      }
   })

   it("returns the requested number of words", () => {
      for (const count of [1, 12, 250]) {
         const text = generateLorem({ unit: "words", count, startWithLorem: false }, count)

         expect(words(text)).toHaveLength(count)
      }
   })

   /// A comma is attached to the word before it rather than spaced out, so
   /// it must not turn one word into two — the count above would silently
   /// drift otherwise.
   it("never separates a comma from its word", () => {
      const text = generateLorem({ unit: "paragraphs", count: 5, startWithLorem: false }, 99)

      expect(text).not.toMatch(/\s,/u)
   })

   it("clamps a count past the unit's maximum", () => {
      const { max } = LOREM_LIMITS.paragraphs
      const text = generateLorem({ unit: "paragraphs", count: max + 50, startWithLorem: false }, 3)

      expect(paragraphs(text)).toHaveLength(max)
   })
})

describe("the canonical opening", () => {
   it("opens with the classic phrase when asked", () => {
      const text = generateLorem({ unit: "paragraphs", count: 2, startWithLorem: true }, 5)

      expect(text.startsWith("Lorem ipsum dolor sit amet, consectetur adipiscing elit")).toBe(true)
   })

   it("opens only the first block", () => {
      const text = generateLorem({ unit: "paragraphs", count: 4, startWithLorem: true }, 5)
      const [, ...rest] = paragraphs(text)

      for (const paragraph of rest) {
         expect(paragraph.startsWith("Lorem ipsum")).toBe(false)
      }
   })

   it("leaves the phrase off when not asked", () => {
      const text = generateLorem({ unit: "paragraphs", count: 2, startWithLorem: false }, 5)

      expect(text.startsWith("Lorem ipsum dolor sit amet,")).toBe(false)
   })

   /// Asking for four words used to end the passage on "sit amet," — the
   /// comma is only correct when something follows it.
   it("drops the comma when the request is shorter than the phrase", () => {
      for (const count of [1, 2, 3, 4, 5]) {
         const text = generateLorem({ unit: "words", count, startWithLorem: true }, 5)

         expect(text.endsWith(","), `${count} words ends on a comma`).toBe(false)
      }
   })
})

describe("generated text is well formed", () => {
   it("capitalises the first letter and ends every sentence with a stop", () => {
      const text = generateLorem({ unit: "paragraphs", count: 3, startWithLorem: false }, 11)

      expect(text).toMatch(/^[A-Z]/u)
      expect(text.trimEnd().endsWith(".")).toBe(true)
   })

   it("separates paragraphs with a blank line", () => {
      const text = generateLorem({ unit: "paragraphs", count: 2, startWithLorem: false }, 12)

      expect(text).toContain("\n\n")
   })

   it("keeps sentences on one line", () => {
      const text = generateLorem({ unit: "sentences", count: 6, startWithLorem: false }, 13)

      expect(text).not.toContain("\n")
   })

   it("uses only bank words, punctuation aside", () => {
      const text = generateLorem({ unit: "paragraphs", count: 4, startWithLorem: true }, 21)
      const bank = new Set(LOREM_WORDS)

      for (const word of words(text)) {
         const bare = word.replace(/[.,]/gu, "").toLowerCase()

         expect(bank.has(bare), `${bare} is not in the bank`).toBe(true)
      }
   })
})

describe("clampCount", () => {
   it("holds a value inside the range", () => {
      expect(clampCount("paragraphs", 5)).toBe(5)
   })

   it("pulls a value back to the bounds", () => {
      expect(clampCount("words", LOREM_LIMITS.words.max + 1)).toBe(LOREM_LIMITS.words.max)
      expect(clampCount("words", 0)).toBe(LOREM_LIMITS.words.min)
   })

   /// An emptied number input gives `NaN`, not a number — without this it
   /// would reach the loop and hang.
   it("falls back to the minimum for a non-number", () => {
      expect(clampCount("sentences", Number.NaN)).toBe(LOREM_LIMITS.sentences.min)
      expect(clampCount("sentences", Number.POSITIVE_INFINITY))
         .toBe(LOREM_LIMITS.sentences.max)
   })

   it("truncates a fractional count", () => {
      expect(clampCount("paragraphs", 4.8)).toBe(4)
   })
})

describe("LOREM_LIMITS", () => {
   it("covers every unit with a usable range", () => {
      for (const unit of LOREM_UNITS) {
         const { min, max, initial } = LOREM_LIMITS[unit]

         expect(min, `${unit} min`).toBeGreaterThanOrEqual(1)
         expect(max, `${unit} max`).toBeGreaterThan(min)
         expect(initial, `${unit} initial`).toBeGreaterThanOrEqual(min)
         expect(initial, `${unit} initial`).toBeLessThanOrEqual(max)
      }
   })
})
