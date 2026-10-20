import { describe, expect, it } from "vitest"
// Relative, not aliased: `~` is a Nuxt convenience that exists only inside
// the Nuxt/Vite environment, and these tests run in plain Node.
import {
   addReading,
   aWeightingDb,
   aWeightingFilter,
   bandMeanSquares,
   clampCalibration,
   DEFAULT_OFFSET,
   emptySession,
   FAST_TIME_CONSTANT,
   filterMagnitude,
   FLOOR_DBFS,
   isSilentReading,
   loudestBand,
   loudnessZone,
   meanSquareToDbfs,
   type MeterReading,
   nearestByTime,
   nearestReference,
   OCTAVE_BANDS,
   REFERENCE_DBFS,
   scalePosition,
   sessionAverage,
   SETTLE_TIME,
   smoothBands,
   SOUND_REFERENCES,
   SoundLevelMeter,
   SPECTRUM_FFT_SIZE,
   spectrumLayout,
   toSoundLevel,
} from "../../app/utils/decibel"

/// The meter is tested the way it runs: synthetic audio in render-quantum
/// blocks, through the same class the worklet wraps. A tone of known
/// amplitude has a level that can be worked out on paper, which is what
/// makes these assertions exact rather than plausible.

const BLOCK = 128

/** A sine of the given peak amplitude — full scale is 1. */
function tone(frequency: number, amplitude: number, seconds: number, sampleRate = 48000): Float32Array {
   const samples = new Float32Array(Math.round(seconds * sampleRate))

   for (let index = 0; index < samples.length; index += 1) {
      samples[index] = amplitude * Math.sin(2 * Math.PI * frequency * index / sampleRate)
   }

   return samples
}

function silence(seconds: number, sampleRate = 48000): Float32Array {
   return new Float32Array(Math.round(seconds * sampleRate))
}

function join(...parts: Float32Array[]): Float32Array {
   const joined = new Float32Array(parts.reduce((total, part) => total + part.length, 0))
   let offset = 0

   for (const part of parts) {
      joined.set(part, offset)
      offset += part.length
   }

   return joined
}

/** Run channels through a meter in blocks and collect what it reports. */
function measure(meter: SoundLevelMeter, channels: Float32Array[]): MeterReading[] {
   const readings: MeterReading[] = []
   const length = channels[0]?.length ?? 0

   for (let start = 0; start < length; start += BLOCK) {
      const reading = meter.process(channels.map((channel) => channel.subarray(start, start + BLOCK)))

      if (reading) readings.push(reading)
   }

   return readings
}

function last(readings: MeterReading[]): MeterReading {
   const reading = readings.at(-1)

   if (!reading) throw new Error("the meter reported nothing")

   return reading
}

/** The level of a sine in dBFS: its RMS is its peak over root two. */
function sineDbfs(amplitude: number): number {
   return 20 * Math.log10(amplitude / Math.SQRT2)
}

describe("aWeightingDb", () => {
   /// IEC 61672-1's design goals, at the exact base-ten frequencies the
   /// nominal ones stand for — "31.5 Hz" is 10^1.5, and the table's -39.4
   /// is the curve there rather than at 31.5 itself.
   it("matches the IEC 61672-1 table", () => {
      const table: [number, number][] = [
         [-15, -39.4],
         [-12, -26.2],
         [-9, -16.1],
         [-6, -8.6],
         [-3, -3.2],
         [0, 0],
         [3, 1.2],
         [6, 1.0],
         [9, -1.1],
         [12, -6.6],
      ]

      for (const [band, expected] of table) {
         const frequency = 1000 * 10 ** (band / 10)

         expect(aWeightingDb(frequency), `${frequency.toFixed(1)} Hz`).toBeCloseTo(expected, 1)
      }
   })
})

