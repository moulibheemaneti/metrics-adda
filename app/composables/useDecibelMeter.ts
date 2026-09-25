/// --------------------------------------------------
/// composables/useDecibelMeter.ts
/// --------------------------------------------------
/// The decibel meter's microphone, its audio graph, and the readings that
/// come back from it.
///
/// Plain refs rather than `useState`, for the reason `useTypingTest` gives:
/// a measurement in progress belongs to the page that started it. Here the
/// reason is stronger than tidiness — the microphone must never outlive
/// the page that opened it, so leaving the page ends the run and releases
/// the device rather than carrying a live input into the next route.
///
/// Nothing touches the browser until `start`, which only a click calls, so
/// the composable is safe to set up during SSR.
///
/// Auto-imported by Nuxt.
/// --------------------------------------------------

import type { MeterFault, MeterReading, MeterSession, SpectrumLayout } from "~/utils/decibel"
// Vite bundles the worklet as a file of its own and hands back its URL;
// `audioWorklet.addModule` needs a URL, not a module.
import workletUrl from "~/worklets/decibel-meter.ts?worker&url"

/**
 * `idle` before the first run, `starting` while the permission prompt and
 * the worklet load, `running` while readings arrive, `stopped` once a run
 * has ended with its readings still on screen.
 */
export type MeterStatus = "idle" | "starting" | "running" | "stopped"

/** One point on the history graph: seconds into the run, level in dBFS. */
export interface HistoryPoint {
   time: number
   level: number
}

/** How much the history graph keeps, in seconds. */
export const HISTORY_SECONDS = 60

/**
 * How long the input has to stay silent before the page says so.
 *
 * Long enough that a gap between readings is not mistaken for a muted
 * microphone, short enough that someone wondering why nothing moves is
 * told before they give up.
 */
export const SILENCE_NOTICE_SECONDS = 2

/**
 * Every processing stage switched off.
 *
 * Browsers tune microphone input for calls: automatic gain lifts a quiet
 * room and pulls a loud one down, and noise suppression removes exactly
 * the steady background a noise measurement is for. With any of them on,
 * the meter would report the browser's idea of a good call level rather
 * than the room.
 */
const MICROPHONE: MediaStreamConstraints = {
   audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
   },
   video: false,
}

/**
 * Map a failure to the fault a reader can act on.
 *
 * Read by name rather than by `instanceof DOMException`: Chrome's
 * `OverconstrainedError` is its own class, and the name is the one thing
 * every browser agrees on.
 */
function faultFrom(error: unknown): MeterFault {
   const name = typeof error === "object" && error !== null && "name" in error ? String(error.name) : ""

   switch (name) {
      case "NotAllowedError":
      case "SecurityError":
         return "denied"
      case "NotFoundError":
      case "OverconstrainedError":
         return "missing"
      case "NotReadableError":
      case "AbortError":
         return "busy"
      default:
         return "failed"
   }
}

