/// --------------------------------------------------
/// utils/text.ts
/// --------------------------------------------------
/// Length statistics for the word counter.
///
/// Words and sentences go through `Intl.Segmenter` rather than a
/// whitespace split. The naive `split(/\s+/)` is wrong in ways people
/// notice: it counts "don't" and "state-of-the-art" correctly by luck, but
/// scores an entire Chinese or Japanese sentence as one word, since those
/// scripts do not separate words with spaces. The segmenter applies the
/// Unicode text-segmentation rules instead.
///
/// Auto-imported by Nuxt. Tests import it relatively (see test/unit).
/// --------------------------------------------------

/**
 * A segment counts as a word if it contains a letter or a digit.
 *
 * Deliberately *not* `segment.isWordLike`: engines disagree about it.
 * JavaScriptCore (Safari, Bun) reports `isWordLike: false` for numeric
 * segments like "42" and "3.5", while V8 (Chrome, Node) reports `true` —
 * so keying on the flag would give Safari users a different word count
 * from Chrome users for any text containing numbers. The segment
 * *boundaries* agree across engines; only the flag does not, so this uses
 * the segmenter for splitting and decides word-ness here.
 */
const WORD_CHARACTER = /[\p{L}\p{N}]/u

/** Average adult silent-reading speed, words per minute. */
export const READING_WORDS_PER_MINUTE = 238

/** Average speaking pace for presentations, words per minute. */
export const SPEAKING_WORDS_PER_MINUTE = 150

/**
 * The range the word counter's speed sliders run between.
 *
 * Reading stops at 800 rather than the four figures a speed-reading course
 * advertises: past that the estimate stops describing comprehension.
 * Speaking starts at 80 — a deliberate, pausing delivery — and ends at 300,
 * beyond which a listener has stopped following.
 */
export const READING_SPEED_MIN = 100
export const READING_SPEED_MAX = 800
export const SPEAKING_SPEED_MIN = 80
export const SPEAKING_SPEED_MAX = 300

/** Both sliders move a word per minute at a time. */
export const SPEED_STEP = 1

export interface TextSpeeds {
   /** Silent-reading pace, words per minute. */
   reading: number
   /** Spoken pace, words per minute. */
   speaking: number
}

/** The recommended pair — the figures every visitor starts from. */
export const DEFAULT_SPEEDS: TextSpeeds = {
   reading: READING_WORDS_PER_MINUTE,
   speaking: SPEAKING_WORDS_PER_MINUTE,
}

/**
 * Hold a speed inside its slider's range.
 *
 * Exported because two callers need it: the composable clamps on the way
 * in from storage, and `analyseText` clamps on the way in from a caller. A
 * zero or negative speed would otherwise divide into `Infinity`, which
 * `formatDuration` prints as "0s" — the exact opposite of what it means.
 */
export function clampSpeed(value: number, min: number, max: number): number {
   if (!Number.isFinite(value)) return min

   return Math.min(Math.max(Math.round(value), min), max)
}

export interface TextStats {
   /** Unicode code points, so an emoji counts once rather than twice. */
   characters: number
   charactersNoSpaces: number
   words: number
   sentences: number
   paragraphs: number
   lines: number
   readingTimeSeconds: number
   speakingTimeSeconds: number
}

const EMPTY_STATS: TextStats = {
   characters: 0,
   charactersNoSpaces: 0,
   words: 0,
   sentences: 0,
   paragraphs: 0,
   lines: 0,
   readingTimeSeconds: 0,
   speakingTimeSeconds: 0,
}

/**
 * Count words using Unicode segmentation, falling back to a whitespace
 * split where `Intl.Segmenter` is unavailable. The fallback is less
 * accurate for scripts without word spacing, but it is better than
 * throwing on an older engine.
 */
function countWords(input: string): number {
   if (typeof Intl.Segmenter !== "function") {
      const trimmed = input.trim()

      return trimmed === "" ? 0 : trimmed.split(/\s+/).length
   }

   const segmenter = new Intl.Segmenter("en", { granularity: "word" })
   let words = 0

   for (const segment of segmenter.segment(input)) {
      // Skips the whitespace and punctuation segments the iterator also
      // yields, so "Hello, world!" scores 2 rather than 4.
      if (WORD_CHARACTER.test(segment.segment)) words += 1
   }

   return words
}

/**
 * Count sentences. A trailing fragment with no terminating punctuation
 * still counts — "hello" is one sentence, not zero.
 */
function countSentences(input: string): number {
   if (typeof Intl.Segmenter !== "function") {
      return input.split(/[.!?]+(?:\s|$)/).filter((part) => part.trim() !== "").length
   }

   const segmenter = new Intl.Segmenter("en", { granularity: "sentence" })
   let sentences = 0

   for (const segment of segmenter.segment(input)) {
      if (segment.segment.trim() !== "") sentences += 1
   }

   return sentences
}

/**
 * Every length statistic the word counter reports, in one pass.
 *
 * `speeds` is optional rather than required — unlike `generatePassword`,
 * which takes its options outright — because the two timings are the only
 * part of the result that depends on it, and a caller after nothing but
 * counts should not have to know the words-per-minute figures exist.
 */
export function analyseText(input: string, speeds: TextSpeeds = DEFAULT_SPEEDS): TextStats {
   if (input === "") return { ...EMPTY_STATS }

   const words = countWords(input)
   const reading = clampSpeed(speeds.reading, READING_SPEED_MIN, READING_SPEED_MAX)
   const speaking = clampSpeed(speeds.speaking, SPEAKING_SPEED_MIN, SPEAKING_SPEED_MAX)

   return {
      characters: [...input].length,
      charactersNoSpaces: [...input.replace(/\s/gu, "")].length,
      words,
      sentences: countSentences(input),
      // A blank line separates paragraphs; runs of them collapse rather
      // than inventing empty paragraphs between.
      paragraphs: input.split(/\n\s*\n/).filter((part) => part.trim() !== "").length,
      lines: input.split(/\r\n|\r|\n/).length,
      readingTimeSeconds: (words / reading) * 60,
      speakingTimeSeconds: (words / speaking) * 60,
   }
}