describe("aWeightingFilter", () => {
   for (const sampleRate of [44100, 48000, 96000]) {
      const filter = aWeightingFilter(sampleRate)
      const response = (frequency: number): number =>
         20 * Math.log10(filterMagnitude(filter, frequency, sampleRate))

      it(`is exactly 0 dB at 1 kHz at ${sampleRate} Hz`, () => {
         expect(response(1000)).toBeCloseTo(0, 9)
      })

      it(`follows the curve through the speech band at ${sampleRate} Hz`, () => {
         for (let frequency = 10; frequency <= 2000; frequency *= 1.25) {
            expect(Math.abs(response(frequency) - aWeightingDb(frequency)), `${frequency} Hz`)
               .toBeLessThan(0.1)
         }
      })

      /// The bilinear transform bends the top of the band. Pre-warping pins
      /// the 12.2 kHz poles where they belong, which keeps the error under a
      /// decibel to 12.5 kHz — far inside IEC 61672's class 1 allowance, and
      /// far inside the error of any phone microphone feeding it.
      it(`stays within a decibel of the curve to 12.5 kHz at ${sampleRate} Hz`, () => {
         for (let frequency = 2000; frequency <= 12500; frequency *= 1.1) {
            expect(Math.abs(response(frequency) - aWeightingDb(frequency)), `${frequency} Hz`)
               .toBeLessThan(1)
         }
      })
   }

   /// A pole past Nyquist would turn the filter unstable, and a context
   /// opened on a Bluetooth headset can run as low as 8 kHz.
   it("stays stable at every sample rate a context can run at", () => {
      for (const sampleRate of [8000, 16000, 22050, 24000, 32000, 44100, 48000, 96000, 192000]) {
         for (const { a1, a2 } of aWeightingFilter(sampleRate)) {
            expect(Math.abs(a2), `${sampleRate} Hz`).toBeLessThan(1)
            expect(Math.abs(a1), `${sampleRate} Hz`).toBeLessThan(1 + a2)
         }
      }
   })
})

