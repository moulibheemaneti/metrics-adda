/// --------------------------------------------------
/// utils/typing.ts
/// --------------------------------------------------
/// The maths behind the typing speed test.
///
/// Everything here is pure: a word bank, a shuffle that takes its randomness
/// as an argument, per-character grading, and the words-per-minute figures.
/// The composable owns the timer and the keystrokes; this file owns anything
/// a test can assert without mounting a component.
///
/// The unit of speed is deliberately the character, not the word. "Words per
/// minute" has meant *five characters* per minute since typewriter-era
/// standards, because scoring whole words would make "a an the" worth as much
/// as "extraordinary distinguished" — the same figure for a fifth of the work.
///
/// Auto-imported by Nuxt. Tests import it relatively (see test/unit).
/// --------------------------------------------------

/**
 * The bank the test draws from: common English words, lowercase, no
 * punctuation.
 *
 * Deliberately plain. Capitals and punctuation measure how well someone
 * reaches for a shift key, which is a different skill from typing speed and
 * one that varies by keyboard layout — so a score would stop being comparable
 * between two people on different hardware.
 */
export const WORD_BANK: readonly string[] = [
   "the", "of", "and", "to", "in", "is", "you", "that", "it", "he",
   "was", "for", "on", "are", "as", "with", "his", "they", "at", "be",
   "this", "have", "from", "or", "one", "had", "by", "word", "but", "not",
   "what", "all", "were", "we", "when", "your", "can", "said", "there", "use",
   "an", "each", "which", "she", "do", "how", "their", "if", "will", "up",
   "other", "about", "out", "many", "then", "them", "these", "so", "some", "her",
   "would", "make", "like", "him", "into", "time", "has", "look", "two", "more",
   "write", "go", "see", "number", "no", "way", "could", "people", "my", "than",
   "first", "water", "been", "call", "who", "oil", "its", "now", "find", "long",
   "down", "day", "did", "get", "come", "made", "may", "part", "over", "new",
   "sound", "take", "only", "little", "work", "know", "place", "year", "live", "me",
   "back", "give", "most", "very", "after", "thing", "our", "just", "name", "good",
   "sentence", "man", "think", "say", "great", "where", "help", "through", "much", "before",
   "line", "right", "too", "mean", "old", "any", "same", "tell", "boy", "follow",
   "came", "want", "show", "also", "around", "form", "three", "small", "set", "put",
   "end", "does", "another", "well", "large", "must", "big", "even", "such", "because",
   "turn", "here", "why", "ask", "went", "men", "read", "need", "land", "different",
   "home", "move", "try", "kind", "hand", "picture", "again", "change", "off", "play",
   "spell", "air", "away", "animal", "house", "point", "page", "letter", "mother", "answer",
   "found", "study", "still", "learn", "should", "world", "high", "every", "near", "add",
]

/** The lengths the test offers, in seconds. */
export const TEST_DURATIONS = [15, 30, 60, 120] as const

export type TestDuration = typeof TEST_DURATIONS[number]

/**
 * Long enough to absorb a stumble, short enough that nobody has to commit an
 * afternoon to a first attempt.
 */
export const DEFAULT_DURATION: TestDuration = 30

/** The typewriter-standard word length that turns characters into "words". */
export const CHARACTERS_PER_WORD = 5

/**
 * The ceiling a stored personal best has to sit under to be believed.
 *
 * The verified human record is a little over 200 wpm sustained. Anything past
 * 400 is a corrupt write or a hand-edited storage key rather than a person,
 * and — following `useReadingSpeeds` — an implausible stored value is thrown
 * away rather than clamped, so a bad write cannot masquerade as a real score.
 */
export const MAX_PLAUSIBLE_WPM = 400

/** Narrow an arbitrary number to one of the offered durations. */
export function isTestDuration(value: number): value is TestDuration {
   return (TEST_DURATIONS as readonly number[]).includes(value)
}

/**
 * Fisher–Yates, in place, over a copy the caller already owns.
 *
 * `random` is a parameter rather than a direct `Math.random` call so the tests
 * can hand it a counter and assert on an exact sequence.
 */
function shuffle(words: string[], random: () => number): string[] {
   for (let i = words.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1))
      const swap = words[i] as string

      words[i] = words[j] as string
      words[j] = swap
   }

   return words
}

