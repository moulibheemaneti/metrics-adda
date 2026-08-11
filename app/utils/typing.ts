/// --------------------------------------------------
/// utils/typing.ts
/// --------------------------------------------------
/// The maths behind the typing speed test.
///
/// Everything here is pure: the word banks, a shuffle that takes its
/// randomness as an argument, per-character grading, and the words-per-minute
/// figures. The composable owns the timer and the keystrokes; this file owns
/// anything a test can assert without mounting a component.
///
/// The unit of speed is deliberately the character, not the word. "Words per
/// minute" has meant *five characters* per minute since typewriter-era
/// standards, because scoring whole words would make "a an the" worth as much
/// as "extraordinary distinguished" — the same figure for a fifth of the work.
///
/// Auto-imported by Nuxt. Tests import it relatively (see test/unit).
/// --------------------------------------------------

/**
 * The subjects a reader can practise on.
 *
 * `common` is the default and the only one a first-time visitor sees: someone
 * measuring their speed wants a comparable figure, and comparability comes
 * from ordinary English. The rest are practice vocabularies — the words you
 * actually type all day are the ones worth getting fast at.
 */
export const TOPICS = ["common", "programming", "science", "business", "everyday"] as const

export type TopicId = typeof TOPICS[number]

export const DEFAULT_TOPIC: TopicId = "common"

/** Narrow an arbitrary string to a topic the test offers. */
export function isTopic(value: string): value is TopicId {
   return (TOPICS as readonly string[]).includes(value)
}

/**
 * Every bank is plain lowercase letters, with no capitals, digits or
 * punctuation.
 *
 * Those are added afterwards by `buildStream`, and only when the reader asks
 * for them, because they measure a different skill: reaching for shift and for
 * the number row varies by keyboard layout, so baking them into the bank would
 * stop two people on different hardware from comparing scores at all.
 *
 * Each bank is authored to hold at least `MIN_POOL` words at every difficulty,
 * so no tier has to fall back on `poolFor`'s widening.
 */
