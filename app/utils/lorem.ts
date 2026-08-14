/// --------------------------------------------------
/// utils/lorem.ts
/// --------------------------------------------------
/// Placeholder text generation for the lorem ipsum generator.
///
/// Generation is *seeded* rather than drawn from `Math.random()`, and that
/// is the one decision here worth explaining. A panel that randomised on
/// every call would produce different text on the server and on the client,
/// so Vue would report a hydration mismatch and replace the server-rendered
/// paragraphs after load. Seeding makes a given seed produce a given
/// passage everywhere — the page server-renders real text a crawler can
/// read, hydration agrees with it, and "Regenerate" simply advances the
/// seed on the client.
///
/// It also makes the module testable without stubbing globals: the same
/// seed must always give the same passage, which is a plain equality
/// assertion rather than a mock.
///
/// The password generator deliberately does the opposite (client-only, from
/// the CSPRNG) because a cached password would be a security bug. Placeholder
/// text carries no such risk, so it can afford to be deterministic.
///
/// Auto-imported by Nuxt. Tests import it relatively (see test/unit).
/// --------------------------------------------------

/** What `count` counts. */
export const LOREM_UNITS = ["paragraphs", "sentences", "words"] as const

export type LoremUnit = typeof LOREM_UNITS[number]

/**
 * Per-unit bounds, and the count each starts on.
 *
 * The maximums are what a placeholder is plausibly for rather than what the
 * generator can survive: 25 paragraphs already overflows any layout being
 * mocked up, and the limit is what stops a stray keystroke in the number
 * field from building a megabyte of text synchronously.
 */
export const LOREM_LIMITS: Record<LoremUnit, { min: number, max: number, initial: number }> = {
   paragraphs: { min: 1, max: 25, initial: 3 },
   sentences: { min: 1, max: 50, initial: 5 },
   words: { min: 1, max: 500, initial: 50 },
}

export const DEFAULT_LOREM_UNIT: LoremUnit = "paragraphs"

export interface LoremOptions {
   unit: LoremUnit
   count: number
   /** Open with the canonical "Lorem ipsum dolor sit amet…" phrase. */
   startWithLorem: boolean
}

/**
 * The standard Cicero-derived word bank, deduplicated and lower-cased.
 *
 * Same shape as `WORD_BANKS` in `utils/typing.ts` — a flat readonly array
 * of lowercase words, with capitalisation and punctuation applied at
 * assembly time rather than stored.
 */
export const LOREM_WORDS: readonly string[] = [
   "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
   "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
   "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud",
   "exercitation", "ullamco", "laboris", "nisi", "aliquip", "ex", "ea", "commodo",
   "consequat", "duis", "aute", "irure", "in", "reprehenderit", "voluptate",
   "velit", "esse", "cillum", "eu", "fugiat", "nulla", "pariatur", "excepteur",
   "sint", "occaecat", "cupidatat", "non", "proident", "sunt", "culpa", "qui",
   "officia", "deserunt", "mollit", "anim", "id", "est", "laborum", "at", "vero",
   "eos", "accusamus", "iusto", "odio", "dignissimos", "ducimus", "blanditiis",
   "praesentium", "voluptatum", "deleniti", "atque", "corrupti", "quos", "dolores",
   "quas", "molestias", "excepturi", "occaecati", "provident", "similique",
   "mollitia", "animi", "dolorum", "fuga", "harum", "quidem", "rerum", "facilis",
   "expedita", "distinctio", "nam", "libero", "tempore", "cum", "soluta", "nobis",
   "eligendi", "optio", "cumque", "nihil", "impedit", "quo", "minus", "quod",
   "maxime", "placeat", "facere", "possimus", "omnis", "voluptas", "assumenda",
   "repellendus", "temporibus", "autem", "quibusdam", "officiis", "debitis",
   "necessitatibus", "saepe", "eveniet", "voluptates", "repudiandae", "recusandae",
   "itaque", "earum", "hic", "tenetur", "sapiente", "delectus", "reiciendis",
   "voluptatibus", "maiores", "alias", "perferendis", "doloribus", "asperiores",
   "repellat", "totam", "aperiam", "eaque", "ipsa", "quae", "illo", "inventore",
   "veritatis", "quasi", "architecto", "beatae", "vitae", "dicta", "explicabo",
   "aspernatur", "odit", "fugit", "consequuntur", "magni", "ratione", "sequi",
   "neque", "porro", "quisquam", "dolorem", "adipisci", "numquam", "modi",
   "tempora", "incidunt", "magnam", "quaerat", "ullam", "corporis", "suscipit",
   "laboriosam", "aliquid", "commodi", "consequatur", "vel", "eum",
]

/** The canonical opening, as words. */
export const LOREM_OPENING: readonly string[] = [
   "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
]

/**
 * Where the comma falls in the canonical phrase — after "amet".
 *
 * Hard-coded rather than left to the random comma below, because this one
 * sentence is the one everybody recognises: "Lorem ipsum dolor sit amet,
 * consectetur adipiscing elit" is how it is always written, and a version
 * with the comma somewhere else reads as a mistake.
 */
