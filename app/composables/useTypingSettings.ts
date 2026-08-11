/// --------------------------------------------------
/// composables/useTypingSettings.ts
/// --------------------------------------------------
/// What the typing test deals: topic, difficulty, and the numbers and
/// punctuation mix.
///
/// Same shape as `useReadingSpeeds`: one `ma-`-prefixed scalar key per field
/// rather than a JSON blob, so there is no parse step that can throw and each
/// field can independently be "default". A stored value that is not one of the
/// offered options is discarded rather than coerced — it is a bad write or a
/// hand-edited key, and quietly mapping it onto something valid would hide
/// that rather than recover from it.
///
/// The default is the *absence* of a key, which also means someone who returns
/// to the default topic keeps inheriting whatever that default becomes later.
///
/// Nothing here reads `localStorage` until `sync` is called, so the composable
/// is safe during SSR — the panel calls it from `onMounted`, before the first
/// stream is dealt.
///
/// Auto-imported by Nuxt.
/// --------------------------------------------------

import type { Difficulty, StreamOptions, TopicId } from "~/utils/typing"

export const TYPING_TOPIC_STORAGE_KEY = "ma-typing-topic"
export const TYPING_DIFFICULTY_STORAGE_KEY = "ma-typing-difficulty"
export const TYPING_NUMBERS_STORAGE_KEY = "ma-typing-numbers"
export const TYPING_PUNCTUATION_STORAGE_KEY = "ma-typing-punctuation"

/** Read one of the two option fields back, or fall back to its default. */
function readStoredChoice<T extends string>(
   key: string,
   isValid: (value: string) => value is T,
   fallback: T,
): T {
   const raw = localStorage.getItem(key)

   if (raw === null || !isValid(raw)) return fallback

   return raw
}

/** Read one toggle back. Anything but a stored "1" is off. */
function readStoredToggle(key: string): boolean {
   return localStorage.getItem(key) === "1"
}

/** Write a field, or clear the key when it matches the default. */
function writeChoice(key: string, value: string, fallback: string): void {
   if (value === fallback) {
      localStorage.removeItem(key)

      return
   }

   localStorage.setItem(key, value)
}

export function useTypingSettings() {
   // `useState` rather than a module-level ref so the value is per-request on
   // the server instead of leaking between visitors.
   const settings = useState<StreamOptions>("typing-settings", () => ({
      ...DEFAULT_STREAM_OPTIONS,
   }))

   /** Adopt whatever a previous visit stored. */
   const sync = (): void => {
      // Every field is assigned, the fallback case included. `useState`
      // outlives the component that reads it, so a conditional assignment
      // would let one mount's settings survive into the next.
      settings.value = {
         topic: readStoredChoice<TopicId>(TYPING_TOPIC_STORAGE_KEY, isTopic, DEFAULT_TOPIC),
         difficulty: readStoredChoice<Difficulty>(
            TYPING_DIFFICULTY_STORAGE_KEY,
            isDifficulty,
            DEFAULT_DIFFICULTY,
         ),
         numbers: readStoredToggle(TYPING_NUMBERS_STORAGE_KEY),
         punctuation: readStoredToggle(TYPING_PUNCTUATION_STORAGE_KEY),
      }
   }

   const setSettings = (next: StreamOptions): void => {
      const topic = isTopic(next.topic) ? next.topic : DEFAULT_TOPIC
      const difficulty = isDifficulty(next.difficulty) ? next.difficulty : DEFAULT_DIFFICULTY
      const numbers = next.numbers === true
      const punctuation = next.punctuation === true

      settings.value = { topic, difficulty, numbers, punctuation }

      writeChoice(TYPING_TOPIC_STORAGE_KEY, topic, DEFAULT_TOPIC)
      writeChoice(TYPING_DIFFICULTY_STORAGE_KEY, difficulty, DEFAULT_DIFFICULTY)
      writeChoice(TYPING_NUMBERS_STORAGE_KEY, numbers ? "1" : "0", "0")
      writeChoice(TYPING_PUNCTUATION_STORAGE_KEY, punctuation ? "1" : "0", "0")
   }

   return { settings, sync, setSettings }
}