export const WORD_BANKS: Record<TopicId, readonly string[]> = {
   common: [
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
      "between", "children", "important", "example", "morning", "country", "problem", "himself", "against", "nothing",
      "however", "already", "started", "thought", "brought", "present", "service", "program", "company", "general",
      "several", "special", "national", "question", "remember", "together", "business", "possible", "interest", "complete",
      "continue", "describe", "consider", "position", "standard", "personal", "industry", "particular", "information", "experience",
      "government", "community", "difficult", "education", "mountain", "southern", "northern", "evening", "holiday", "familiar",
   ],
   programming: [
      "bug", "bit", "byte", "code", "loop", "else", "case", "enum", "type", "void",
      "null", "true", "false", "const", "call", "path", "file", "data", "list", "map",
      "set", "node", "leaf", "tree", "heap", "key", "hash", "lint", "test", "mock",
      "fork", "diff", "repo", "main", "read", "sync", "port", "host", "json", "yaml",
      "value", "array", "class", "stack", "queue", "index", "query", "table", "input", "state",
      "scope", "token", "parse", "build", "debug", "patch", "merge", "catch", "throw", "async",
      "await", "fetch", "route", "cache", "model", "field", "event", "mount", "props", "slice",
      "shell", "regex", "macro", "stdin", "chunk", "flags", "guard", "yield", "trait", "mixin",
      "return", "import", "export", "string", "number", "object", "module", "syntax", "memory", "method",
      "buffer", "thread", "socket", "server", "client", "script", "branch", "commit", "deploy", "config",
      "output", "filter", "reduce", "assert", "static", "public", "delete", "insert", "update", "select",
      "schema", "cursor", "vector", "matrix", "binary", "decode", "encode", "opcode", "kernel", "daemon",
      "plugin", "widget", "layout", "render", "target", "source", "format", "length", "offset", "handle",
      "function", "boolean", "integer", "pointer", "closure", "promise", "callback", "iterator", "generator", "interface",
      "abstract", "instance", "variable", "constant", "operator", "argument", "parameter", "statement", "expression", "exception",
      "recursion", "algorithm", "structure", "database", "migration", "endpoint", "request", "response", "compiler", "runtime",
      "package", "library", "framework", "component", "template", "directive", "property", "reference", "allocate", "override",
      "inherit", "refactor", "deprecate", "validate", "serialize", "transform", "iterate", "mutation", "snapshot", "coverage",
      "pipeline", "container", "registry", "protocol", "encoding", "checksum", "terminal", "namespace", "attribute", "keyword",
   ],
   science: [
      "atom", "cell", "gene", "ion", "acid", "mass", "heat", "wave", "seed", "root",
      "stem", "leaf", "bark", "moss", "fern", "pine", "soil", "sand", "clay", "rock",
      "lava", "snow", "rain", "wind", "mist", "moth", "bee", "ant", "wasp", "toad",
      "newt", "lynx", "reef", "dune", "peak", "cave", "tide", "star", "moon", "dust",
      "force", "light", "orbit", "comet", "solar", "lunar", "tidal", "ocean", "river", "delta",
      "coral", "algae", "fungi", "plant", "frost", "storm", "cloud", "swamp", "marsh", "shore",
      "whale", "shark", "otter", "eagle", "raven", "bison", "zebra", "koala", "sloth", "larva",
      "oxygen", "carbon", "energy", "matter", "photon", "plasma", "liquid", "vapour", "planet", "meteor",
      "cosmos", "canyon", "valley", "desert", "forest", "jungle", "meadow", "tundra", "stream", "spring",
      "summer", "autumn", "winter", "breeze", "nectar", "pollen", "branch", "canopy", "animal", "falcon",
      "salmon", "turtle", "rabbit", "badger", "beaver", "spider", "beetle", "cactus", "fossil", "enzyme",
      "galaxy", "nebula", "mammal", "insect", "marine", "arctic", "oxide", "quartz", "basalt", "magma",
      "molecule", "electron", "neutron", "particle", "chemical", "compound", "reaction", "catalyst", "hydrogen", "isotope",
      "crystal", "mineral", "granite", "volcano", "glacier", "erosion", "sediment", "habitat", "species", "predator",
      "reptile", "bacteria", "organism", "nucleus", "protein", "genetic", "mutation", "evolution", "ecosystem", "rainfall",
      "climate", "monsoon", "hurricane", "lightning", "thunder", "gravity", "magnetic", "telescope", "asteroid", "meteorite",
      "universe", "spectrum", "radiation", "frequency", "velocity", "pressure", "density", "temperature", "atmosphere", "chlorophyll",
   ],
   business: [
      "cost", "cash", "debt", "fee", "tax", "risk", "goal", "plan", "team", "lead",
      "sale", "sell", "deal", "firm", "loss", "gain", "rate", "fund", "bond", "wage",
      "hire", "cap", "bid", "buy", "net", "due", "job", "pay", "run", "aim",
      "stock", "asset", "audit", "brand", "buyer", "chart", "claim", "draft", "email", "entry",
      "goods", "gross", "index", "issue", "lease", "offer", "order", "owner", "price", "quota",
      "scale", "share", "shift", "staff", "stake", "trade", "trend", "value", "yield", "labor",
      "budget", "client", "credit", "demand", "profit", "growth", "income", "ledger", "margin", "market",
      "merger", "metric", "output", "policy", "refund", "report", "retail", "review", "salary", "sample",
      "sector", "target", "tender", "vendor", "volume", "agenda", "launch", "hiring", "pledge", "equity",
      "revenue", "invoice", "payroll", "account", "balance", "capital", "company", "expense", "finance", "forecast",
      "inflation", "interest", "investor", "leverage", "liability", "marketing", "portfolio", "proposal", "quarterly", "retailer",
      "strategy", "supplier", "turnover", "valuation", "warranty", "workflow", "agreement", "benchmark", "commission", "competitor",
      "compliance", "contract", "customer", "deadline", "dividend", "franchise", "guideline", "incentive", "industry", "logistics",
      "negotiate", "objective", "operating", "overhead", "partner", "pipeline", "procedure", "purchase", "recruit", "regulate",
      "reputation", "resource", "retention", "shipping", "solution", "stakeholder", "subsidy", "takeover", "venture", "quarter",
   ],
   everyday: [
      "cup", "tea", "egg", "bed", "key", "bag", "hat", "rug", "pen", "bus",
      "car", "rice", "soup", "salt", "fork", "bowl", "oven", "sink", "soap", "bath",
      "lamp", "door", "desk", "sofa", "coat", "bike", "road", "park", "shop", "card",
      "list", "walk", "book", "page", "milk", "cake", "jam", "map", "gift", "note",
      "bread", "sugar", "plate", "spoon", "knife", "stove", "towel", "chair", "shelf", "clock",
      "phone", "shoes", "socks", "shirt", "purse", "watch", "train", "store", "money", "paper",
      "sleep", "dream", "music", "movie", "glass", "juice", "salad", "bacon", "onion", "fruit",
      "coffee", "kettle", "dinner", "supper", "garden", "window", "pocket", "wallet", "ticket", "jacket",
      "sandal", "mirror", "drawer", "carpet", "candle", "basket", "bottle", "butter", "cheese", "garlic",
      "tomato", "potato", "banana", "orange", "market", "parcel", "letter", "laptop", "mobile", "camera",
      "guitar", "pillow", "napkin", "saucer", "teapot", "hanger", "broom", "bucket", "sponge", "ladder",
      "kitchen", "bedroom", "balcony", "cupboard", "blanket", "curtain", "mattress", "wardrobe", "furniture", "doorbell",
      "driveway", "umbrella", "suitcase", "backpack", "sandwich", "breakfast", "leftovers", "grocery", "shopping", "neighbour",
      "postcard", "envelope", "calendar", "birthday", "holiday", "weekend", "evening", "morning", "afternoon", "commute",
      "traffic", "station", "platform", "passport", "luggage", "bicycle", "sidewalk", "crossing", "laundry", "ironing",
      "cleaning", "garbage", "recycle", "gardening", "watering", "sunlight", "armchair", "television", "charger", "notebook",
      "reminder", "medicine", "pharmacy", "exercise", "swimming", "painting", "reading", "cooking", "shelving", "cushion",
   ],
}

