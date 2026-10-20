/// --------------------------------------------------
/// composables/useDecibelCalibration.ts
/// --------------------------------------------------
/// The decibel meter's calibration: how many decibels this device's
/// microphone reads away from the default.
///
/// Same shape as `useReadingSpeeds`: one `ma-`-prefixed scalar key, where
/// the default is the absence of the key. A calibration belongs to a
/// microphone rather than to a visit, so it is kept — but only on this
/// device, which is the only place it is true.
///
/// Auto-imported by Nuxt.
/// --------------------------------------------------

export const DECIBEL_CALIBRATION_STORAGE_KEY = "ma-decibel-calibration"

/**
 * Read the calibration back out of storage.
 *
 * A value outside the control's own range is discarded rather than
 * clamped, as `useReadingSpeeds` discards a speed: a stored "90" is a bad
 * write, and pinning it to +30 would keep a calibration nobody chose.
 */
function readStoredCalibration(): number {
   const raw = localStorage.getItem(DECIBEL_CALIBRATION_STORAGE_KEY)

   if (raw === null) return 0

   const stored = Number(raw)

   if (!Number.isInteger(stored) || stored < CALIBRATION_MIN || stored > CALIBRATION_MAX) return 0

   return stored
}

export function useDecibelCalibration() {
   // `useState` rather than a module-level ref so the value is per-request
   // on the server instead of leaking between visitors.
   const calibration = useState<number>("decibel-calibration", () => 0)

   /** Adopt whatever a previous visit stored. */
   const sync = (): void => {
      calibration.value = readStoredCalibration()
   }

   const setCalibration = (next: number): void => {
      const value = clampCalibration(next)

      calibration.value = value

      // The default is stored as the absence of the key, so a microphone
      // calibrated back to zero leaves nothing behind.
      if (value === 0) localStorage.removeItem(DECIBEL_CALIBRATION_STORAGE_KEY)
      else localStorage.setItem(DECIBEL_CALIBRATION_STORAGE_KEY, String(value))
   }

   return { calibration, sync, setCalibration }
}
