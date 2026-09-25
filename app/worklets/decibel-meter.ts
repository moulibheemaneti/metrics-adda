/// --------------------------------------------------
/// worklets/decibel-meter.ts
/// --------------------------------------------------
/// The audio-thread half of the decibel meter.
///
/// An AudioWorklet rather than an AnalyserNode polled from the page. An
/// analyser hands over only its most recent window, so whatever arrives
/// between two polls is never measured — and a backgrounded tab polls
/// once a second at best, which would make the average a sample of the
/// room rather than a measure of it. The worklet sees every sample on the
/// audio thread whatever the page is doing, and posts a reading ten times
/// a second.
///
/// All the measuring is `SoundLevelMeter`, which is unit-tested in plain
/// Node; this file is only the plumbing around it. It is bundled on its
/// own by Vite's `?worker&url` — see `useDecibelMeter` — so it imports
/// relatively and gets none of Nuxt's auto-imports.
///
/// Nothing is written to the output, which stays silent: the node is only
/// connected to the destination so that every browser keeps pulling audio
/// through it.
/// --------------------------------------------------

import { METER_PROCESSOR_NAME, SoundLevelMeter } from "../utils/decibel"

// The AudioWorkletGlobalScope, which TypeScript's DOM library does not
// describe. Declared here rather than globally because this is the only
// file that runs in it.
declare const sampleRate: number
declare function registerProcessor(name: string, processor: typeof AudioWorkletProcessor): void
declare class AudioWorkletProcessor {
   readonly port: MessagePort
   process(inputs: Float32Array[][]): boolean
}

class DecibelMeterProcessor extends AudioWorkletProcessor {
   private readonly meter = new SoundLevelMeter(sampleRate)

   override process(inputs: Float32Array[][]): boolean {
      const reading = this.meter.process(inputs[0] ?? [])

      if (reading) this.port.postMessage(reading)

      // Returning true keeps the processor alive between blocks even when
      // its input goes quiet, which a muted microphone does.
      return true
   }
}

registerProcessor(METER_PROCESSOR_NAME, DecibelMeterProcessor)