/**
 * The default bank, kept as its own export.
 *
 * Anything that just wants "the words a typing test uses" — and every test
 * written before topics existed — means this one.
 */
export const WORD_BANK: readonly string[] = WORD_BANKS[DEFAULT_TOPIC]

/** How hard the words themselves are, before any mix is layered on. */
export const DIFFICULTIES = ["easy", "medium", "hard"] as const

export type Difficulty = typeof DIFFICULTIES[number]

/** The whole bank, which is the bank the test has always used. */
export const DEFAULT_DIFFICULTY: Difficulty = "medium"

/** Narrow an arbitrary string to a difficulty the test offers. */
export function isDifficulty(value: string): value is Difficulty {
   return (DIFFICULTIES as readonly string[]).includes(value)
}

/**
 * The fewest words a pool may hold.
 *
 * `buildStream` deals shuffled bags, so a pool is also the distance between
 * one sighting of a word and the next. Under about forty the repetition
 * becomes obvious inside a single 30-second run, and a stream that visibly
 * loops stops feeling like reading.
 */
export const MIN_POOL = 40

/** Word lengths each difficulty draws from. */
const DIFFICULTY_LENGTHS: Record<Difficulty, { min: number, max: number }> = {
   easy: { min: 1, max: 5 },
   medium: { min: 1, max: Number.POSITIVE_INFINITY },
   hard: { min: 7, max: Number.POSITIVE_INFINITY },
}

