import { describe, expect, it } from "vitest"
// Relative, not aliased: `~` is a Nuxt convenience that exists only inside
// the Nuxt/Vite environment, and these tests run in plain Node.
import {
   buildStream,
   computeResult,
   DEFAULT_DIFFICULTY,
   DEFAULT_DURATION,
   DEFAULT_STREAM_OPTIONS,
   DEFAULT_TOPIC,
   DIFFICULTIES,
   gradeWord,
   isDifficulty,
   isTestDuration,
   isTopic,
   MAX_PLAUSIBLE_WPM,
   MIN_POOL,
   poolFor,
   tallyWord,
   TEST_DURATIONS,
   TOPICS,
   WORD_BANK,
   WORD_BANKS,
   type StreamOptions,
} from "../../app/utils/typing"

/** The default options with one or two fields swapped, for readability below. */
const options = (overrides: Partial<StreamOptions> = {}): StreamOptions => ({
   ...DEFAULT_STREAM_OPTIONS,
   ...overrides,
})

describe("WORD_BANKS", () => {
   it("holds only plain lowercase words", () => {
      // Capitals, digits and punctuation are added by `buildStream`, and only
      // when the reader asks for them. A bank that carried them already would
      // make that choice for everyone.
      for (const topic of TOPICS) {
         for (const word of WORD_BANKS[topic]) {
            expect(word, `${word} in ${topic} is not plain lowercase`).toMatch(/^[a-z]+$/)
         }
      }
   })

   it("repeats no word within a bank", () => {
      for (const topic of TOPICS) {
         const bank = WORD_BANKS[topic]

         expect(new Set(bank).size, `${topic} repeats a word`).toBe(bank.length)
      }
   })

   it("offers every topic it advertises", () => {
      for (const topic of TOPICS) {
         expect(WORD_BANKS[topic].length, `${topic} is empty`).toBeGreaterThan(0)
      }
   })

   it("defaults to the common bank", () => {
      expect(WORD_BANK).toBe(WORD_BANKS[DEFAULT_TOPIC])
   })

   it("is large enough that a run does not exhaust the default bank", () => {
      // A 120-second run at 100 wpm is about 200 words, so a smaller bank
      // would start cycling within a single test.
      expect(WORD_BANK.length).toBeGreaterThanOrEqual(200)
   })

   it("recognises the topics it offers and nothing else", () => {
      expect(isTopic(DEFAULT_TOPIC)).toBe(true)
      expect(isTopic("klingon")).toBe(false)
   })
})

describe("poolFor", () => {
   it("keeps every tier of every topic above the repetition floor", () => {
      // Under MIN_POOL the same words come round inside a single run, which
      // is the point at which a stream stops reading like written text.
      for (const topic of TOPICS) {
         for (const difficulty of DIFFICULTIES) {
            expect(
               poolFor(topic, difficulty).length,
               `${topic}/${difficulty} is too thin`,
            ).toBeGreaterThanOrEqual(MIN_POOL)
         }
      }
   })

   it("draws short words for easy and long ones for hard", () => {
      for (const topic of TOPICS) {
         for (const word of poolFor(topic, "easy")) {
            expect(word.length, `${word} is long for easy`).toBeLessThanOrEqual(5)
         }

         for (const word of poolFor(topic, "hard")) {
            expect(word.length, `${word} is short for hard`).toBeGreaterThanOrEqual(7)
         }
      }
   })

   it("hands the whole bank to medium", () => {
      expect(poolFor("common", "medium")).toStrictEqual([...WORD_BANKS.common])
   })

   it("gets harder as the difficulty rises", () => {
      const mean = (words: string[]): number =>
         words.reduce((total, word) => total + word.length, 0) / words.length

      expect(mean(poolFor("common", "hard"))).toBeGreaterThan(mean(poolFor("common", "medium")))
      expect(mean(poolFor("common", "medium"))).toBeGreaterThan(mean(poolFor("common", "easy")))
   })

   it("falls back rather than emptying on a topic it does not know", () => {
      // These values arrive from localStorage. A hand-edited key should cost
      // a different word list, not a blank screen.
      expect(poolFor("klingon" as never, "medium")).toStrictEqual([...WORD_BANKS.common])
      expect(poolFor("common", "brutal" as never)).toStrictEqual([...WORD_BANKS.common])
   })

   it("recognises the difficulties it offers and nothing else", () => {
      expect(isDifficulty(DEFAULT_DIFFICULTY)).toBe(true)
      expect(isDifficulty("brutal")).toBe(false)
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
      expect(buildStream(10, options(), seeded())).toHaveLength(10)
      expect(buildStream(500, options(), seeded())).toHaveLength(500)
   })

   it("is reproducible for a given source of randomness", () => {
      expect(buildStream(60, options(), seeded()))
         .toStrictEqual(buildStream(60, options(), seeded()))
      expect(buildStream(60, options({ difficulty: "hard", numbers: true }), seeded()))
         .toStrictEqual(buildStream(60, options({ difficulty: "hard", numbers: true }), seeded()))
   })

   it("draws only from the bank", () => {
      const bank = new Set(WORD_BANK)

      for (const word of buildStream(400, options(), seeded())) {
         expect(bank.has(word), `${word} is not in the bank`).toBe(true)
      }
   })

   it("draws from the topic it was asked for", () => {
      const bank = new Set(WORD_BANKS.programming)

      for (const word of buildStream(400, options({ topic: "programming" }), seeded())) {
         expect(bank.has(word), `${word} is not in the programming bank`).toBe(true)
      }
   })

   it("respects the difficulty it was asked for", () => {
      for (const word of buildStream(400, options({ difficulty: "easy" }), seeded())) {
         expect(word.length, `${word} is long for easy`).toBeLessThanOrEqual(5)
      }
   })

   it("never repeats a word back to back, including across bags", () => {
      // 500 words is more than two full bags, so this covers the seam where a
      // fresh shuffle could otherwise open with the word that closed the last.
      const stream = buildStream(500, options(), seeded())

      for (let i = 1; i < stream.length; i += 1) {
         expect(stream[i], `repeat at index ${i}`).not.toBe(stream[i - 1])
      }
   })

   it("uses the whole bank before reusing any of it", () => {
      const first = buildStream(WORD_BANK.length, options(), seeded())

      expect(new Set(first).size).toBe(WORD_BANK.length)
   })

   it("returns nothing for a non-positive or unusable count", () => {
      expect(buildStream(0, options(), seeded())).toStrictEqual([])
      expect(buildStream(-5, options(), seeded())).toStrictEqual([])
      expect(buildStream(Number.NaN, options(), seeded())).toStrictEqual([])
   })

   it("defaults to plain words from the common bank", () => {
      const bank = new Set(WORD_BANK)

      for (const word of buildStream(200, undefined, seeded())) {
         expect(bank.has(word), `${word} is not a plain common word`).toBe(true)
      }
   })
})

