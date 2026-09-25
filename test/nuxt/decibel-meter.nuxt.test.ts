import { type DOMWrapper, flushPromises, type VueWrapper } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import DecibelMeterPanel from "../../app/components/DecibelMeterPanel.vue"
import { DECIBEL_CALIBRATION_STORAGE_KEY } from "../../app/composables/useDecibelCalibration"
import { COPY } from "../../app/utils/copy"
import { DEFAULT_OFFSET, type MeterReading, SOUND_REFERENCES } from "../../app/utils/decibel"

/// The measuring itself is tested sample by sample in test/unit. What can
/// rot here is the wiring around it, and one piece of that matters more
/// than the rest: the microphone has to be let go of — on Stop, on a
/// failed start, and when the page is left mid-run. A regression there
/// leaves the browser recording with nothing on screen to say so.
///
/// happy-dom has no audio stack, so the browser's side is faked: a
/// microphone whose tracks record whether they were stopped, and a
/// worklet node whose port the tests post readings through by hand.

class FakeTrack {
   readonly stop = vi.fn()
   private readonly listeners = new Map<string, () => void>()

   addEventListener(type: string, listener: () => void): void {
      this.listeners.set(type, listener)
   }

   /** What the browser does when the device is unplugged. */
   end(): void {
      this.listeners.get("ended")?.()
   }
}

/**
 * An analyser that always hears one tone in the 1 kHz band: at 48 kHz and
 * 8192 points, bin 171 is 1,002 Hz.
 */
class FakeAnalyser {
   static made: FakeAnalyser[] = []

   fftSize = 2048
   smoothingTimeConstant = 0.8
   readonly connect = vi.fn()
   readonly disconnect = vi.fn()
   readonly getFloatFrequencyData = vi.fn((bins: Float32Array) => {
      bins.fill(Number.NEGATIVE_INFINITY)
      bins[171] = -30
   })

   constructor() {
      FakeAnalyser.made.push(this)
   }

   get frequencyBinCount(): number {
      return this.fftSize / 2
   }
}

class FakeAudioContext {
   static made: FakeAudioContext[] = []

   readonly sampleRate = 48000
   readonly destination = {}
   readonly audioWorklet = { addModule: vi.fn(async() => {}) }
   readonly resume = vi.fn(async() => {})
   readonly close = vi.fn(async() => {})
   readonly createMediaStreamSource = vi.fn(() => ({ connect: vi.fn() }))
   readonly createAnalyser = vi.fn(() => new FakeAnalyser())

   constructor() {
      FakeAudioContext.made.push(this)
   }
}

/** A browser that will not make an audio context at all. */
class RefusedAudioContext extends FakeAudioContext {
   constructor() {
      super()
      throw new DOMException("Cannot create an audio context", "NotSupportedError")
   }
}

class FakeWorkletNode {
   static made: FakeWorkletNode[] = []

   readonly port: { onmessage: ((event: { data: MeterReading }) => void) | null } = { onmessage: null }
   readonly connect = vi.fn()
   readonly disconnect = vi.fn()

   constructor() {
      FakeWorkletNode.made.push(this)
   }
}

let track: FakeTrack
let getUserMedia: ReturnType<typeof vi.fn>

beforeEach(() => {
   track = new FakeTrack()
   getUserMedia = vi.fn(async() => ({ getTracks: () => [track], getAudioTracks: () => [track] }))
   FakeAudioContext.made = []
   FakeWorkletNode.made = []
   FakeAnalyser.made = []

   vi.stubGlobal("isSecureContext", true)
   vi.stubGlobal("AudioContext", FakeAudioContext)
   vi.stubGlobal("AudioWorkletNode", FakeWorkletNode)
   Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true })
})

afterEach(() => {
   vi.unstubAllGlobals()
   Reflect.deleteProperty(navigator, "mediaDevices")
   localStorage.removeItem(DECIBEL_CALIBRATION_STORAGE_KEY)
})

/** A tenth of a second at a steady level, given in decibels as displayed. */
function reading(time: number, decibels: number, peak = 0.1): MeterReading {
   const dbfs = decibels - DEFAULT_OFFSET
   const frames = 4800

   return {
      time,
      level: dbfs,
      min: dbfs,
      max: dbfs,
      energy: 10 ** (dbfs / 10) * frames,
      frames,
      duration: 0.1,
      peak,
   }
}

/** Readings every tenth of a second from `from`, all at one level. */
const run = (from: number, count: number, decibels: number): MeterReading[] =>
   Array.from({ length: count }, (_, index) => reading(from + index / 10, decibels))