describe("SoundLevelMeter", () => {
   it("reads a 1 kHz tone at its RMS level", () => {
      for (const amplitude of [1, 0.5, 0.1, 0.001]) {
         const readings = measure(new SoundLevelMeter(48000), [tone(1000, amplitude, 1.5)])

         expect(last(readings).level, `amplitude ${amplitude}`).toBeCloseTo(sineDbfs(amplitude), 1)
      }
   })

   it("weights a low tone down the way the ear does", () => {
      const readings = measure(new SoundLevelMeter(48000), [tone(100, 0.5, 1.5)])

      expect(last(readings).level).toBeCloseTo(sineDbfs(0.5) + aWeightingDb(100), 1)
   })

   /// A block is a fraction of one cycle of a low hum, so a meter that
   /// started from a single block would open up to 3 dB off, depending on
   /// where in the wave it landed — and log that as the quietest moment.
   it("opens on the true level whatever the phase of a low tone", () => {
      for (const phase of [0, 0.125, 0.25, 0.5, 0.75]) {
         const sampleRate = 44100
         const samples = new Float32Array(sampleRate * 2)

         for (let index = 0; index < samples.length; index += 1) {
            samples[index] = 0.1 * Math.sin(2 * Math.PI * (100 * index / sampleRate + phase))
         }

         const readings = measure(new SoundLevelMeter(sampleRate), [samples])
         const steady = last(readings).level

         for (const reading of readings) {
            expect(Math.abs(reading.min - steady), `phase ${phase}`).toBeLessThan(0.25)
            expect(Math.abs(reading.max - steady), `phase ${phase}`).toBeLessThan(0.25)
         }
      }
   })

   it("reads the same at 44.1 kHz as at 48 kHz", () => {
      const at44 = last(measure(new SoundLevelMeter(44100), [tone(1000, 0.25, 1.5, 44100)]))
      const at48 = last(measure(new SoundLevelMeter(48000), [tone(1000, 0.25, 1.5)]))

      expect(at44.level).toBeCloseTo(at48.level, 1)
   })

   it("reports nothing until the settling time has passed", () => {
      const meter = new SoundLevelMeter(48000)

      expect(measure(meter, [tone(1000, 0.5, SETTLE_TIME)])).toEqual([])
   })

   it("reports about ten times a second, in time order", () => {
      const readings = measure(new SoundLevelMeter(48000), [tone(1000, 0.5, SETTLE_TIME + 5)])

      expect(readings.length).toBeGreaterThanOrEqual(48)
      expect(readings.length).toBeLessThanOrEqual(50)

      for (let index = 1; index < readings.length; index += 1) {
         const gap = (readings[index]?.time ?? 0) - (readings[index - 1]?.time ?? 0)

         expect(gap).toBeGreaterThan(0.09)
         expect(gap).toBeLessThan(0.11)
      }
   })

   /// IEC 61672 defines Fast by its decay: 34.7 dB a second once the sound
   /// stops, which is ten log e over 125 ms.
   it("decays at the Fast rate once the sound stops", () => {
      const readings = measure(new SoundLevelMeter(48000), [join(tone(1000, 0.5, 1), silence(1))])
      const falling = readings.filter((reading) => reading.time > 1)
      const first = falling[1]
      const final = falling.at(-2)

      if (!first || !final) throw new Error("the meter reported nothing after the tone")

      const rate = (first.level - final.level) / (final.time - first.time)

      expect(rate).toBeCloseTo(34.7, 0)
   })

   it("floors silence rather than returning -Infinity", () => {
      const reading = last(measure(new SoundLevelMeter(48000), [silence(1)]))

      expect(reading.level).toBe(FLOOR_DBFS)
      expect(isSilentReading(reading)).toBe(true)
   })

   /// An interface that delivers the microphone on the right channel with
   /// the left one silent is common, and averaging the two would read the
   /// room 6 dB quiet.
   it("measures the loudest channel", () => {
      const mono = last(measure(new SoundLevelMeter(48000), [tone(1000, 0.3, 1)]))
      const oneSided = last(measure(new SoundLevelMeter(48000), [silence(1), tone(1000, 0.3, 1)]))

      expect(oneSided.level).toBeCloseTo(mono.level, 6)
   })

   it("reports the largest raw sample, so clipping can be seen", () => {
      const quiet = last(measure(new SoundLevelMeter(48000), [tone(1000, 0.5, 1)]))
      const clipped = last(measure(new SoundLevelMeter(48000), [tone(1000, 1, 1)]))

      expect(quiet.peak).toBeCloseTo(0.5, 2)
      expect(clipped.peak).toBeCloseTo(1, 2)
   })

   /// A NaN lodged in the filter state would poison every reading after
   /// it. The meter has to shrug one off and go on measuring.
   it("recovers from a non-finite sample", () => {
      const poisoned = tone(1000, 0.5, 2)

      poisoned[20000] = Number.NaN

      const reading = last(measure(new SoundLevelMeter(48000), [poisoned]))

      expect(reading.level).toBeCloseTo(sineDbfs(0.5), 1)
   })

   it("tracks the quietest and loudest moments within each reading", () => {
      const readings = measure(new SoundLevelMeter(48000), [join(tone(1000, 0.5, 1), silence(0.5))])

      for (const reading of readings) {
         expect(reading.min).toBeLessThanOrEqual(reading.level)
         expect(reading.max).toBeGreaterThanOrEqual(reading.level)
      }
   })
})

/** A hand-built reading at a steady level, for the session arithmetic. */
function steady(dbfs: number, seconds: number, peak = 0.1): MeterReading {
   const frames = Math.round(seconds * 48000)

   return {
      time: seconds,
      level: dbfs,
      min: dbfs,
      max: dbfs,
      energy: 10 ** (dbfs / 10) * frames,
      frames,
      duration: seconds,
      peak,
   }
}