/// The mix is what turns a word list into something that reads like prose.
/// Every rule below exists because its absence was visible on screen.

describe("buildStream — the mix", () => {
   const seeded = (start = 1) => {
      let seed = start

      return () => {
         seed = (seed * 1103515245 + 12345) % 2147483648

         return seed / 2147483648
      }
   }

   /** A long stream, so a rate of a few per cent is reliably represented. */
   const stream = (overrides: Partial<StreamOptions>, start = 1): string[] =>
      buildStream(600, options(overrides), seeded(start))

   it("never puts a space inside a token", () => {
      // A space is the word boundary in `handleInput`, so a token holding one
      // would bank two words for a single keystroke.
      for (const topic of TOPICS) {
         for (const difficulty of DIFFICULTIES) {
            for (const word of stream({ topic, difficulty, numbers: true, punctuation: true })) {
               expect(word, `${word} contains whitespace`).not.toMatch(/\s/u)
               expect(word.length, "empty token").toBeGreaterThan(0)
            }
         }
      }
   })

   it("leaves the stream plain when nothing is mixed in", () => {
      for (const word of stream({ difficulty: "medium" })) {
         expect(word, `${word} is not plain lowercase`).toMatch(/^[a-z]+$/)
      }
   })

   it("drops numbers in only when asked", () => {
      const isNumber = (word: string): boolean => /^[\d.,]+$/u.test(word)

      expect(stream({ numbers: true }).some(isNumber)).toBe(true)
      expect(stream({ numbers: false }).some(isNumber)).toBe(false)
   })

   it("never puts two numbers back to back", () => {
      // Two numbers in a row read as a phone number rather than as prose.
      const tokens = stream({ numbers: true, difficulty: "hard" })
      const isNumber = (word: string | undefined): boolean => /^[\d.,]+$/u.test(word ?? "")

      for (let i = 1; i < tokens.length; i += 1) {
         expect(isNumber(tokens[i]) && isNumber(tokens[i - 1]), `pair at ${i}`).toBe(false)
      }
   })

   it("punctuates only when asked", () => {
      const isPunctuated = (word: string): boolean => /[^a-zA-Z]/u.test(word)

      expect(stream({ punctuation: true }).some(isPunctuated)).toBe(true)
      expect(stream({ punctuation: false, difficulty: "medium" }).some(isPunctuated)).toBe(false)
   })

   it("capitalises what follows a full stop", () => {
      const tokens = stream({ punctuation: true })
      let checked = 0

      for (let i = 1; i < tokens.length; i += 1) {
         const previous = tokens[i - 1] ?? ""
         const word = tokens[i] ?? ""

         if (!/[.!?]["')]*$/u.test(previous) || !/^[a-zA-Z]/u.test(word)) continue

         expect(word[0], `${previous} ${word}`).toBe(word[0]?.toUpperCase())
         checked += 1
      }

      expect(checked, "no sentence to check").toBeGreaterThan(0)
   })

   it("capitalises on hard even with no punctuation asked for", () => {
      // Difficulty is the one setting allowed to change the shape of a word
      // rather than only which words are drawn.
      expect(stream({ difficulty: "hard" }).some((word) => /^[A-Z]/u.test(word))).toBe(true)
      expect(stream({ difficulty: "medium" }).some((word) => /^[A-Z]/u.test(word))).toBe(false)
   })

   it("mixes more in as the difficulty rises", () => {
      const share = (difficulty: StreamOptions["difficulty"]): number => {
         const tokens = stream({ difficulty, numbers: true, punctuation: true })

         return tokens.filter((word) => /[^a-z]/u.test(word)).length / tokens.length
      }

      expect(share("hard")).toBeGreaterThan(share("easy"))
   })

   it("still grades a decorated word one character at a time", () => {
      // The mix changes what is on screen, not how it is scored — nothing
      // downstream of here knows a comma from a letter.
      expect(gradeWord("word,", "word,")).toStrictEqual(
         ["correct", "correct", "correct", "correct", "correct"],
      )
      expect(tallyWord("42", "42")).toStrictEqual({ correct: 2, typed: 2 })
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
