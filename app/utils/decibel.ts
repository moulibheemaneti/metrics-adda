/// --------------------------------------------------
/// utils/decibel.ts
/// --------------------------------------------------
/// The decibel meter's arithmetic: the A-weighting filter, the Fast time
/// weighting a sound level meter reads with, and the step from a digital
/// level to an estimated sound level.
///
/// Everything that touches samples lives in `SoundLevelMeter`. The audio
/// worklet runs it on the audio thread, and the unit tests run the very
/// same class in plain Node against synthetic tones. A worklet has no test
/// runner of its own, so this split is what makes the signal path testable
/// at all — the worklet file is a dozen lines of plumbing around it.
///
/// Levels stay in dBFS — decibels below the loudest thing the microphone
/// can represent — everywhere except at the very edge, where
/// `toSoundLevel` adds the calibration. That is what lets a change of
/// calibration move every figure on screen at once, history included,
/// without a single stored reading being rewritten.
///
/// Auto-imported by Nuxt. Tests import it relatively (see test/unit), and
/// so does the worklet, which is bundled on its own and sees no
/// auto-imports.
/// --------------------------------------------------

/** The name the worklet registers under, shared so the two ends agree. */
export const METER_PROCESSOR_NAME = "decibel-meter"

/**
 * Every reason the meter can fail to run. Kept apart because each has its
 * own fix, and a single "could not start" would leave the reader guessing
 * which one applies to them.
 */
export type MeterFault
   = | "unsupported"
     | "insecure"
     | "denied"
     | "missing"
     | "busy"
     | "disconnected"
     | "failed"

/// --- A-weighting ---------------------------------------------------------

/**
 * The four pole frequencies of the A-weighting curve, in hertz, from
 * IEC 61672-1.
 *
 * The curve is the ear's sensitivity at moderate levels: nearly deaf to
 * low rumble, flat through the speech band, easing off again above about
 * 10 kHz. Weighting by it is why a meter reads a fridge's 50 Hz hum as
 * quiet when its sound pressure alone would call it loud.
 */
const A_WEIGHTING_POLES = [20.598997, 107.65265, 737.86223, 12194.217] as const

/** One second-order filter section, normalised so that a0 is 1. */
export interface Biquad {
   b0: number
   b1: number
   b2: number
   a1: number
   a2: number
}

/**
 * The analogue A-weighting response at a frequency, in dB relative to
 * 1 kHz — the IEC 61672-1 closed form. This is the target the digital
 * filter below is measured against, not something the meter runs.
 */
export function aWeightingDb(frequency: number): number {
   const [f1, f2, f3, f4] = A_WEIGHTING_POLES

   const response = (f: number): number => {
      const squared = f ** 2
      const numerator = f4 ** 2 * squared ** 2
      const middle = Math.sqrt((squared + f2 ** 2) * (squared + f3 ** 2))

      return numerator / ((squared + f1 ** 2) * middle * (squared + f4 ** 2))
   }

   return 20 * Math.log10(response(frequency) / response(1000))
}

interface FirstOrder {
   b0: number
   b1: number
   a1: number
}

/** The identity section, standing in for a pole the sample rate cannot hold. */
const PASS_THROUGH: FirstOrder = { b0: 1, b1: 0, a1: 0 }

/**
 * One analogue first-order section, s/(s+ω) or ω/(s+ω), through the
 * bilinear transform.
 *
 * The pole is pre-warped, so the digital pole lands on the analogue
 * frequency rather than below it. Without that the 12.2 kHz poles fall to
 * about 10.3 kHz at a 48 kHz sample rate, and the top octave reads more
 * than a decibel quiet.
 *
 * A pole at or past Nyquist cannot be represented at all — `tan` goes
 * negative there and the filter would be unstable — so it is dropped.
 * That only happens to the 12.2 kHz low-pass at sample rates of 24 kHz and
 * below, where the band it shapes does not exist anyway.
 */
function firstOrder(pole: number, sampleRate: number, highPass: boolean): FirstOrder {
   if (pole >= sampleRate * 0.45) return PASS_THROUGH

   const k = 2 * sampleRate
   const omega = k * Math.tan(Math.PI * pole / sampleRate)
   const norm = k + omega

   return {
      b0: (highPass ? k : omega) / norm,
      b1: (highPass ? -k : omega) / norm,
      a1: (omega - k) / norm,
   }
}

