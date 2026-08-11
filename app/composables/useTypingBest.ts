/// --------------------------------------------------
/// composables/useTypingBest.ts
/// --------------------------------------------------
/// The typing test's personal best, one figure per test length.
///
/// Same shape as `useReadingSpeeds`: `ma-`-prefixed scalar keys rather than
/// one JSON blob, so there is no parse step that can throw and each length can
/// independently have a best. "No best yet" is the absence of the key, which
/// means a first run has nothing to compare against rather than having to beat
/// a stored zero.
///
/// A 15-second best and a 120-second best are not the same achievement — the
/// short one rewards a burst, the long one rewards not tiring — so they are
/// kept apart rather than collapsed into a single number.
///
/// Auto-imported by Nuxt.
/// --------------------------------------------------

import type { TestDuration } from "~/utils/typing"

export const TYPING_BEST_STORAGE_PREFIX = "ma-typing-best-"

/** Storage key for one test length. */
export function typingBestKey(duration: TestDuration): string {
   return `${TYPING_BEST_STORAGE_PREFIX}${duration}`
}

/** Every length's best, keyed by duration. Absent means "never run". */
export type TypingBests = Partial<Record<TestDuration, number>>

/**
 * Read one best back out of storage.
 *
 * An implausible figure is discarded rather than clamped, exactly as
 * `useReadingSpeeds` discards an out-of-range speed: a stored 9000 is a bad
 * write or a hand-edited key, and pinning it to 400 would preserve a score
 * nobody typed instead of dropping it.
 */
function readStoredBest(duration: TestDuration): number | undefined {
   const raw = localStorage.getItem(typingBestKey(duration))

   if (raw === null) return undefined

   const stored = Number(raw)

   if (!Number.isInteger(stored) || stored <= 0 || stored > MAX_PLAUSIBLE_WPM) return undefined

   return stored
}

export function useTypingBest() {
   // `useState` rather than a module-level ref so the value is per-request on
   // the server instead of leaking between visitors.
   const bests = useState<TypingBests>("typing-bests", () => ({}))

   /** Adopt whatever previous visits stored. */
   const sync = (): void => {
      const next: TypingBests = {}

      for (const duration of TEST_DURATIONS) {
         const stored = readStoredBest(duration)

         if (stored !== undefined) next[duration] = stored
      }

      // Replaced wholesale rather than merged: `useState` outlives the
      // component that reads it, so merging would let one mount's figures
      // survive into the next.
      bests.value = next
   }

   /**
    * Store a score if it beats the stored one, and say whether it did.
    *
    * The boolean is the point — the panel uses it to decide whether this run
    * earned the "new personal best" flag, and deriving that in the component
    * would mean reading the old value before the write and racing with it.
    */
   const record = (duration: TestDuration, wpm: number): boolean => {
      if (!Number.isFinite(wpm) || wpm <= 0 || wpm > MAX_PLAUSIBLE_WPM) return false

      const score = Math.round(wpm)
      const previous = bests.value[duration]

      // Ties do not count. Matching a best is not beating it, and flagging it
      // as a record would make the badge meaningless within a few runs.
      if (previous !== undefined && score <= previous) return false

      bests.value = { ...bests.value, [duration]: score }
      localStorage.setItem(typingBestKey(duration), String(score))

      return true
   }

   /** Forget every stored best. */
   const clear = (): void => {
      for (const duration of TEST_DURATIONS) {
         localStorage.removeItem(typingBestKey(duration))
      }

      bests.value = {}
   }

   return { bests, sync, record, clear }
}