/**
 * Draw `count` words for the stream.
 *
 * Shuffled bags rather than independent random picks: picking each word
 * independently repeats one every few words at this bank size, and a repeat is
 * the one thing that makes a stream look generated rather than written. A bag
 * guarantees all 200 are used before any is used twice.
 *
 * The seam between two bags is the one place a repeat can still happen — the
 * last word of one bag and the first of the next — so it is checked for and
 * swapped past.
 */
export function buildStream(count: number, random: () => number = Math.random): string[] {
   if (!Number.isFinite(count) || count <= 0) return []

   const stream: string[] = []

   while (stream.length < count) {
      const bag = shuffle([...WORD_BANK], random)
      const previous = stream.at(-1)

      // Swap the seam repeat with the word after it. The bag holds 200 words,
      // so index 1 always exists.
      if (previous !== undefined && bag[0] === previous) {
         bag[0] = bag[1] as string
         bag[1] = previous
      }

      stream.push(...bag)
   }

   return stream.slice(0, Math.floor(count))
}

/** How one typed character compares with the character it was aimed at. */
export type CharState = "pending" | "correct" | "incorrect" | "extra"

/**
 * Grade a word that is being — or has been — typed.
 *
 * The returned array is as long as the longer of the two strings, so a reader
 * who overshoots gets their surplus characters back as `"extra"` rather than
 * having them silently dropped. Showing them is what makes the overshoot
 * obvious enough to correct.
 *
 * Split by code point, not by UTF-16 unit, so a pasted emoji is one wrong
 * character rather than two — the same reason `analyseText` counts characters
 * with a spread.
 */
export function gradeWord(typed: string, target: string): CharState[] {
   const typedChars = [...typed]
   const targetChars = [...target]
   const states: CharState[] = []

   for (let i = 0; i < Math.max(typedChars.length, targetChars.length); i += 1) {
      if (i >= typedChars.length) {
         states.push("pending")

         continue
      }

      if (i >= targetChars.length) {
         states.push("extra")

         continue
      }

      states.push(typedChars[i] === targetChars[i] ? "correct" : "incorrect")
   }

   return states
}

export interface WordTally {
   /** Characters typed in the right place with the right value. */
   correct: number
   /** Characters typed at all, surplus ones included. */
   typed: number
}

/**
 * Count a word's keystrokes for the running totals.
 *
 * Untyped characters are not counted as anything: a word left half-finished
 * when the clock runs out should cost its author nothing beyond the speed they
 * already failed to gain from it.
 */
export function tallyWord(typed: string, target: string): WordTally {
   const states = gradeWord(typed, target)

   return {
      correct: states.filter((state) => state === "correct").length,
      typed: [...typed].length,
   }
}

export interface TypingTally {
   /** Correct characters across every word, plus the spaces between them. */
   correctCharacters: number
   /** Every character typed, right or wrong. */
   typedCharacters: number
   /** Real milliseconds the run took. */
   elapsedMs: number
}

export interface TypingResult {
   /** Correct characters only — the figure worth quoting. */
   wpm: number
   /** Everything typed, mistakes included. The gap between the two is cost. */
   rawWpm: number
   /** Correct share of all keystrokes, 0–100. */
   accuracy: number
}

const EMPTY_RESULT: TypingResult = { wpm: 0, rawWpm: 0, accuracy: 0 }

/**
 * Turn the running totals into the three figures the results show.
 *
 * Measured against real elapsed milliseconds rather than the nominal duration:
 * the run is finalised by a timer that can be a fraction late, and dividing by
 * the length the test was *meant* to be would quietly inflate every score by
 * that fraction.
 */
export function computeResult(tally: TypingTally): TypingResult {
   const { correctCharacters, typedCharacters, elapsedMs } = tally

   if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return { ...EMPTY_RESULT }
   if (!Number.isFinite(correctCharacters) || !Number.isFinite(typedCharacters)) {
      return { ...EMPTY_RESULT }
   }

   const minutes = elapsedMs / 60_000

   return {
      wpm: Math.round(correctCharacters / CHARACTERS_PER_WORD / minutes),
      rawWpm: Math.round(typedCharacters / CHARACTERS_PER_WORD / minutes),
      // Nothing typed is 0%, not 100%: an untouched run has demonstrated no
      // accuracy rather than perfect accuracy.
      accuracy: typedCharacters === 0
         ? 0
         : Math.round((correctCharacters / typedCharacters) * 100),
   }
}
