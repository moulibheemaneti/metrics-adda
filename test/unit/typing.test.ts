import { describe, expect, it } from "vitest"
// Relative, not aliased: `~` is a Nuxt convenience that exists only inside
// the Nuxt/Vite environment, and these tests run in plain Node.
import {
   buildStream,
   computeResult,
   DEFAULT_DURATION,
   gradeWord,
   isTestDuration,
   MAX_PLAUSIBLE_WPM,
   tallyWord,
   TEST_DURATIONS,
   WORD_BANK,
} from "../../app/utils/typing"

describe("WORD_BANK", () => {
   it("holds only plain lowercase words", () => {
      for (const word of WORD_BANK) {
         expect(word, `${word} is not plain lowercase`).toMatch(/^[a-z]+$/)
      }
   })

   it("repeats no word", () => {
      expect(new Set(WORD_BANK).size).toBe(WORD_BANK.length)
   })

   it("is large enough that a run does not exhaust it", () => {
      // A 120-second run at 100 wpm is about 200 words, so a smaller bank
      // would start cycling within a single test.
      expect(WORD_BANK.length).toBeGreaterThanOrEqual(200)
   })
})

describe("TEST_DURATIONS", () => {
   it("offers the default", () => {
      expect(isTestDuration(DEFAULT_DURATION)).toBe(true)
   })

   it("rejects a length it does not offer", () => {
      expect(isTestDuration(45)).toBe(false)
   })

   it("runs shortest to longest", () => {
      expect([...TEST_DURATIONS]).toStrictEqual([...TEST_DURATIONS].sort((a, b) => a - b))
   })
})

/// The shuffle takes its randomness as an argument precisely so this can
/// assert on an exact sequence rather than on statistical properties.

describe("buildStream", () => {
   /** A repeatable stand-in for `Math.random`. */
   const seeded = () => {
      let seed = 1

      return () => {
         seed = (seed * 1103515245 + 12345) % 2147483648

         return seed / 2147483648
      }
   }

   it("returns exactly the number of words asked for", () => {
      expect(buildStream(10, seeded())).toHaveLength(10)
      expect(buildStream(500, seeded())).toHaveLength(500)
   })

   it("is reproducible for a given source of randomness", () => {
      expect(buildStream(60, seeded())).toStrictEqual(buildStream(60, seeded()))
   })

   it("draws only from the bank", () => {
      const bank = new Set(WORD_BANK)

      for (const word of buildStream(400, seeded())) {
         expect(bank.has(word), `${word} is not in the bank`).toBe(true)
      }
   })

   it("never repeats a word back to back, including across bags", () => {
      // 500 words is more than two full bags, so this covers the seam where a
      // fresh shuffle could otherwise open with the word that closed the last.
      const stream = buildStream(500, seeded())

      for (let i = 1; i < stream.length; i += 1) {
         expect(stream[i], `repeat at index ${i}`).not.toBe(stream[i - 1])
      }
   })

   it("uses the whole bank before reusing any of it", () => {
      const first = buildStream(WORD_BANK.length, seeded())

      expect(new Set(first).size).toBe(WORD_BANK.length)
   })

   it("returns nothing for a non-positive or unusable count", () => {
      expect(buildStream(0, seeded())).toStrictEqual([])
      expect(buildStream(-5, seeded())).toStrictEqual([])
      expect(buildStream(Number.NaN, seeded())).toStrictEqual([])
   })
})

describe("gradeWord", () => {
   it("marks an exact match correct throughout", () => {
      expect(gradeWord("cat", "cat")).toStrictEqual(["correct", "correct", "correct"])
   })

   it("marks only the wrong character incorrect", () => {
      expect(gradeWord("cot", "cat")).toStrictEqual(["correct", "incorrect", "correct"])
   })

   it("leaves the untyped tail pending", () => {
      expect(gradeWord("ca", "cat")).toStrictEqual(["correct", "correct", "pending"])
   })

   it("reports an untouched word as entirely pending", () => {
      expect(gradeWord("", "cat")).toStrictEqual(["pending", "pending", "pending"])
   })

   it("hands back the surplus of an overshoot rather than dropping it", () => {
      // Showing the extra characters is what makes an overshoot obvious
      // enough to correct.
      expect(gradeWord("cats", "cat")).toStrictEqual(["correct", "correct", "correct", "extra"])
   })

   it("counts an astral character once, not twice", () => {
      // Split by code point, the same way `analyseText` counts characters —
      // a pasted emoji is one wrong character, not two.
      expect(gradeWord("😀", "a")).toStrictEqual(["incorrect"])
   })
})

describe("tallyWord", () => {
   it("counts correct characters and keystrokes apart", () => {
      expect(tallyWord("cot", "cat")).toStrictEqual({ correct: 2, typed: 3 })
   })

   it("charges nothing for characters never typed", () => {
      expect(tallyWord("ca", "cat")).toStrictEqual({ correct: 2, typed: 2 })
   })

   it("counts an overshoot's surplus as typed but not as correct", () => {
      expect(tallyWord("cats", "cat")).toStrictEqual({ correct: 3, typed: 4 })
   })
})

describe("computeResult", () => {
   it("scores five characters as one word", () => {
      const result = computeResult({
         correctCharacters: 250,
         typedCharacters: 260,
         elapsedMs: 60_000,
      })

      expect(result.wpm).toBe(50)
      expect(result.rawWpm).toBe(52)
      expect(result.accuracy).toBe(96)
   })

   it("scales a part-minute run up to a per-minute rate", () => {
      const result = computeResult({
         correctCharacters: 125,
         typedCharacters: 125,
         elapsedMs: 30_000,
      })

      expect(result.wpm).toBe(50)
      expect(result.accuracy).toBe(100)
   })

   it("separates raw speed from the speed that counts", () => {
      const result = computeResult({
         correctCharacters: 200,
         typedCharacters: 300,
         elapsedMs: 60_000,
      })

      // The gap between the two is what the mistakes cost.
      expect(result.rawWpm).toBeGreaterThan(result.wpm)
      expect(result.accuracy).toBe(67)
   })

   it("reports an untouched run as zero rather than as perfect", () => {
      const result = computeResult({
         correctCharacters: 0,
         typedCharacters: 0,
         elapsedMs: 30_000,
      })

      // Nothing typed has demonstrated no accuracy, not full accuracy.
      expect(result).toStrictEqual({ wpm: 0, rawWpm: 0, accuracy: 0 })
   })

   it("refuses to divide by a zero or negative clock", () => {
      expect(computeResult({ correctCharacters: 50, typedCharacters: 50, elapsedMs: 0 }))
         .toStrictEqual({ wpm: 0, rawWpm: 0, accuracy: 0 })
      expect(computeResult({ correctCharacters: 50, typedCharacters: 50, elapsedMs: -1 }))
         .toStrictEqual({ wpm: 0, rawWpm: 0, accuracy: 0 })
   })

   it("survives a non-finite tally", () => {
      expect(computeResult({
         correctCharacters: Number.NaN,
         typedCharacters: 10,
         elapsedMs: 1000,
      })).toStrictEqual({ wpm: 0, rawWpm: 0, accuracy: 0 })
   })

   it("keeps a plausible run under the storage ceiling", () => {
      // 150 wpm sustained is a fast but real typist, and has to be storable.
      const result = computeResult({
         correctCharacters: 750,
         typedCharacters: 750,
         elapsedMs: 60_000,
      })

      expect(result.wpm).toBe(150)
      expect(result.wpm).toBeLessThan(MAX_PLAUSIBLE_WPM)
   })
})
