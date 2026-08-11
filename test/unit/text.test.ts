import { describe, expect, it } from "vitest"
// Relative, not aliased: `~` is a Nuxt convenience that exists only inside
// the Nuxt/Vite environment, and these tests run in plain Node.
import {
   analyseText,
   clampSpeed,
   DEFAULT_SPEEDS,
   READING_SPEED_MAX,
   READING_SPEED_MIN,
   READING_WORDS_PER_MINUTE,
   SPEAKING_WORDS_PER_MINUTE,
} from "../../app/utils/text"

describe("analyseText — words", () => {
   it("counts plain words", () => {
      expect(analyseText("the quick brown fox").words).toBe(4)
   })

   it("ignores punctuation between words", () => {
      expect(analyseText("Hello, world!").words).toBe(2)
   })

   it("treats a contraction as one word", () => {
      expect(analyseText("don't stop").words).toBe(2)
   })

   it("collapses runs of whitespace", () => {
      expect(analyseText("one    two\t\tthree\n\nfour").words).toBe(4)
   })

   it("ignores leading and trailing whitespace", () => {
      expect(analyseText("   spaced   ").words).toBe(1)
   })

   it("counts nothing in a whitespace-only string", () => {
      expect(analyseText("   \n  ").words).toBe(0)
   })

   it("counts numbers as words", () => {
      expect(analyseText("about 42 items").words).toBe(3)
   })

   /// Guards a cross-engine trap: JavaScriptCore (Safari, Bun) reports
   /// `isWordLike: false` for numeric segments where V8 (Chrome, Node)
   /// reports `true`. Counting on that flag would hand Safari users a
   /// different word count from Chrome users.
   it("counts a decimal as one word", () => {
      expect(analyseText("3.5 kg").words).toBe(2)
   })

   it("counts a number on its own", () => {
      expect(analyseText("2026").words).toBe(1)
   })
})

/// The reason for using Intl.Segmenter rather than splitting on
/// whitespace: scripts that do not space their words.

describe("analyseText — segmentation", () => {
   it("counts words in text without spaces between them", () => {
      // Four words, zero spaces. A whitespace split would score 1.
      expect(analyseText("我喜欢吃苹果").words).toBeGreaterThan(1)
   })
})

describe("analyseText — characters", () => {
   it("counts characters including spaces", () => {
      expect(analyseText("hello world").characters).toBe(11)
   })

   it("counts characters excluding whitespace", () => {
      expect(analyseText("hello world").charactersNoSpaces).toBe(10)
   })

   it("excludes tabs and newlines, not just spaces", () => {
      expect(analyseText("a\tb\nc").charactersNoSpaces).toBe(3)
   })

   it("counts an emoji as a single character", () => {
      // "👋" is one code point but two UTF-16 units, so `.length` says 2.
      expect(analyseText("👋").characters).toBe(1)
   })
})

describe("analyseText — structure", () => {
   it("counts sentences", () => {
      expect(analyseText("One. Two! Three?").sentences).toBe(3)
   })

   it("counts a fragment without punctuation as a sentence", () => {
      expect(analyseText("no full stop here").sentences).toBe(1)
   })

   it("counts paragraphs split by a blank line", () => {
      expect(analyseText("First para.\n\nSecond para.").paragraphs).toBe(2)
   })

   it("does not invent paragraphs from runs of blank lines", () => {
      expect(analyseText("First.\n\n\n\nSecond.").paragraphs).toBe(2)
   })

   it("counts every line, including ones inside a paragraph", () => {
      expect(analyseText("one\ntwo\nthree").lines).toBe(3)
   })

   it("handles Windows line endings", () => {
      expect(analyseText("one\r\ntwo").lines).toBe(2)
   })
})

describe("analyseText — timings", () => {
   it("derives reading time from the word count", () => {
      const words = READING_WORDS_PER_MINUTE
      const stats = analyseText(Array.from({ length: words }, () => "word").join(" "))

      expect(stats.words).toBe(words)
      expect(stats.readingTimeSeconds).toBeCloseTo(60, 6)
   })

   it("reports speaking time as slower than reading time", () => {
      const stats = analyseText("one two three four five")

      expect(stats.speakingTimeSeconds).toBeGreaterThan(stats.readingTimeSeconds)
   })
})

describe("analyseText — custom speeds", () => {
   const sentence = "one two three four five"

   it("uses the recommended speeds when none are given", () => {
      expect(analyseText(sentence)).toEqual(analyseText(sentence, DEFAULT_SPEEDS))
   })

   it("halves reading time when the reading speed doubles", () => {
      const recommended = analyseText(sentence)
      const faster = analyseText(sentence, {
         reading: READING_WORDS_PER_MINUTE * 2,
         speaking: SPEAKING_WORDS_PER_MINUTE,
      })

      expect(faster.readingTimeSeconds).toBeCloseTo(recommended.readingTimeSeconds / 2, 6)
   })

   it("leaves speaking time alone when only the reading speed changes", () => {
      const recommended = analyseText(sentence)
      const faster = analyseText(sentence, { reading: 476, speaking: SPEAKING_WORDS_PER_MINUTE })

      expect(faster.speakingTimeSeconds).toBe(recommended.speakingTimeSeconds)
   })

   it("clamps a speed below the floor rather than dividing by it", () => {
      // Zero would give Infinity seconds, which `formatDuration` prints as
      // "0 sec" — the exact opposite of what it means.
      const stats = analyseText(sentence, { reading: 0, speaking: 0 })

      expect(Number.isFinite(stats.readingTimeSeconds)).toBe(true)
      expect(Number.isFinite(stats.speakingTimeSeconds)).toBe(true)
   })

   it("leaves the counts untouched whatever the speeds are", () => {
      const stats = analyseText(sentence, { reading: 800, speaking: 300 })

      expect(stats.words).toBe(5)
      expect(stats.characters).toBe(23)
   })
})

describe("clampSpeed", () => {
   it("holds a value inside the range", () => {
      expect(clampSpeed(300, READING_SPEED_MIN, READING_SPEED_MAX)).toBe(300)
      expect(clampSpeed(9000, READING_SPEED_MIN, READING_SPEED_MAX)).toBe(READING_SPEED_MAX)
      expect(clampSpeed(-5, READING_SPEED_MIN, READING_SPEED_MAX)).toBe(READING_SPEED_MIN)
   })

   it("rounds a fractional speed to a whole word per minute", () => {
      expect(clampSpeed(238.6, READING_SPEED_MIN, READING_SPEED_MAX)).toBe(239)
   })

   it("falls back to the floor for a value that is not a number", () => {
      expect(clampSpeed(Number.NaN, READING_SPEED_MIN, READING_SPEED_MAX)).toBe(READING_SPEED_MIN)
   })
})

describe("analyseText — empty input", () => {
   it("returns zero for every statistic", () => {
      expect(analyseText("")).toEqual({
         characters: 0,
         charactersNoSpaces: 0,
         words: 0,
         sentences: 0,
         paragraphs: 0,
         lines: 0,
         readingTimeSeconds: 0,
         speakingTimeSeconds: 0,
      })
   })
})