/** Two first-order sections multiplied out into one biquad. */
function combine(first: FirstOrder, second: FirstOrder): Biquad {
   return {
      b0: first.b0 * second.b0,
      b1: first.b0 * second.b1 + first.b1 * second.b0,
      b2: first.b1 * second.b1,
      a1: first.a1 + second.a1,
      a2: first.a1 * second.a1,
   }
}

/** The magnitude of a chain of biquads at one frequency, as a plain ratio. */
export function filterMagnitude(sections: readonly Biquad[], frequency: number, sampleRate: number): number {
   const omega = 2 * Math.PI * frequency / sampleRate
   const cos1 = Math.cos(omega)
   const sin1 = Math.sin(omega)
   const cos2 = Math.cos(2 * omega)
   const sin2 = Math.sin(2 * omega)

   return sections.reduce((magnitude, { b0, b1, b2, a1, a2 }) => {
      const numerator = Math.hypot(b0 + b1 * cos1 + b2 * cos2, b1 * sin1 + b2 * sin2)
      const denominator = Math.hypot(1 + a1 * cos1 + a2 * cos2, a1 * sin1 + a2 * sin2)

      return magnitude * numerator / denominator
   }, 1)
}

/**
 * The A-weighting curve as three biquads for a given sample rate.
 *
 * Six analogue poles pair off into three sections: the two 20.6 Hz
 * high-passes, the 107.7 Hz and 737.9 Hz high-passes, and the two 12.2 kHz
 * low-passes. The chain is then scaled to exactly 0 dB at 1 kHz, which is
 * the definition of the curve — so a 1 kHz tone reads the same weighted
 * or not, and the calibration anchor below is unaffected by the filter.
 */
export function aWeightingFilter(sampleRate: number): Biquad[] {
   const [f1, f2, f3, f4] = A_WEIGHTING_POLES

   const sections = [
      combine(firstOrder(f1, sampleRate, true), firstOrder(f1, sampleRate, true)),
      combine(firstOrder(f2, sampleRate, true), firstOrder(f3, sampleRate, true)),
      combine(firstOrder(f4, sampleRate, false), firstOrder(f4, sampleRate, false)),
   ]

   const gain = 1 / filterMagnitude(sections, 1000, sampleRate)
   const [first, ...rest] = sections as [Biquad, ...Biquad[]]

   return [{ ...first, b0: first.b0 * gain, b1: first.b1 * gain, b2: first.b2 * gain }, ...rest]
}

/// --- Measuring -----------------------------------------------------------

/**
 * IEC 61672's "Fast" time weighting, in seconds — the response every
 * sound level meter defaults to. Slow enough that a voice reads as a level
 * rather than as a flicker, quick enough to catch a door slam.
 */
export const FAST_TIME_CONSTANT = 0.125

/** How much audio each reading covers, in seconds. Ten a second. */
export const READING_INTERVAL = 0.1

/**
 * Audio thrown away at the start, in seconds.
 *
 * A filter starting from rest rings on the first samples it is handed, and
 * many microphones click as they open. Neither is the room, and letting
 * either through would pin the session's maximum to an event that never
 * happened.
 */
export const SETTLE_TIME = 0.25

/** The level everything is clamped to, so silence is a number, not -Infinity. */
export const FLOOR_DBFS = -120

/**
 * Below this, the input is a muted or disconnected microphone rather than
 * a quiet room.
 *
 * A real microphone always hisses a little: its own noise sits somewhere
 * around -90 dBFS even in a silent room, and 16-bit audio cannot represent
 * anything much under -100. Readings down here are a stream of zeroes.
 */
export const SILENCE_DBFS = -115

/**
 * A raw sample at this fraction of full scale means the input clipped: the
 * sound was louder than the microphone can represent, and the reading is
 * the microphone's ceiling rather than the sound.
 */
export const CLIP_THRESHOLD = 0.99

/** One tenth of a second of measurement, as the worklet reports it. */
export interface MeterReading {
   /** Seconds measured so far, at the end of this reading. */
   time: number
   /** The Fast-weighted A level at the end of the reading, in dBFS. */
   level: number
   /** The quietest and loudest the Fast level was during the reading. */
   min: number
   max: number
   /**
    * The sum of the squared A-weighted samples, and how many there were.
    * Passed raw rather than as a level so that averages over many readings
    * can be taken over energy — see `sessionAverage`.
    */
   energy: number
   frames: number
   /** How much audio the reading covers, in seconds. */
   duration: number
   /** The largest raw sample, as a fraction of full scale. */
   peak: number
}