describe("a session of readings", () => {
   it("starts empty, with no average", () => {
      expect(sessionAverage(emptySession())).toBeNull()
   })

   it("averages a steady tone to its own level", () => {
      const session = measure(new SoundLevelMeter(48000), [tone(1000, 0.2, 3)])
         .reduce(addReading, emptySession())

      expect(sessionAverage(session)).toBeCloseTo(sineDbfs(0.2), 1)
   })

   /// The example the FAQ gives, worked through the real code rather than
   /// asserted in prose: energy, not decibels, is what gets averaged.
   it("averages energy rather than decibels", () => {
      // The dBFS reading that comes out as this many decibels, uncalibrated.
      const at = (level: number): number => level - DEFAULT_OFFSET
      const readings = [
         ...Array.from({ length: 100 }, () => steady(at(90), 0.1)),
         ...Array.from({ length: 500 }, () => steady(at(50), 0.1)),
      ]
      const session = readings.reduce(addReading, emptySession())
      const average = sessionAverage(session)

      expect(average === null ? null : toSoundLevel(average, 0)).toBeCloseTo(82.2, 1)
   })

   it("keeps the extremes", () => {
      const session = [steady(-40, 0.1), steady(-20, 0.1), steady(-60, 0.1)]
         .reduce(addReading, emptySession())

      expect(session.min).toBe(-60)
      expect(session.max).toBe(-20)
   })

   it("leaves a muted microphone out entirely", () => {
      const session = [steady(-40, 0.1), steady(FLOOR_DBFS, 0.1)].reduce(addReading, emptySession())

      expect(session.min).toBe(-40)
      expect(session.seconds).toBeCloseTo(0.1, 9)
      expect(sessionAverage(session)).toBeCloseTo(-40, 6)
   })

   it("counts the seconds the meter really measured", () => {
      const readings = measure(new SoundLevelMeter(48000), [tone(1000, 0.2, SETTLE_TIME + 3)])
      const session = readings.reduce(addReading, emptySession())

      expect(session.seconds).toBeCloseTo(last(readings).time, 9)
      expect(session.seconds).toBeGreaterThan(2.9)
   })

   it("remembers that the input clipped", () => {
      const clean = [steady(-20, 0.1), steady(-10, 0.1)].reduce(addReading, emptySession())
      const clipped = [steady(-20, 0.1), steady(-3, 0.1, 1), steady(-20, 0.1)]
         .reduce(addReading, emptySession())

      expect(clean.clipped).toBe(false)
      expect(clipped.clipped).toBe(true)
   })
})

describe("toSoundLevel", () => {
   it("puts the reference level at 90 dB", () => {
      expect(toSoundLevel(REFERENCE_DBFS, 0)).toBeCloseTo(90, 9)
   })

   it("shifts every level by the calibration", () => {
      expect(toSoundLevel(-40, 3) - toSoundLevel(-40, 0)).toBeCloseTo(3, 9)
      expect(toSoundLevel(0, 0)).toBeCloseTo(DEFAULT_OFFSET, 9)
   })
})

describe("clampCalibration", () => {
   it("rounds to a whole decibel", () => {
      expect(clampCalibration(2.6)).toBe(3)
      expect(clampCalibration(-2.4)).toBe(-2)
   })

   it("clamps to the range", () => {
      expect(clampCalibration(45)).toBe(30)
      expect(clampCalibration(-45)).toBe(-30)
      expect(clampCalibration(Number.POSITIVE_INFINITY)).toBe(30)
   })

   it("returns an emptied field to the default rather than an end", () => {
      expect(clampCalibration(Number.NaN)).toBe(0)
   })
})

describe("scalePosition", () => {
   it("maps the scale onto 0 to 1 and clamps past either end", () => {
      expect(scalePosition(20)).toBe(0)
      expect(scalePosition(70)).toBe(0.5)
      expect(scalePosition(120)).toBe(1)
      expect(scalePosition(-10)).toBe(0)
      expect(scalePosition(200)).toBe(1)
   })

   it("takes another scale's ends", () => {
      expect(scalePosition(25, 0, 100)).toBe(0.25)
      expect(scalePosition(-5, 0, 100)).toBe(0)
   })
})

/// --- The spectrum -----------------------------------------------------------
///
/// The analyser is emulated to the letter of the Web Audio specification —
/// a Blackman window with α = 0.16, an FFT scaled by 1/N, 20·log10 of each
/// magnitude — so the band arithmetic is tested against the same numbers
/// `getFloatFrequencyData` hands the page.

