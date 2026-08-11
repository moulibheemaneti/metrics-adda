/// --------------------------------------------------
/// composables/useReadingSpeeds.ts
/// --------------------------------------------------
/// The word counter's reading and speaking pace.
///
/// Two scalar keys rather than one JSON blob: the storage shape stays as
/// simple as the theme's, there is no parse step that can throw, and each
/// speed can independently be "default" — someone who only changed their
/// speaking pace stores one key, and keeps inheriting whatever the reading
/// default becomes later.
///
/// That is also why nothing stores the "use the recommended speeds"
/// checkbox: recommended *is* both keys being absent, so the checkbox is
/// derived rather than stored, and the two can never fall out of step.
///
/// Unlike the theme there is no inline head script here. A stored speed
/// changes two numbers below the fold rather than the colour of the page,
/// so correcting them after hydration costs nothing a visitor can see.
/// --------------------------------------------------

import type { TextSpeeds } from "~/utils/text"

export const READING_SPEED_STORAGE_KEY = "ma-reading-speed"
export const SPEAKING_SPEED_STORAGE_KEY = "ma-speaking-speed"

/**
 * Read one speed back out of storage.
 *
 * A value outside the slider's own range is discarded rather than clamped:
 * a stored "5000" is far likelier to be a bad write or a stale format than
 * a considered choice, and quietly pinning it to the maximum would hide
 * that rather than recover from it.
 */
function readStoredSpeed(key: string, fallback: number, min: number, max: number): number {
   const raw = localStorage.getItem(key)

   if (raw === null) return fallback

   const stored = Number(raw)

   if (!Number.isInteger(stored) || stored < min || stored > max) return fallback

   return stored
}

/** Write a speed, or clear the key when it matches the recommendation. */
function writeSpeed(key: string, value: number, fallback: number): void {
   // The default is stored as the absence of a key — which also means
   // someone who returns to the recommended pace picks up any later change
   // to that recommendation rather than being pinned to today's figure.
   if (value === fallback) {
      localStorage.removeItem(key)

      return
   }

   localStorage.setItem(key, String(value))
}

export function useReadingSpeeds() {
   // `useState` rather than a module-level ref so the value is per-request
   // on the server instead of leaking between visitors.
   const speeds = useState<TextSpeeds>("reading-speeds", () => ({ ...DEFAULT_SPEEDS }))

   const usesDefaults = computed(() =>
      speeds.value.reading === DEFAULT_SPEEDS.reading
      && speeds.value.speaking === DEFAULT_SPEEDS.speaking,
   )

   /** Adopt whatever a previous visit stored. */
   const sync = (): void => {
      // Both fields are assigned unconditionally, the fallback case
      // included. `useState` outlives the component that reads it, so a
      // conditional assignment would let one mount's speed survive into
      // the next one.
      speeds.value = {
         reading: readStoredSpeed(
            READING_SPEED_STORAGE_KEY,
            DEFAULT_SPEEDS.reading,
            READING_SPEED_MIN,
            READING_SPEED_MAX,
         ),
         speaking: readStoredSpeed(
            SPEAKING_SPEED_STORAGE_KEY,
            DEFAULT_SPEEDS.speaking,
            SPEAKING_SPEED_MIN,
            SPEAKING_SPEED_MAX,
         ),
      }
   }

   const setSpeeds = (next: TextSpeeds): void => {
      const reading = clampSpeed(next.reading, READING_SPEED_MIN, READING_SPEED_MAX)
      const speaking = clampSpeed(next.speaking, SPEAKING_SPEED_MIN, SPEAKING_SPEED_MAX)

      speeds.value = { reading, speaking }

      writeSpeed(READING_SPEED_STORAGE_KEY, reading, DEFAULT_SPEEDS.reading)
      writeSpeed(SPEAKING_SPEED_STORAGE_KEY, speaking, DEFAULT_SPEEDS.speaking)
   }

   return { speeds, usesDefaults, setSpeeds, sync }
}