/** A mean square as a level in dBFS, floored rather than -Infinity. */
export function meanSquareToDbfs(meanSquare: number): number {
   return Math.max(FLOOR_DBFS, 10 * Math.log10(meanSquare))
}

/**
 * A sound level meter over a stream of blocks — A-weighted, Fast
 * time-weighted, reporting every `READING_INTERVAL`.
 *
 * Each channel is filtered on its own and the loudest one is taken. A
 * microphone is one channel in principle, but interfaces routinely deliver
 * it as two with one of them silent, and averaging those would read 6 dB
 * low; mixing a laptop's two microphones would lose the high frequencies
 * where they cancel.
 *
 * The Fast weighting is applied per block rather than per sample. A block
 * is 128 samples — under three milliseconds — against a 125 ms time
 * constant, so the difference is far below anything the display shows.
 */
export class SoundLevelMeter {
   private readonly sections: Biquad[]
   private readonly settleFrames: number
   private readonly intervalFrames: number
   private readonly sampleRate: number

   /** Two words of state per section, per channel: direct form II transposed. */
   private readonly states: Float64Array[] = []

   private seenFrames = 0
   private measuredFrames = 0
   /** The Fast-weighted mean square, or null until the first block is measured. */
   private fast: number | null = null

   /** The second half of the settling time, averaged to start `fast` from. */
   private warmEnergy = 0
   private warmFrames = 0

   private interval = SoundLevelMeter.emptyInterval()

   constructor(sampleRate: number) {
      this.sampleRate = sampleRate
      this.sections = aWeightingFilter(sampleRate)
      this.settleFrames = Math.round(SETTLE_TIME * sampleRate)
      this.intervalFrames = Math.round(READING_INTERVAL * sampleRate)
   }

   private static emptyInterval(): { frames: number, energy: number, min: number, max: number, peak: number } {
      return { frames: 0, energy: 0, min: Infinity, max: -Infinity, peak: 0 }
   }

   private stateFor(channel: number): Float64Array {
      const existing = this.states[channel]

      if (existing) return existing

      const created = new Float64Array(this.sections.length * 2)

      this.states[channel] = created

      return created
   }

   /**
    * Filter one channel's block through the A-weighting, returning the sum
    * of the squared output and the largest raw sample.
    *
    * A non-finite sample would lodge in the filter state and poison every
    * reading after it, so a block that produces one resets the state and
    * counts as silence instead.
    */
   private weigh(samples: Float32Array, state: Float64Array): { energy: number, peak: number } {
      const { sections } = this
      let energy = 0
      let peak = 0

      for (const sample of samples) {
         let value = sample

         peak = Math.max(peak, Math.abs(sample))

         for (let index = 0; index < sections.length; index += 1) {
            const { b0, b1, b2, a1, a2 } = sections[index] as Biquad
            const z1 = state[index * 2] as number
            const z2 = state[index * 2 + 1] as number
            const output = b0 * value + z1

            state[index * 2] = b1 * value - a1 * output + z2
            state[index * 2 + 1] = b2 * value - a2 * output
            value = output
         }

         energy += value * value
      }

      if (!Number.isFinite(energy)) {
         state.fill(0)

         return { energy: 0, peak: 0 }
      }

      return { energy, peak }
   }