/**
 * The words one topic offers at one difficulty.
 *
 * Difficulty is a length window over the topic's bank rather than fifteen
 * hand-authored banks: length is what actually makes a word slow to type, and
 * a window keeps every topic's vocabulary intact at every level instead of
 * thinning it into three unrelated lists.
 *
 * An unknown topic or difficulty falls back to the default rather than
 * throwing. These values reach here from `localStorage`, and a hand-edited key
 * should cost the reader a different word list, not a blank screen.
 */
export function poolFor(topic: TopicId, difficulty: Difficulty): string[] {
   const bank = WORD_BANKS[topic] ?? WORD_BANKS[DEFAULT_TOPIC]
   const window = DIFFICULTY_LENGTHS[difficulty] ?? DIFFICULTY_LENGTHS[DEFAULT_DIFFICULTY]
   const pool = bank.filter((word) => word.length >= window.min && word.length <= window.max)

   if (pool.length >= MIN_POOL) return pool

   // The banks are authored to clear MIN_POOL on their own, so this is a floor
   // rather than a code path anything normally takes: widen outwards by how
   // far each word misses the window, so a thin tier borrows the words nearest
   // to it rather than a random handful.
   const distance = (word: string): number => Math.max(
      window.min - word.length,
      word.length - window.max,
      0,
   )

   return [...bank]
      .sort((a, b) => distance(a) - distance(b) || a.localeCompare(b))
      .slice(0, Math.min(MIN_POOL, bank.length))
}

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

/** Everything that decides which words a stream is made of. */
export interface StreamOptions {
   topic: TopicId
   difficulty: Difficulty
   /** Drop numeric tokens into the stream. */
   numbers: boolean
   /** Punctuate the words, and capitalise what follows a full stop. */
   punctuation: boolean
}

/**
 * What the test deals to someone who has never changed a setting: ordinary
 * English, the whole bank, and nothing but lowercase letters.
 */
export const DEFAULT_STREAM_OPTIONS: StreamOptions = {
   topic: DEFAULT_TOPIC,
   difficulty: DEFAULT_DIFFICULTY,
   numbers: false,
   punctuation: false,
}

/**
 * How much of the stream each mix takes up, per difficulty.
 *
 * Rates rather than fixed spacing, so the reader cannot learn the rhythm and
 * start typing the punctuation before they have read it.
 */
const NUMBER_RATE: Record<Difficulty, number> = { easy: 0.04, medium: 0.08, hard: 0.14 }
const PUNCTUATION_RATE: Record<Difficulty, number> = { easy: 0.06, medium: 0.12, hard: 0.2 }

/**
 * Capitals on hard, whatever else is switched on.
 *
 * Difficulty is the one setting that is allowed to change the *shape* of the
 * words rather than only which ones are drawn — that is what makes it a
 * difficulty rather than a second topic.
 */
const HARD_CAPITAL_RATE = 0.12

/** Marks that can end a word. Repeated entries are weighted, not duplicated. */
const TRAILING_MARKS = [",", ",", ",", ".", ".", ";", ":", "!", "?"] as const