/** An in-place iterative radix-2 FFT. */
function fft(real: Float64Array, imag: Float64Array): void {
   const size = real.length
   const at = (array: Float64Array, index: number): number => array[index] ?? 0

   for (let index = 1, swap = 0; index < size; index += 1) {
      let bit = size / 2

      while (swap >= bit && bit >= 1) {
         swap -= bit
         bit /= 2
      }

      swap += bit

      if (index < swap) {
         [real[index], real[swap]] = [at(real, swap), at(real, index)]
         ;[imag[index], imag[swap]] = [at(imag, swap), at(imag, index)]
      }
   }

   for (let length = 2; length <= size; length *= 2) {
      const angle = -2 * Math.PI / length

      for (let start = 0; start < size; start += length) {
         for (let offset = 0; offset < length / 2; offset += 1) {
            const even = start + offset
            const odd = even + length / 2
            const cos = Math.cos(angle * offset)
            const sin = Math.sin(angle * offset)
            const oddReal = at(real, odd) * cos - at(imag, odd) * sin
            const oddImag = at(real, odd) * sin + at(imag, odd) * cos

            real[odd] = at(real, even) - oddReal
            imag[odd] = at(imag, even) - oddImag
            real[even] = at(real, even) + oddReal
            imag[even] = at(imag, even) + oddImag
         }
      }
   }
}

/** What `getFloatFrequencyData` fills in for one block of samples. */
function analyse(samples: Float32Array): Float32Array {
   const size = samples.length
   const real = new Float64Array(size)
   const imag = new Float64Array(size)

   for (let index = 0; index < size; index += 1) {
      const phase = 2 * Math.PI * index / size
      const window = 0.42 - 0.5 * Math.cos(phase) + 0.08 * Math.cos(2 * phase)

      real[index] = (samples[index] ?? 0) * window
   }

   fft(real, imag)

   return Float32Array.from({ length: size / 2 }, (_, bin) =>
      20 * Math.log10(Math.hypot(real[bin] ?? 0, imag[bin] ?? 0) / size))
}

/** Band levels in dBFS, or null past Nyquist. */
function bandLevels(samples: Float32Array, sampleRate = 48000): (number | null)[] {
   const layout = spectrumLayout(sampleRate, samples.length)

   return bandMeanSquares(analyse(samples), layout)
      .map((meanSquare) => meanSquare === null ? null : meanSquareToDbfs(meanSquare))
}

/** Several sines summed, each given as [frequency, peak amplitude]. */
function chord(parts: [number, number][], length: number, sampleRate = 48000): Float32Array {
   return Float32Array.from({ length }, (_, index) =>
      parts.reduce((sum, [frequency, amplitude]) =>
         sum + amplitude * Math.sin(2 * Math.PI * frequency * index / sampleRate), 0))
}

describe("OCTAVE_BANDS", () => {
   it("is ten bands, each an octave above the last", () => {
      expect(OCTAVE_BANDS).toHaveLength(10)

      for (let index = 1; index < OCTAVE_BANDS.length; index += 1) {
         expect((OCTAVE_BANDS[index] ?? 0) / (OCTAVE_BANDS[index - 1] ?? 1)).toBeCloseTo(2, 0)
      }
   })
})

describe("spectrumLayout", () => {
   it("lays the bands end to end, with every band holding bins", () => {
      const { bands } = spectrumLayout(48000, SPECTRUM_FFT_SIZE)

      for (let index = 1; index < bands.length; index += 1) {
         expect(bands[index]?.start).toBe(bands[index - 1]?.end)
      }

      for (const { start, end } of bands) expect(end).toBeGreaterThan(start)

      // Four bins in the lowest band is what the FFT size was chosen for.
      expect((bands[0]?.end ?? 0) - (bands[0]?.start ?? 0)).toBeGreaterThanOrEqual(4)
   })

   it("leaves a band past Nyquist empty rather than inventing it", () => {
      const { bands } = spectrumLayout(16000, SPECTRUM_FFT_SIZE)
      const top = bands.at(-1)

      expect(top?.end).toBe(top?.start)
   })
})

