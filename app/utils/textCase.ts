/// --------------------------------------------------
/// utils/textCase.ts
/// --------------------------------------------------
/// The case conversions behind the case converter.
///
/// There are two families here, and conflating them is the mistake this
/// module exists to avoid:
///
/// - **Text cases** (UPPER, lower, Title, Sentence, aLtErNaTiNg) rewrite
///   letters and leave everything else where it is. Punctuation, line
///   breaks and double spaces survive, because someone recasing a
///   paragraph wants the paragraph back.
/// - **Identifier cases** (camel, Pascal, snake, kebab, CONSTANT) tokenise
///   first and rebuild from the words. Punctuation and layout are
///   deliberately discarded — that is what makes them identifiers.
///
/// Running the two through one code path would mean either identifiers
/// keeping stray full stops, or paragraphs losing their line breaks.
///
/// Auto-imported by Nuxt. Tests import it relatively (see test/unit).
/// --------------------------------------------------

/** Cases that keep the original punctuation and spacing. */
export const TEXT_CASES = ["upper", "lower", "title", "sentence", "alternating"] as const

/** Cases that rebuild the string from its words. */
export const IDENTIFIER_CASES = ["camel", "pascal", "snake", "kebab", "constant"] as const

export const CASES = [...TEXT_CASES, ...IDENTIFIER_CASES] as const

export type CaseId = typeof CASES[number]

/**
 * Split a string into the words an identifier is built from.
 *
 * Three alternatives, in order, and the order is what makes acronyms work:
 *
 * 1. `\p{Lu}+(?!\p{Ll})` — a run of capitals not followed by a lowercase
 *    letter. In "XMLHttpRequest" this takes "XML" and stops before the "H",
 *    because that H begins the next word rather than ending the acronym.
 * 2. `\p{Lu}?\p{Ll}+` — an optional capital and the lowercase run after it.
 *    This is the ordinary word: "Http", "parse", "Request".
 * 3. `\p{N}+` — a run of digits, kept as its own word so "utf8" can become
 *    "utf_8" rather than an unsplittable blob.
 *
 * Everything not matched — spaces, underscores, hyphens, punctuation — is
 * simply not captured, which is how one tokeniser handles input that
 * arrives already in any of the five identifier cases.
 */
const WORD_PATTERN = /\p{Lu}+(?!\p{Ll})|\p{Lu}?\p{Ll}+|\p{N}+/gu

export function splitWords(input: string): string[] {
   return input.match(WORD_PATTERN) ?? []
}

/** Upper-case the first character, lower-case the rest. */
function capitalise(word: string): string {
   return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

/**
 * Title case, applied over the original string.
 *
 * Deliberately capitalises every word rather than applying the
 * short-words-stay-lowercase convention ("a", "of", "the"). That rule
 * varies between style guides, depends on a word's position in the title,
 * and is wrong outright for other languages — a converter that guessed
 * would be confidently wrong more often than it was right.
 */
function toTitleCase(input: string): string {
   return input.replace(/\p{L}[\p{L}\p{M}'’]*/gu, capitalise)
}

/**
 * Sentence case: the first letter of each sentence, everything else lower.
 *
 * Explicitly *not* `Intl.Segmenter`, despite `utils/text.ts` using it for
 * sentence counting. The segmenter only breaks a sentence when the next
 * letter is uppercase, so on "hello world. this is a test" it returns one
 * segment and nothing after the first letter gets capitalised — which is
 * circular, because supplying those capitals is the entire job here.
 *
 * So the boundary is stated outright: the start of the text, a terminator
 * followed by whitespace, or a line break. The known cost is abbreviations
 * — "dr. smith" becomes "Dr. Smith" — because telling an abbreviation from
 * a sentence end needs a dictionary, and the FAQ says so rather than the
 * tool pretending otherwise. A decimal is safe either way: the full stop in
 * "3.50" is followed by a digit, not whitespace.
 */
const SENTENCE_START = /(^\s*|[.!?]\s+|\n\s*)(\p{Ll})/gu

function toSentenceCase(input: string): string {
   return input
      .toLowerCase()
      .replace(SENTENCE_START, (_match, prefix: string, letter: string) => prefix + letter.toUpperCase())
}

/**
 * aLtErNaTiNg caps.
 *
 * The toggle advances only on letters, so spaces and punctuation do not
 * consume a turn — otherwise "a b c" would come out all one case, since
 * every letter would land on the same parity.
 */
function toAlternatingCase(input: string): string {
   let upper = false

   return [...input].map((character) => {
      if (!/\p{L}/u.test(character)) return character

      upper = !upper

      return upper ? character.toUpperCase() : character.toLowerCase()
   }).join("")
}

const TRANSFORMS: Record<CaseId, (input: string) => string> = {
   upper: (input) => input.toUpperCase(),
   lower: (input) => input.toLowerCase(),
   title: toTitleCase,
   sentence: toSentenceCase,
   alternating: toAlternatingCase,

   camel: (input) => splitWords(input)
      .map((word, index) => (index === 0 ? word.toLowerCase() : capitalise(word)))
      .join(""),
   pascal: (input) => splitWords(input).map(capitalise).join(""),
   snake: (input) => splitWords(input).map((word) => word.toLowerCase()).join("_"),
   kebab: (input) => splitWords(input).map((word) => word.toLowerCase()).join("-"),
   constant: (input) => splitWords(input).map((word) => word.toUpperCase()).join("_"),
}

/** Convert `input` to the named case. Empty input converts to empty. */
export function convertCase(input: string, id: CaseId): string {
   if (input === "") return ""

   return TRANSFORMS[id](input)
}