const primary = (panel: VueWrapper): DOMWrapper<Element> => panel.find(".button--primary")
const value = (panel: VueWrapper): string => panel.find(".decibel__value").text()
const tiles = (panel: VueWrapper): string[] =>
   panel.findAll(".decibel__stat .stat__value").map((tile) => tile.text().replace(/\s+/gu, " "))

async function startRun(panel: VueWrapper): Promise<FakeWorkletNode> {
   await primary(panel).trigger("click")
   await flushPromises()

   const node = FakeWorkletNode.made.at(-1)

   if (!node) throw new Error("the meter never built its worklet node")

   return node
}

async function send(panel: VueWrapper, node: FakeWorkletNode, ...readings: MeterReading[]): Promise<void> {
   for (const next of readings) node.port.onmessage?.({ data: next })

   await panel.vm.$nextTick()
}

describe("DecibelMeterPanel — before Start", () => {
   it("renders an empty reading and asks nothing of the browser", async() => {
      const panel = await mountSuspended(DecibelMeterPanel)

      expect(value(panel)).toBe("—")
      expect(panel.text()).toContain(COPY.decibel.idle)
      expect(primary(panel).text()).toBe(COPY.decibel.start)
      expect(getUserMedia).not.toHaveBeenCalled()
      expect(FakeAudioContext.made).toHaveLength(0)
   })

   it("lists every reference sound in the server-rendered table", async() => {
      const panel = await mountSuspended(DecibelMeterPanel)

      expect(panel.findAll("tbody tr")).toHaveLength(SOUND_REFERENCES.length)
   })

   it("labels the calibration control", async() => {
      const panel = await mountSuspended(DecibelMeterPanel)
      const slider = panel.find("input[type='range']")

      expect(panel.find(`label[for="${slider.attributes("id")}"]`).exists()).toBe(true)
   })
})

describe("DecibelMeterPanel — starting", () => {
   it("asks for the microphone with every processing stage off", async() => {
      const panel = await mountSuspended(DecibelMeterPanel)

      await startRun(panel)

      expect(getUserMedia).toHaveBeenCalledWith({
         audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
         video: false,
      })
      expect(panel.find(".decibel__status").text()).toBe(COPY.decibel.listening)
      expect(primary(panel).text()).toBe(COPY.decibel.stop)
   })

   it("says so, and lets go of the audio context, when access is refused", async() => {
      getUserMedia.mockRejectedValueOnce(new DOMException("Permission denied", "NotAllowedError"))

      const panel = await mountSuspended(DecibelMeterPanel)

      await primary(panel).trigger("click")
      await flushPromises()

      expect(panel.find(".notice").text()).toBe(COPY.decibel.faults.denied)
      expect(FakeAudioContext.made[0]?.close).toHaveBeenCalled()
      expect(primary(panel).text()).toBe(COPY.decibel.start)
   })

   it("ends as a fault, not stuck starting, when the browser refuses an audio context", async() => {
      vi.stubGlobal("AudioContext", RefusedAudioContext)

      const panel = await mountSuspended(DecibelMeterPanel)

      await primary(panel).trigger("click")
      await flushPromises()

      expect(panel.find(".notice").text()).toBe(COPY.decibel.faults.failed)
      expect(primary(panel).text()).toBe(COPY.decibel.start)
      expect(getUserMedia).not.toHaveBeenCalled()
   })

   it("reports a browser with no microphone API as unsupported", async() => {
      Object.defineProperty(navigator, "mediaDevices", { value: undefined, configurable: true })

      const panel = await mountSuspended(DecibelMeterPanel)

      await primary(panel).trigger("click")
      await flushPromises()

      expect(panel.find(".notice").text()).toBe(COPY.decibel.faults.unsupported)
   })

   it("reports an insecure page as insecure, not as an old browser", async() => {
      vi.stubGlobal("isSecureContext", false)

      const panel = await mountSuspended(DecibelMeterPanel)

      await primary(panel).trigger("click")
      await flushPromises()

      expect(panel.find(".notice").text()).toBe(COPY.decibel.faults.insecure)
      expect(getUserMedia).not.toHaveBeenCalled()
   })
})