   /**
    * Measure one block — the channels of one render quantum — and return a
    * reading if this block completes one, or null if it does not.
    */
   process(channels: readonly Float32Array[]): MeterReading | null {
      const frames = channels[0]?.length ?? 0

      if (frames === 0) return null

      let energy = 0
      let peak = 0

      channels.forEach((samples, channel) => {
         const weighed = this.weigh(samples, this.stateFor(channel))

         energy = Math.max(energy, weighed.energy)
         peak = Math.max(peak, weighed.peak)
      })

      this.seenFrames += frames

      // The filter runs through the settling time so its state is warm by
      // the end of it; only the measuring waits. The second half is also
      // averaged, to give the Fast weighting somewhere true to start from.
      if (this.seenFrames <= this.settleFrames) {
         if (this.seenFrames > this.settleFrames / 2) {
            this.warmEnergy += energy
            this.warmFrames += frames
         }

         return null
      }

      const meanSquare = energy / frames

      // Not started from the first block alone. A block is under three
      // milliseconds, a third of one cycle of a 100 Hz hum, so its mean
      // square depends on where in the wave it happened to fall — and the
      // first reading would come out as much as 3 dB off, to be recorded
      // as the session's quietest moment.
      this.fast ??= this.warmFrames > 0 ? this.warmEnergy / this.warmFrames : meanSquare
      this.fast += (meanSquare - this.fast) * (1 - Math.exp(-frames / (FAST_TIME_CONSTANT * this.sampleRate)))

      const level = meanSquareToDbfs(this.fast)
      const { interval } = this

      this.measuredFrames += frames
      interval.frames += frames
      interval.energy += energy
      interval.min = Math.min(interval.min, level)
      interval.max = Math.max(interval.max, level)
      interval.peak = Math.max(interval.peak, peak)

      if (interval.frames < this.intervalFrames) return null

      this.interval = SoundLevelMeter.emptyInterval()

      return {
         time: this.measuredFrames / this.sampleRate,
         level,
         min: interval.min,
         max: interval.max,
         energy: interval.energy,
         frames: interval.frames,
         duration: interval.frames / this.sampleRate,
         peak: interval.peak,
      }
   }
}

/// --- A session of readings -----------------------------------------------

/** Everything measured since Start, or since the last reset. */
export interface MeterSession {
   /** Quietest and loudest Fast level, in dBFS; ±Infinity while empty. */
   min: number
   max: number
   energy: number
   frames: number
   /** Seconds of sound measured, silence left out. */
   seconds: number
   /** Whether any reading so far reached the microphone's ceiling. */
   clipped: boolean
}

export function emptySession(): MeterSession {
   return { min: Infinity, max: -Infinity, energy: 0, frames: 0, seconds: 0, clipped: false }
}

/** A reading from a muted or disconnected input — nothing was measured. */
export function isSilentReading(reading: MeterReading): boolean {
   return reading.max <= SILENCE_DBFS
}

/**
 * Fold one reading into a session.
 *
 * A silent reading is left out entirely. Zeroes from a muted microphone
 * are not a very quiet room, and counting them would drag the minimum and
 * the average down to a level nothing in the room ever made.
 */
export function addReading(session: MeterSession, reading: MeterReading): MeterSession {
   if (isSilentReading(reading)) return session

   return {
      min: Math.min(session.min, reading.min),
      max: Math.max(session.max, reading.max),
      energy: session.energy + reading.energy,
      frames: session.frames + reading.frames,
      seconds: session.seconds + reading.duration,
      clipped: session.clipped || reading.peak >= CLIP_THRESHOLD,
   }
}

/**
 * The session's average level in dBFS, or null before anything is
 * measured.
 *
 * An energy average — what a sound level meter calls Leq — rather than
 * the mean of the readings. Decibels are logarithmic, so averaging them
 * directly would let a long quiet stretch cancel out a loud one, when in
 * energy the loud one dominates: ten seconds at 90 dB and fifty at 50 dB
 * average to 82 dB, not 57.
 */
export function sessionAverage(session: MeterSession): number | null {
   if (session.frames === 0) return null

   return meanSquareToDbfs(session.energy / session.frames)
}

/// --- From dBFS to decibels -------------------------------------------------

/**
 * The published anchor between a phone microphone's digital level and
 * real sound pressure.
 *
 * Android's compatibility definition asks that unprocessed voice capture
 * be set so a 90 dB SPL tone at 1 kHz reads -22.35 dBFS. It is the one
 * published figure tying a consumer microphone's digital level to the air
 * in front of it, so the scale starts there. It is still only a starting
 * point: laptops apply their own input gain, other phones differ, and the
 * calibration exists because no default can be right everywhere.
 */
export const REFERENCE_SOUND_LEVEL = 90
export const REFERENCE_DBFS = -22.35

/** The sound level that would read 0 dBFS, before any calibration. */
export const DEFAULT_OFFSET = REFERENCE_SOUND_LEVEL - REFERENCE_DBFS

/** The calibration range, in whole decibels either side of the default. */
export const CALIBRATION_MIN = -30
export const CALIBRATION_MAX = 30