const LOREM_OPENING_COMMA = 4

const MIN_SENTENCE_WORDS = 6
const MAX_SENTENCE_WORDS = 16
const MIN_PARAGRAPH_SENTENCES = 3
const MAX_PARAGRAPH_SENTENCES = 6

/**
 * mulberry32 — a 32-bit PRNG in four lines, chosen because it needs no
 * dependency and no state beyond a single integer.
 *
 * This is not cryptographic and must not be reused for anything that needs
 * unpredictability; `utils/password.ts` is where that requirement lives.
 */
function mulberry32(seed: number): () => number {
   let state = seed >>> 0

   return () => {
      state = (state + 0x6D2B79F5) >>> 0

      let t = state

      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

      return ((t ^ (t >>> 14)) >>> 0) / 0x1_0000_0000
   }
}

/** An integer in `[min, max]`, inclusive at both ends. */
function randomInt(random: () => number, min: number, max: number): number {
   return min + Math.floor(random() * (max - min + 1))
}

function randomWord(random: () => number): string {
   return LOREM_WORDS[randomInt(random, 0, LOREM_WORDS.length - 1)] ?? "lorem"
}

/**
 * Clamp a count into its unit's range.
 *
 * Exported because the panel needs the same rule the generator applies —
 * a number input can hold anything a keyboard can type, including an empty
 * string, and both ends have to agree on what that becomes.
 */
export function clampCount(unit: LoremUnit, count: number): number {
   const { min, max } = LOREM_LIMITS[unit]

   // Only `NaN` needs the guard — it is what an emptied number input gives,
   // and it would pass straight through `Math.min`/`Math.max` unchanged.
   // The infinities are genuinely out of range and clamp on their own.
   if (Number.isNaN(count)) return min

   return Math.min(Math.max(Math.trunc(count), min), max)
}

/**
 * One sentence's worth of words, already lower-case and unpunctuated.
 *
 * `opening` is spliced in at the front when the caller wants the canonical
 * phrase; the sentence is then topped up to its full length so the first
 * sentence is not conspicuously shorter than the rest.
 */
function sentenceWords(random: () => number, opening: readonly string[]): string[] {
   const target = Math.max(randomInt(random, MIN_SENTENCE_WORDS, MAX_SENTENCE_WORDS), opening.length)
   const words = [...opening]

   while (words.length < target) {
      words.push(randomWord(random))
   }

   return words
}

/**
 * Assemble one sentence: capitalised, comma'd, full-stopped.
 *
 * The comma lands strictly inside the sentence — never after the last word,
 * where it would read as a typo rather than as a clause break.
 */
function buildSentence(random: () => number, opening: readonly string[] = []): string {
   const words = sentenceWords(random, opening)

   if (opening.length > 0) {
      const word = words[LOREM_OPENING_COMMA]

      if (word !== undefined) words[LOREM_OPENING_COMMA] = `${word},`
   }
   else if (words.length > MIN_SENTENCE_WORDS && random() < 0.45) {
      const position = randomInt(random, 2, words.length - 2)
      const word = words[position]

      if (word !== undefined) words[position] = `${word},`
   }

   const [first = "", ...rest] = words
   const sentence = [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(" ")

   return `${sentence}.`
}

function buildParagraph(random: () => number, opening: readonly string[] = []): string {
   const count = randomInt(random, MIN_PARAGRAPH_SENTENCES, MAX_PARAGRAPH_SENTENCES)
   const sentences: string[] = []

   for (let index = 0; index < count; index += 1) {
      sentences.push(buildSentence(random, index === 0 ? opening : []))
   }

   return sentences.join(" ")
}

/**
 * Generate placeholder text.
 *
 * `seed` is the whole of the randomness: the same options and seed always
 * produce the same passage, on the server and in the browser alike.
 * Paragraphs are separated by a blank line, which is what survives a paste
 * into an editor as separate paragraphs rather than one run-on block.
 */
export function generateLorem(options: LoremOptions, seed: number): string {
   const random = mulberry32(seed)
   const count = clampCount(options.unit, options.count)
   const opening = options.startWithLorem ? LOREM_OPENING : []

   if (options.unit === "words") {
      const words = [...opening.slice(0, count)]

      while (words.length < count) {
         words.push(randomWord(random))
      }

      // Only once the phrase is long enough to have got past "amet" — a
      // four-word request would otherwise end on a dangling comma.
      if (opening.length > 0 && words.length > LOREM_OPENING_COMMA + 1) {
         const word = words[LOREM_OPENING_COMMA]

         if (word !== undefined) words[LOREM_OPENING_COMMA] = `${word},`
      }

      const [first = "", ...rest] = words

      return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(" ")
   }

   const blocks: string[] = []

   for (let index = 0; index < count; index += 1) {
      const lead = index === 0 ? opening : []

      blocks.push(
         options.unit === "sentences" ? buildSentence(random, lead) : buildParagraph(random, lead),
      )
   }

   return options.unit === "sentences" ? blocks.join(" ") : blocks.join("\n\n")
}