describe("DecibelMeterPanel — measuring", () => {
   it("shows the level, the figures and the nearest everyday sound", async() => {
      const panel = await mountSuspended(DecibelMeterPanel)
      const node = await startRun(panel)

      await send(panel, node, reading(0.1, 60), reading(0.2, 50), reading(0.3, 70))

      // The number holds its first value for a quarter of a second.
      expect(value(panel)).toBe("60")
      expect(panel.find(".decibel__comparison").text()).toBe(COPY.decibel.comparisons.conversation)
      expect(panel.find(".data-table__row--active").text()).toContain(COPY.decibel.references.conversation)
      // An energy average: the 70 dB tenth pulls it well past the middle.
      expect(tiles(panel)).toEqual(["50 dB", "66 dB", "70 dB"])
      expect(panel.find(".decibel__line").attributes("d")).toMatch(/^M/u)
   })

   it("moves every figure when the calibration changes, and remembers it", async() => {
      const panel = await mountSuspended(DecibelMeterPanel)
      const node = await startRun(panel)

      await send(panel, node, reading(0.1, 60))
      await panel.find("input[type='range']").setValue("3")

      expect(value(panel)).toBe("63")
      expect(tiles(panel)).toEqual(["63 dB", "63 dB", "63 dB"])
      expect(panel.find(".field__label").text()).toContain("+3")
      expect(localStorage.getItem(DECIBEL_CALIBRATION_STORAGE_KEY)).toBe("3")

      await panel.find("input[type='range']").setValue("0")

      expect(localStorage.getItem(DECIBEL_CALIBRATION_STORAGE_KEY)).toBeNull()
   })

   it("picks up a calibration stored by an earlier visit", async() => {
      localStorage.setItem(DECIBEL_CALIBRATION_STORAGE_KEY, "-4")

      const panel = await mountSuspended(DecibelMeterPanel)

      expect(panel.find(".field__label").text()).toContain("−4")
   })

   /// A clap in the first second takes an energy average past 85 dB on its
   /// own. The notice waits for ten seconds of sound before it judges.
   it("holds the hearing notice until there is enough sound to judge", async() => {
      const panel = await mountSuspended(DecibelMeterPanel)
      const node = await startRun(panel)

      await send(panel, node, reading(0.1, 50), reading(0.2, 105), ...run(0.3, 60, 90))

      expect(tiles(panel)[1]).not.toBe("—")
      expect(panel.find(".decibel__notice--risky").exists()).toBe(false)

      await send(panel, node, ...run(6.3, 40, 90))

      expect(panel.find(".decibel__notice--risky").text()).toContain("85 dB")
   })

   it("escalates once the average passes 100 dB", async() => {
      const panel = await mountSuspended(DecibelMeterPanel)
      const node = await startRun(panel)

      await send(panel, node, ...run(0.1, 110, 104))

      expect(panel.find(".decibel__notice--harmful").text()).toContain("100 dB")
      expect(panel.find(".decibel__fill--harmful").exists()).toBe(true)
   })

   it("keeps a clap out of a quiet room's warning once there is time to judge", async() => {
      const panel = await mountSuspended(DecibelMeterPanel)
      const node = await startRun(panel)

      await send(panel, node, ...run(0.1, 100, 45), reading(10.1, 100), ...run(10.2, 5, 45))

      expect(panel.find(".decibel__notice--risky").exists()).toBe(false)
   })

   it("says when the microphone clipped", async() => {
      const panel = await mountSuspended(DecibelMeterPanel)
      const node = await startRun(panel)

      await send(panel, node, reading(0.1, 100, 1))

      expect(panel.text()).toContain(COPY.decibel.clipped)
   })

   it("says when the microphone sends nothing but silence", async() => {
      const panel = await mountSuspended(DecibelMeterPanel)
      const node = await startRun(panel)
      const silent = (time: number): MeterReading => ({
         time, level: -120, min: -120, max: -120, energy: 0, frames: 4800, duration: 0.1, peak: 0,
      })

      await send(panel, node, silent(0.1), silent(1))

      expect(panel.text()).not.toContain(COPY.decibel.silent)

      await send(panel, node, silent(2.2))

      expect(panel.text()).toContain(COPY.decibel.silent)
      expect(value(panel)).toBe("—")
      expect(tiles(panel)).toEqual(["—", "—", "—"])
   })
})

/** Let a few animation frames go by, and the DOM catch up with them. */
async function frames(panel: VueWrapper): Promise<void> {
   await new Promise((resolve) => setTimeout(resolve, 120))
   await panel.vm.$nextTick()
}