/**
 * Bring a calibration into range as a whole number of decibels.
 *
 * Whole decibels because the microphone is not good to a fraction of
 * one, and a finer control would promise a precision the reading lacks.
 * `NaN` returns to the default rather than clamping to either end — an
 * emptied field is not a request for -30.
 */
export function clampCalibration(value: number): number {
   if (Number.isNaN(value)) return 0

   return Math.min(CALIBRATION_MAX, Math.max(CALIBRATION_MIN, Math.round(value)))
}

/** A dBFS level as an estimated sound level in dB, calibration applied. */
export function toSoundLevel(dbfs: number, calibration: number): number {
   return dbfs + DEFAULT_OFFSET + calibration
}

/// --- Reading it ------------------------------------------------------------

/**
 * The span the meter bar and the history graph both draw, in dB.
 *
 * Fixed rather than fitted to the data, so the graph does not rescale
 * under someone watching it. Twenty is below any real room and 120 is
 * past what a phone microphone can capture before it clips.
 */
export const SCALE_MIN = 20
export const SCALE_MAX = 120

/** Where a level sits on the scale, from 0 at the bottom to 1 at the top. */
export function scalePosition(level: number): number {
   return Math.min(1, Math.max(0, (level - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)))
}

/**
 * The point nearest a moment, from points in time order — what the
 * history graph's crosshair snaps to. A binary search, because the pointer
 * asks on every move and a minute of history is six hundred points.
 */
export function nearestByTime<Point extends { time: number }>(points: readonly Point[], time: number): Point | undefined {
   let low = 0
   let high = points.length - 1

   while (low < high) {
      const middle = Math.floor((low + high) / 2)

      if ((points[middle]?.time ?? Infinity) < time) low = middle + 1
      else high = middle
   }

   const after = points[low]
   const before = points[low - 1]

   if (before && after && time - before.time < after.time - time) return before

   return after
}

/**
 * Everyday sounds and their typical level, for putting a reading in
 * context. Typical, and rounded: a real motorcycle is louder or quieter
 * depending on the motorcycle and how far away it is.
 */
export type SoundReferenceId
   = | "watch"
     | "whisper"
     | "fridge"
     | "conversation"
     | "washer"
     | "traffic"
     | "motorcycle"
     | "horn"
     | "concert"
     | "siren"
     | "fireworks"

export interface SoundReference {
   id: SoundReferenceId
   level: number
}

export const SOUND_REFERENCES: readonly SoundReference[] = [
   { id: "watch", level: 20 },
   { id: "whisper", level: 30 },
   { id: "fridge", level: 40 },
   { id: "conversation", level: 60 },
   { id: "washer", level: 70 },
   { id: "traffic", level: 85 },
   { id: "motorcycle", level: 95 },
   { id: "horn", level: 100 },
   { id: "concert", level: 110 },
   { id: "siren", level: 120 },
   { id: "fireworks", level: 140 },
]

/** The everyday sound closest in level to a reading. */
export function nearestReference(level: number): SoundReferenceId {
   let nearest = SOUND_REFERENCES[0] as SoundReference

   for (const reference of SOUND_REFERENCES) {
      if (Math.abs(reference.level - level) < Math.abs(nearest.level - level)) nearest = reference
   }

   return nearest.id
}

/**
 * NIOSH's recommended exposure limit: 85 dB(A), averaged over an
 * eight-hour day. Every 3 dB above it halves the time, so 100 dB is a
 * quarter of an hour — which is where `harmful` starts.
 */
export const HEARING_RISK_LEVEL = 85
export const HEARING_HARM_LEVEL = 100

/**
 * How much sound has to be measured before its average is read as an
 * exposure, in seconds.
 *
 * The average is an energy average, and energy is dominated by the loud
 * moments — a single clap in the first second of a run takes it past 85
 * dB on its own. That is the right arithmetic and the wrong warning:
 * exposure is sound over time, and a notice that fired on every clap
 * would be ignored by the time it meant something. After ten seconds, a
 * clap moves the average by a few decibels rather than by thirty.
 */
export const EXPOSURE_MIN_SECONDS = 10

export type LoudnessZone = "safe" | "risky" | "harmful"

export function loudnessZone(level: number): LoudnessZone {
   if (level >= HEARING_HARM_LEVEL) return "harmful"
   if (level >= HEARING_RISK_LEVEL) return "risky"

   return "safe"
}
