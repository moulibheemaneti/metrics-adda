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

/** Every length statistic the word counter reports, in one pass. */
export function analyseText(input: string): TextStats {
   if (input === "") return { ...EMPTY_STATS }

   const words = countWords(input)

   return {
      characters: [...input].length,
      charactersNoSpaces: [...input.replace(/\s/gu, "")].length,
      words,
      sentences: countSentences(input),
      // A blank line separates paragraphs; runs of them collapse rather
      // than inventing empty paragraphs between.
      paragraphs: input.split(/\n\s*\n/).filter((part) => part.trim() !== "").length,
      lines: input.split(/\r\n|\r|\n/).length,
      readingTimeSeconds: (words / READING_WORDS_PER_MINUTE) * 60,
      speakingTimeSeconds: (words / SPEAKING_WORDS_PER_MINUTE) * 60,
   }
}