describe("bandMeanSquares", () => {
   it("puts a tone in its own band, at the tone's level", () => {
      const levels = bandLevels(chord([[1000, 0.5]], SPECTRUM_FFT_SIZE))
      const toneBand = OCTAVE_BANDS.indexOf(1000)

      expect(levels[toneBand]).toBeCloseTo(sineDbfs(0.5), 1)

      levels.forEach((level, index) => {
         if (index !== toneBand) expect(level ?? FLOOR_DBFS).toBeLessThan(sineDbfs(0.5) - 50)
      })
   })

   it("weights a low tone down, as the reading does", () => {
      const levels = bandLevels(chord([[100, 0.5]], SPECTRUM_FFT_SIZE))

      expect(levels[OCTAVE_BANDS.indexOf(125)]).toBeCloseTo(sineDbfs(0.5) + aWeightingDb(100), 0)
   })

   /// The claim the FAQ makes: the bars are a breakdown of the reading. Their
   /// energy has to add back up to what the meter measures from the same
   /// sound, through a completely different path.
   it("adds up to the meter's own reading", () => {
      const parts: [number, number][] = [[250, 0.3], [1000, 0.2], [4000, 0.1]]
      const bands = bandLevels(chord(parts, SPECTRUM_FFT_SIZE))
      const total = meanSquareToDbfs(bands.reduce<number>((sum, level) => sum + 10 ** ((level ?? FLOOR_DBFS) / 10), 0))
      const meter = last(measure(new SoundLevelMeter(48000), [chord(parts, 48000 * 2)]))

      expect(Math.abs(total - meter.level)).toBeLessThan(0.25)
   })

   it("floors silence in every band", () => {
      for (const level of bandLevels(new Float32Array(SPECTRUM_FFT_SIZE))) expect(level).toBe(FLOOR_DBFS)
   })
})

describe("smoothBands", () => {
   it("starts from the first frame, and holds a band that goes missing", () => {
      expect(smoothBands(null, [1, null], 0.05)).toEqual([1, null])
      expect(smoothBands([1, 2], [null, 4], 0.05)).toEqual([null, 4 - (4 - 2) * Math.exp(-0.05 / FAST_TIME_CONSTANT)])
   })

   it("moves by the Fast weighting between frames", () => {
      const [smoothed] = smoothBands([1], [2], FAST_TIME_CONSTANT)

      expect(smoothed).toBeCloseTo(1 + (1 - Math.exp(-1)), 9)
      expect(smoothBands([1], [2], 0)).toEqual([1])
   })
})

describe("nearestByTime", () => {
   const points = [0.1, 0.2, 0.3, 0.4, 0.5].map((time) => ({ time }))

   it("snaps to the closest point on either side", () => {
      expect(nearestByTime(points, 0.24)?.time).toBe(0.2)
      expect(nearestByTime(points, 0.26)?.time).toBe(0.3)
      expect(nearestByTime(points, 0.4)?.time).toBe(0.4)
   })

   it("holds at the ends, and finds nothing in nothing", () => {
      expect(nearestByTime(points, -5)?.time).toBe(0.1)
      expect(nearestByTime(points, 5)?.time).toBe(0.5)
      expect(nearestByTime([], 1)).toBeUndefined()
   })
})

describe("nearestReference", () => {
   it("lists the everyday sounds quietest first, one per level", () => {
      const levels = SOUND_REFERENCES.map((reference) => reference.level)

      expect(levels).toEqual([...levels].sort((a, b) => a - b))
      expect(new Set(levels).size).toBe(levels.length)
   })

   it("picks the closest everyday sound", () => {
      expect(nearestReference(62)).toBe("conversation")
      expect(nearestReference(66)).toBe("washer")
      expect(nearestReference(96)).toBe("motorcycle")
   })

   it("holds at either end of the list", () => {
      expect(nearestReference(0)).toBe("watch")
      expect(nearestReference(180)).toBe("fireworks")
   })
})

describe("loudnessZone", () => {
   it("turns risky at the NIOSH limit and harmful at 100 dB", () => {
      expect(loudnessZone(84.9)).toBe("safe")
      expect(loudnessZone(85)).toBe("risky")
      expect(loudnessZone(99.9)).toBe("risky")
      expect(loudnessZone(100)).toBe("harmful")
   })
})

describe("loudestBand", () => {
   it("picks the loudest band", () => {
      expect(loudestBand([-60, -30, -45], null)).toBe(1)
   })

   it("holds the band on show against a rival inside the margin", () => {
      expect(loudestBand([-30.5, -30], 0)).toBe(0)
      expect(loudestBand([-32, -30], 0)).toBe(1)
   })

   it("never calls silence the loudest", () => {
      expect(loudestBand([FLOOR_DBFS, null, FLOOR_DBFS], null)).toBeNull()
      expect(loudestBand([FLOOR_DBFS, -40], 0)).toBe(1)
   })
})