/** A token that closes a sentence, allowing for a quote or bracket after it. */
const SENTENCE_END = /[.!?][")']*$/u

function capitalise(word: string): string {
   return word.charAt(0).toUpperCase() + word.slice(1)
}

/**
 * A number to type, between one and four digits.
 *
 * Hard occasionally shapes it as a decimal or a grouped thousand, because a
 * full stop or a comma inside a number is a different reach from one at the
 * end of a word — and the grouping is written by hand rather than by
 * `toLocaleString`, which would make the stream depend on the machine's locale.
 */
function numberToken(difficulty: Difficulty, random: () => number): string {
   const digits = 1 + Math.floor(random() * 4)
   const value = Math.floor(random() * 10 ** digits)

   if (difficulty !== "hard") return String(value)

   const shape = random()

   if (shape < 0.2) return `${value}.${Math.floor(random() * 10)}`
   if (shape < 0.35) return String(value).replace(/\B(?=(\d{3})+(?!\d))/gu, ",")

   return String(value)
}

/** Punctuate one word: a trailing mark, or a wrap around it. */
function punctuate(word: string, random: () => number): string {
   const shape = random()

   if (shape < 0.1) return `"${word}"`
   if (shape < 0.18) return `(${word})`
   if (shape < 0.26) return `${word}'s`

   return `${word}${TRAILING_MARKS[Math.floor(random() * TRAILING_MARKS.length)]}`
}

/**
 * Layer the reader's chosen mix over a stream of plain words.
 *
 * One pass, left to right, because every rule depends on the token before it:
 * a capital follows a full stop, and neither two numbers nor two punctuated
 * words are allowed to sit next to each other — back-to-back decoration reads
 * as noise rather than as prose, which is the thing being imitated.
 *
 * A token never contains a space. A space is the word boundary in
 * `handleInput`, so one inside a token would submit two words for a single
 * keystroke.
 */
function applyMix(words: string[], options: StreamOptions, random: () => number): string[] {
   const { difficulty, numbers, punctuation } = options
   const numberRate = numbers ? NUMBER_RATE[difficulty] ?? 0 : 0
   const punctuationRate = punctuation ? PUNCTUATION_RATE[difficulty] ?? 0 : 0
   const capitalRate = difficulty === "hard" ? HARD_CAPITAL_RATE : 0

   if (numberRate === 0 && punctuationRate === 0 && capitalRate === 0) return words

   const tokens: string[] = []
   let afterSentenceEnd = false
   let previousWasNumber = false
   let previousWasPunctuated = false

   for (const word of words) {
      if (numberRate > 0 && !previousWasNumber && random() < numberRate) {
         tokens.push(numberToken(difficulty, random))
         previousWasNumber = true
         previousWasPunctuated = false
         // A number opens the next sentence rather than being capitalised
         // itself, so the pending capital is spent here.
         afterSentenceEnd = false

         continue
      }

      previousWasNumber = false

      let token = afterSentenceEnd || (capitalRate > 0 && random() < capitalRate)
         ? capitalise(word)
         : word

      if (punctuationRate > 0 && !previousWasPunctuated && random() < punctuationRate) {
         token = punctuate(token, random)
         previousWasPunctuated = true
      }
      else {
         previousWasPunctuated = false
      }

      afterSentenceEnd = SENTENCE_END.test(token)
      tokens.push(token)
   }

   return tokens
}

/**
 * Draw `count` words for the stream.
 *
 * Shuffled bags rather than independent random picks: picking each word
 * independently repeats one every few words at this pool size, and a repeat is
 * the one thing that makes a stream look generated rather than written. A bag
 * guarantees every word in the pool is used before any is used twice.
 *
 * The seam between two bags is the one place a repeat can still happen — the
 * last word of one bag and the first of the next — so it is checked for and
 * swapped past. The check runs on the plain words, before the mix is applied,
 * so "the" and "the," still count as a repeat.
 */
export function buildStream(
   count: number,
   options: StreamOptions = DEFAULT_STREAM_OPTIONS,
   random: () => number = Math.random,
): string[] {
   if (!Number.isFinite(count) || count <= 0) return []

   const pool = poolFor(options.topic, options.difficulty)

   if (pool.length === 0) return []

   const stream: string[] = []

   while (stream.length < count) {
      const bag = shuffle([...pool], random)
      const previous = stream.at(-1)

      if (previous !== undefined && bag.length > 1 && bag[0] === previous) {
         bag[0] = bag[1] as string
         bag[1] = previous
      }

      stream.push(...bag)
   }

   return applyMix(stream.slice(0, Math.floor(count)), options, random)
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