export function useDecibelMeter() {
   const status = ref<MeterStatus>("idle")
   const fault = ref<MeterFault | null>(null)

   /** The most recent reading, or null before the first of a run. */
   const latest = shallowRef<MeterReading | null>(null)
   const history = shallowRef<HistoryPoint[]>([])
   const session = shallowRef<MeterSession>(emptySession())

   /** When the current stretch of silence began, in run seconds. */
   const silentSince = ref<number | null>(null)

   const silent = computed(() =>
      latest.value !== null
      && silentSince.value !== null
      && latest.value.time - silentSince.value >= SILENCE_NOTICE_SECONDS,
   )

   /** Each octave band's level in dBFS, or null before the first frame. */
   const spectrum = shallowRef<(number | null)[] | null>(null)

   let context: AudioContext | null = null
   let stream: MediaStream | null = null
   let node: AudioWorkletNode | null = null
   let frame: number | null = null

   /**
    * Bumped by every start and every stop. A start is several awaits long —
    * the permission prompt alone can sit open for as long as the reader
    * likes — and anything can happen in between: Stop, a second click, the
    * page being left. Each await checks it still owns the latest
    * generation before going on, and a stale one stands down.
    */
   let generation = 0

   /** Let go of the device and the graph. Safe to call at any point. */
   function release(): void {
      if (frame !== null) cancelAnimationFrame(frame)

      if (node) {
         node.port.onmessage = null
         node.disconnect()
      }

      // Stopping the tracks is what turns the browser's recording
      // indicator off. Closing the context alone leaves it lit.
      stream?.getTracks().forEach((track) => track.stop())
      context?.close().catch(() => {})

      frame = null
      node = null
      stream = null
      context = null
   }

   /**
    * Redraw the spectrum from the analyser, on animation frames.
    *
    * Frames rather than a timer, so a hidden tab — where nobody is looking
    * at the bars — does no FFT work at all. They are thinned to one every
    * `SPECTRUM_INTERVAL`, which is as fast as a bar can usefully move.
    */
   function listen(analyser: AnalyserNode, layout: SpectrumLayout): void {
      const bins = new Float32Array(analyser.frequencyBinCount)
      let smoothed: (number | null)[] | null = null
      let drawnAt: number | null = null

      const draw = (now: number): void => {
         const elapsed = drawnAt === null ? Number.POSITIVE_INFINITY : (now - drawnAt) / 1000

         if (elapsed >= SPECTRUM_INTERVAL) {
            analyser.getFloatFrequencyData(bins)
            smoothed = smoothBands(smoothed, bandMeanSquares(bins, layout), elapsed)
            spectrum.value = smoothed.map((meanSquare) => meanSquare === null ? null : meanSquareToDbfs(meanSquare))
            drawnAt = now
         }

         frame = requestAnimationFrame(draw)
      }

      frame = requestAnimationFrame(draw)
   }

   function receive(reading: MeterReading): void {
      latest.value = reading
      session.value = addReading(session.value, reading)

      if (!isSilentReading(reading)) silentSince.value = null
      else silentSince.value ??= reading.time

      const cutoff = reading.time - HISTORY_SECONDS
      const firstKept = history.value.findIndex((point) => point.time >= cutoff)
      const kept = firstKept === -1 ? [] : history.value.slice(firstKept)

      history.value = [...kept, { time: reading.time, level: reading.level }]
   }

   /** End the run, keeping whatever it measured on screen. */
   function stop(): void {
      generation += 1
      release()

      if (status.value === "running") status.value = "stopped"
      else if (status.value === "starting") status.value = latest.value ? "stopped" : "idle"
   }

   function fail(reason: MeterFault): void {
      stop()
      fault.value = reason
   }

   async function start(): Promise<void> {
      if (status.value === "starting" || status.value === "running") return

      fault.value = null

      // Checked before feature support: an insecure page has no
      // `mediaDevices` at all, and "unsupported" would send someone off to
      // update a browser that is perfectly capable.
      if (!window.isSecureContext) {
         fault.value = "insecure"

         return
      }

      if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === "undefined") {
         fault.value = "unsupported"

         return
      }

      generation += 1

      const current = generation

      status.value = "starting"

      try {
         // Created before anything is awaited. Safari lets an AudioContext
         // start only inside the gesture that asked for it, and once the
         // permission prompt has come and gone that gesture is over. Inside
         // the `try` all the same: a browser can refuse a context outright,
         // and that has to end as a fault rather than as a meter stuck on
         // "starting".
         const created = new AudioContext()

         context = created
         created.resume().catch(() => {})

         const opened = await navigator.mediaDevices.getUserMedia(MICROPHONE)

         if (current !== generation) {
            opened.getTracks().forEach((track) => track.stop())

            return
         }

         stream = opened

         await created.audioWorklet.addModule(workletUrl)

         if (current !== generation) return

         const worklet = new AudioWorkletNode(created, METER_PROCESSOR_NAME, {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            outputChannelCount: [1],
         })

         worklet.port.onmessage = (event: MessageEvent<MeterReading>): void => {
            if (current === generation) receive(event.data)
         }

         // In line ahead of the worklet rather than beside it: an analyser
         // passes its input through untouched, and sitting in the chain that
         // reaches the destination is what keeps every browser pulling audio
         // into it. Its own smoothing is off because it averages magnitudes,
         // which reads noise about a decibel low; `smoothBands` averages
         // energy instead.
         const analyser = created.createAnalyser()

         analyser.fftSize = SPECTRUM_FFT_SIZE
         analyser.smoothingTimeConstant = 0

         created.createMediaStreamSource(opened).connect(analyser)
         analyser.connect(worklet)
         worklet.connect(created.destination)
         node = worklet

         // A microphone unplugged, or a permission revoked, mid-run.
         for (const track of opened.getAudioTracks()) {
            track.addEventListener("ended", () => {
               if (current === generation) fail("disconnected")
            })
         }

         latest.value = null
         history.value = []
         session.value = emptySession()
         silentSince.value = null
         spectrum.value = null
         status.value = "running"

         listen(analyser, spectrumLayout(created.sampleRate, analyser.fftSize))
      }
      catch(error) {
         if (current === generation) fail(faultFrom(error))
      }
   }

   /**
    * Start the figures again from now.
    *
    * During a run only the session resets — the graph is a rolling window
    * and clears itself. Once stopped there is nothing left to measure, so
    * everything goes and the meter is back where it began. A run still
    * starting is left alone: it clears the screen itself when it arrives.
    */
   function reset(): void {
      session.value = emptySession()

      if (status.value === "running" || status.value === "starting") return

      latest.value = null
      history.value = []
      silentSince.value = null
      spectrum.value = null
      status.value = "idle"
   }

   onScopeDispose(stop)

   return {
      status,
      fault,
      latest,
      history,
      session,
      silent,
      spectrum,
      start,
      stop,
      reset,
   }
}