describe("DecibelMeterPanel — the spectrum", () => {
   it("draws ten empty bands before Start, with no loudest band named", async() => {
      const panel = await mountSuspended(DecibelMeterPanel)

      expect(panel.findAll(".decibel__band")).toHaveLength(10)
      expect(panel.find(".decibel__loudest").exists()).toBe(false)

      for (const bar of panel.findAll(".decibel__band-bar")) {
         expect(bar.attributes("style")).toContain("block-size: 0%")
      }
   })

   it("runs the analyser without smoothing of its own, at the planned FFT size", async() => {
      const panel = await mountSuspended(DecibelMeterPanel)

      await startRun(panel)

      expect(FakeAnalyser.made[0]?.fftSize).toBe(8192)
      expect(FakeAnalyser.made[0]?.smoothingTimeConstant).toBe(0)
   })

   it("names the loudest band and raises its bar above the rest", async() => {
      const panel = await mountSuspended(DecibelMeterPanel)

      await startRun(panel)
      await frames(panel)

      expect(panel.find(".decibel__loudest").text()).toBe(COPY.decibel.loudestBand.replace("{band}", "1 kHz"))
      expect(panel.find(".decibel__band--loudest").exists()).toBe(true)

      const heights = panel.findAll(".decibel__band-bar")
         .map((bar) => Number(/block-size: ([\d.]+)%/u.exec(bar.attributes("style") ?? "")?.[1] ?? 0))

      expect(heights.indexOf(Math.max(...heights))).toBe(5)
      expect(heights.filter((height) => height > 0)).toHaveLength(1)
   })

   it("reads the bands out in words for a screen reader", async() => {
      const panel = await mountSuspended(DecibelMeterPanel)

      await startRun(panel)
      await frames(panel)

      const spoken = panel.findAll(".visually-hidden li").map((item) => item.text().replace(/\s+/gu, " "))

      expect(spoken).toHaveLength(10)
      expect(spoken[5]).toMatch(new RegExp(`^1 ${COPY.decibel.kilohertzSpoken}: \\d+ ${COPY.decibel.decibelsSpoken}$`, "u"))
      expect(spoken[0]).toBe(`31.5 ${COPY.decibel.hertzSpoken}: —`)
   })

   it("stops asking the analyser once the run stops", async() => {
      const panel = await mountSuspended(DecibelMeterPanel)

      await startRun(panel)
      await frames(panel)
      await primary(panel).trigger("click")

      const analyser = FakeAnalyser.made[0]
      const calls = analyser?.getFloatFrequencyData.mock.calls.length ?? 0

      await frames(panel)

      expect(calls).toBeGreaterThan(0)
      expect(analyser?.getFloatFrequencyData.mock.calls.length).toBe(calls)
   })
})

describe("DecibelMeterPanel — letting go of the microphone", () => {
   it("stops the tracks and closes the context on Stop, keeping the figures", async() => {
      const panel = await mountSuspended(DecibelMeterPanel)
      const node = await startRun(panel)

      await send(panel, node, reading(0.1, 60))
      await primary(panel).trigger("click")

      expect(track.stop).toHaveBeenCalled()
      expect(FakeAudioContext.made[0]?.close).toHaveBeenCalled()
      expect(panel.find(".decibel__status").text()).toBe(COPY.decibel.stopped)
      expect(value(panel)).toBe("60")
   })

   it("lets go when the page is left mid-run", async() => {
      const panel = await mountSuspended(DecibelMeterPanel)

      await startRun(panel)
      panel.unmount()

      expect(track.stop).toHaveBeenCalled()
      expect(FakeAudioContext.made[0]?.close).toHaveBeenCalled()
   })

   it("lets go of a microphone granted after Stop was pressed", async() => {
      let grant: (stream: unknown) => void = () => {}

      getUserMedia.mockReturnValueOnce(new Promise((resolve) => {
         grant = resolve
      }))

      const panel = await mountSuspended(DecibelMeterPanel)

      await primary(panel).trigger("click")
      await primary(panel).trigger("click")

      grant({ getTracks: () => [track], getAudioTracks: () => [track] })
      await flushPromises()

      expect(track.stop).toHaveBeenCalled()
      expect(FakeWorkletNode.made).toHaveLength(0)
      expect(primary(panel).text()).toBe(COPY.decibel.start)
   })

   it("stops and says so when the microphone is unplugged", async() => {
      const panel = await mountSuspended(DecibelMeterPanel)

      await startRun(panel)
      track.end()
      await panel.vm.$nextTick()

      expect(panel.find(".notice").text()).toBe(COPY.decibel.faults.disconnected)
      expect(FakeAudioContext.made[0]?.close).toHaveBeenCalled()
   })
})
