/// --------------------------------------------------
/// composables/useTypingTest.ts
/// --------------------------------------------------
/// One run of the typing test: the word stream, the keystrokes, the clock.
///
/// Unlike `useReadingSpeeds` and `useTypingBest` this holds plain `ref`s
/// rather than `useState`. Those two describe a visitor's settings, which have
/// to survive a page change; this describes a run in progress, which should
/// not. The refs are created inside the function rather than at module scope,
/// so there is still nothing that could leak between requests on the server.
///
/// Nothing here reads `localStorage` or `Date` until the first keystroke, so
/// the composable is safe to call during SSR — see `restart` for the one place
/// that has to wait for the client.
///
/// Auto-imported by Nuxt.
/// --------------------------------------------------

import type { TestDuration, TypingResult } from "~/utils/typing"

/**
 * `idle` until the first keystroke, `running` while the clock is going,
 * `finished` once it has run out. There is no `paused`: a typing test that can
 * be stopped and resumed is not measuring a sustained pace.
 */
export type TestStatus = "idle" | "running" | "finished"

/**
 * How often the countdown and the live figures refresh.
 *
 * The interval decides only how often the display is recomputed — never how
 * much time is deemed to have passed. That comes from `Date.now()` throughout,
 * because a browser throttles timers in a backgrounded tab and counting ticks
 * would quietly award a slower clock.
 */
const TICK_MS = 100

/** Words fetched at a time, and the slack that triggers the next batch. */
const STREAM_CHUNK = 120
const REFILL_AT = 40

export function useTypingTest(duration: Ref<TestDuration>) {
   const status = ref<TestStatus>("idle")

   const stream = ref<string[]>([])
   /** Index of the word being typed. Everything before it is submitted. */
   const wordIndex = ref(0)
   /** What was actually typed for each submitted word, for grading on screen. */
   const submitted = ref<string[]>([])
   /** What has been typed for the current word so far. */
   const typed = ref("")

   /** Keystroke totals for the words already submitted. */
   const committed = reactive({ correct: 0, typed: 0 })

   const elapsedMs = ref(0)
   const result = ref<TypingResult | null>(null)

   let startedAt: number | null = null
   let timer: ReturnType<typeof setInterval> | undefined

   const limitMs = computed(() => duration.value * 1000)

   const currentWord = computed(() => stream.value[wordIndex.value] ?? "")

   /** The in-progress word's keystrokes, so a half-typed word still counts. */
   const currentTally = computed(() => tallyWord(typed.value, currentWord.value))

   const totals = computed(() => ({
      correctCharacters: committed.correct + currentTally.value.correct,
      typedCharacters: committed.typed + currentTally.value.typed,
   }))

   /** Whole seconds left, so the countdown never shows a bare "0" mid-run. */
   const remainingSeconds = computed(() =>
      Math.max(0, Math.ceil((limitMs.value - elapsedMs.value) / 1000)),
   )

   /**
    * The figures shown while the run is going.
    *
    * Recomputed from real elapsed time on every tick rather than being
    * smoothed: a live WPM that lags is worse than one that jitters, because
    * the whole reason to show it is to let someone push against it.
    */
   const live = computed(() =>
      computeResult({ ...totals.value, elapsedMs: elapsedMs.value }),
   )

   function stopTimer(): void {
      if (timer === undefined) return

      clearInterval(timer)
      timer = undefined
   }

   /**
    * Close the run out.
    *
    * Scored over the *nominal* duration, not over the milliseconds the timer
    * happened to fire at. Those two differ by a tick at best, and by however
    * long a tab sat in the background at worst — and dividing by that longer
    * figure would punish someone for switching tabs after they had already
    * stopped typing, which is not a typing-speed measurement.
    */
   function finish(): void {
      stopTimer()
      elapsedMs.value = limitMs.value
      result.value = computeResult({ ...totals.value, elapsedMs: limitMs.value })
      status.value = "finished"
      startedAt = null
   }

   function tick(): void {
      if (startedAt === null) return

      const elapsed = Date.now() - startedAt

      if (elapsed >= limitMs.value) {
         finish()

         return
      }

      elapsedMs.value = elapsed
   }

   /** Top the stream up so a fast typist never reaches the end of it. */
   function refill(): void {
      if (stream.value.length - wordIndex.value > REFILL_AT) return

      stream.value = [...stream.value, ...buildStream(STREAM_CHUNK)]
   }

   /**
    * Throw the run away and deal a fresh stream.
    *
    * The stream is random, so a server render and a client render would
    * disagree about it and Vue would report a hydration mismatch. This is
    * therefore never called during setup — the component calls it from
    * `onMounted`, the same way `useReadingSpeeds` defers its storage read.
    */
   function restart(): void {
      stopTimer()
      startedAt = null
      status.value = "idle"
      stream.value = buildStream(STREAM_CHUNK)
      wordIndex.value = 0
      submitted.value = []
      typed.value = ""
      committed.correct = 0
      committed.typed = 0
      elapsedMs.value = 0
      result.value = null
   }

   function begin(): void {
      startedAt = Date.now()
      status.value = "running"
      timer = setInterval(tick, TICK_MS)
   }

   /**
    * Bank the current word and move to the next one.
    *
    * A wrong word is banked wrong rather than blocking the space bar. Forcing
    * a correction would turn the test into a spelling exercise and stall
    * anyone who cannot see what they got wrong.
    */
   function submitWord(word: string): void {
      const tally = tallyWord(word, currentWord.value)

      committed.correct += tally.correct
      committed.typed += tally.typed

      // The space that ended the word is a keystroke too, and it is only a
      // correct one if the word it terminated was right — otherwise a run of
      // wrong words would still be collecting free correct characters.
      committed.typed += 1
      if (word === currentWord.value) committed.correct += 1

      submitted.value = [...submitted.value, word]
      wordIndex.value += 1
      typed.value = ""

      refill()
   }

   /**
    * Take the input element's current value.
    *
    * The field only ever holds the word in progress, which is what stops
    * backspace walking back into an already-submitted word: at offset zero
    * there is nothing left to delete. That boundary is deliberate — reopening
    * a scored word would mean un-scoring it, and the score is the whole point
    * of the tool.
    */
   function handleInput(raw: string): void {
      if (status.value === "finished") return

      if (status.value === "idle") {
         // Ignore a leading space so the test cannot be started by knocking
         // the space bar, which would burn seconds before the first word.
         if (raw.trim() === "") {
            typed.value = ""

            return
         }

         begin()
      }

      if (!raw.includes(" ")) {
         typed.value = raw

         return
      }

      // Everything before the space is the word; a paste can carry several, so
      // each is submitted in turn rather than only the first.
      const parts = raw.split(" ")
      const trailing = parts.pop() ?? ""

      for (const part of parts) {
         if (part !== "") submitWord(part)
      }

      typed.value = trailing
   }

   onScopeDispose(stopTimer)

   return {
      status,
      stream,
      wordIndex,
      submitted,
      typed,
      currentWord,
      elapsedMs,
      remainingSeconds,
      live,
      result,
      handleInput,
      restart,
   }
}
