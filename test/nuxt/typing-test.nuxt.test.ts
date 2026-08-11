import type { DOMWrapper, VueWrapper } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import TypingTestPanel from "../../app/components/TypingTestPanel.vue"

/// Two things here can rot quietly. The clock is one: it is driven by
/// `Date.now()` deltas rather than by counting ticks, and a regression to
/// tick-counting would only show up as scores that drift under load. The
/// other is the word boundary — space banks a word even when it is wrong, and
/// backspace must not reopen one that has already been scored.
///
/// The word stream is random, so nothing here can assert on particular words.
/// The tests read whatever the panel dealt out of the DOM and type that back.

const BEST_KEY = "ma-typing-best-30"
const SHORT_BEST_KEY = "ma-typing-best-15"

afterEach(() => {
   localStorage.removeItem(BEST_KEY)
   localStorage.removeItem(SHORT_BEST_KEY)
   vi.useRealTimers()
})

const field = (panel: VueWrapper): DOMWrapper<Element> => panel.find(".typing__field")
const clock = (panel: VueWrapper): string => panel.find(".typing__clock").text()

/** The word the caret is sitting in, with the per-character spans collapsed. */
const activeWord = (panel: VueWrapper): string =>
   panel.find(".typing__word--active").text().replace(/\s+/gu, "")

/** Every word currently on the strip, in order. */
const dealtWords = (panel: VueWrapper): string[] =>
   panel.findAll(".typing__word").map((word) => word.text().replace(/\s+/gu, ""))

/** Which word in the stream is active — the reliable "did it advance" check. */
const activeIndex = (panel: VueWrapper): number =>
   panel.findAll(".typing__word").findIndex((word) =>
      word.classes().includes("typing__word--active"),
   )

/** Push a value through the real input, exactly as a keystroke would. */
const type = async(panel: VueWrapper, value: string): Promise<void> => {
   await field(panel).setValue(value)
}

/** Type the current word correctly and the space that banks it. */
const typeActiveWord = async(panel: VueWrapper): Promise<string> => {
   const word = activeWord(panel)

   await type(panel, `${word} `)

   return word
}

describe("TypingTestPanel — before the clock starts", () => {
   it("shows the full length and no result", async() => {
      const panel = await mountSuspended(TypingTestPanel)

      expect(clock(panel)).toBe("30s")
      expect(panel.find(".typing__results").exists()).toBe(false)
   })

   it("deals a stream and puts the caret in the first word", async() => {
      const panel = await mountSuspended(TypingTestPanel)

      expect(panel.findAll(".typing__word").length).toBeGreaterThan(0)
      expect(activeIndex(panel)).toBe(0)
      expect(activeWord(panel)).toMatch(/^[a-z]+$/)
   })

   it("is not started by a stray space", async() => {
      const panel = await mountSuspended(TypingTestPanel)

      vi.useFakeTimers()

      await type(panel, " ")
      await vi.advanceTimersByTimeAsync(3000)

      // Knocking the space bar would otherwise burn three seconds before the
      // first word was typed.
      expect(clock(panel)).toBe("30s")
      expect(activeIndex(panel)).toBe(0)
   })

   it("starts the clock on the first real keystroke", async() => {
      const panel = await mountSuspended(TypingTestPanel)

      vi.useFakeTimers()

      await type(panel, "a")
      await vi.advanceTimersByTimeAsync(5000)

      expect(clock(panel)).toBe("25s")
   })
})

describe("TypingTestPanel — typing", () => {
   it("grades a wrong character against the word it was aimed at", async() => {
      const panel = await mountSuspended(TypingTestPanel)
      const word = activeWord(panel)
      // A character the first letter definitely is not.
      const wrong = word.startsWith("z") ? "q" : "z"

      await type(panel, wrong)

      const first = panel.find(".typing__word--active .typing__char")

      expect(first.classes()).toContain("typing__char--incorrect")
      // The target letter stays on screen, not the one that was typed —
      // there is nothing to correct towards otherwise.
      expect(first.text()).toBe(word[0])
   })

   it("marks a matching character correct", async() => {
      const panel = await mountSuspended(TypingTestPanel)
      const word = activeWord(panel)

      await type(panel, word[0] as string)

      expect(panel.find(".typing__word--active .typing__char").classes())
         .toContain("typing__char--correct")
   })

   it("advances to the next word on space", async() => {
      const panel = await mountSuspended(TypingTestPanel)

      await typeActiveWord(panel)

      expect(activeIndex(panel)).toBe(1)
   })

   it("banks a wrong word rather than blocking the space bar", async() => {
      const panel = await mountSuspended(TypingTestPanel)

      await type(panel, "zzz ")

      // Forcing a correction would turn this into a spelling test and stall
      // anyone who cannot see what they got wrong.
      expect(activeIndex(panel)).toBe(1)
   })

   it("keeps a submitted word graded once the caret has left it", async() => {
      const panel = await mountSuspended(TypingTestPanel)

      await type(panel, "zzz ")

      const first = panel.findAll(".typing__word")[0]

      expect(first?.findAll(".typing__char--incorrect").length).toBeGreaterThan(0)
   })

   it("shows an overshoot's surplus characters", async() => {
      const panel = await mountSuspended(TypingTestPanel)
      const word = activeWord(panel)

      await type(panel, `${word}xx`)

      expect(panel.findAll(".typing__word--active .typing__char--extra")).toHaveLength(2)
   })

   it("empties the field at a word boundary, so backspace cannot reopen it", async() => {
      const panel = await mountSuspended(TypingTestPanel)

      await typeActiveWord(panel)

      // The field only ever holds the word in progress. That is the whole
      // mechanism preventing a return into an already-scored word.
      expect((field(panel).element as HTMLInputElement).value).toBe("")
   })

   it("banks every word in a multi-word burst", async() => {
      const panel = await mountSuspended(TypingTestPanel)
      const words = panel.findAll(".typing__word").slice(0, 3)
         .map((word) => word.text().replace(/\s+/gu, ""))

      await type(panel, `${words.join(" ")} `)

      expect(activeIndex(panel)).toBe(3)
   })
})

describe("TypingTestPanel — finishing", () => {
   /** Type three words, then run the clock out. */
   const runOut = async(panel: VueWrapper, seconds = 30): Promise<void> => {
      vi.useFakeTimers()

      await typeActiveWord(panel)
      await typeActiveWord(panel)
      await typeActiveWord(panel)

      await vi.advanceTimersByTimeAsync(seconds * 1000)
      // Lets the count-up animation frames land on the final figure.
      await vi.advanceTimersByTimeAsync(1000)
   }

   it("swaps the words for a result when the clock runs out", async() => {
      const panel = await mountSuspended(TypingTestPanel)

      await runOut(panel)

      expect(panel.find(".typing__results").exists()).toBe(true)
      expect(panel.find(".typing__stage").exists()).toBe(false)
      expect(clock(panel)).toBe("0s")
   })

   it("reports a speed and an accuracy", async() => {
      const panel = await mountSuspended(TypingTestPanel)

      await runOut(panel)

      const values = panel.findAll(".typing__grid .stat__value").map((stat) => stat.text())

      // Three words typed correctly is a real, if slow, score.
      expect(Number(values[0])).toBeGreaterThan(0)
      expect(values[1]).toBe("100%")
   })

   it("announces the outcome for a screen reader", async() => {
      const panel = await mountSuspended(TypingTestPanel)

      await runOut(panel)

      const announcement = panel.find("[aria-live=\"polite\"]").text()

      // Spelled out, not "68 wpm" — a voice reads that as "w p m".
      expect(announcement).toContain("words per minute")
      expect(announcement).toContain("accuracy")
   })

   it("stores a personal best for the length that was run", async() => {
      const panel = await mountSuspended(TypingTestPanel)

      await runOut(panel)

      expect(Number(localStorage.getItem(BEST_KEY))).toBeGreaterThan(0)
      expect(panel.find(".typing__record").exists()).toBe(true)
   })

   it("does not flag a record when the stored best still stands", async() => {
      localStorage.setItem(BEST_KEY, "200")

      const panel = await mountSuspended(TypingTestPanel)

      await runOut(panel)

      expect(panel.find(".typing__record").exists()).toBe(false)
      expect(localStorage.getItem(BEST_KEY)).toBe("200")
   })

   it("discards a stored best from beyond the plausible range", async() => {
      localStorage.setItem(BEST_KEY, "9000")

      const panel = await mountSuspended(TypingTestPanel)

      // Clamping to 400 would have preserved a score nobody typed; falling
      // back makes it plain the value was not honoured.
      expect(panel.find(".typing__hud-item--best").text()).toContain("—")
   })

   it("adopts a plausible best stored before it mounted", async() => {
      localStorage.setItem(BEST_KEY, "77")

      const panel = await mountSuspended(TypingTestPanel)

      expect(panel.find(".typing__hud-item--best").text()).toContain("77")
   })
})

describe("TypingTestPanel — restarting", () => {
   it("puts the clock and the caret back on a restart", async() => {
      const panel = await mountSuspended(TypingTestPanel)

      vi.useFakeTimers()

      await typeActiveWord(panel)
      await vi.advanceTimersByTimeAsync(4000)

      expect(clock(panel)).toBe("26s")

      await panel.find(".typing__actions .button").trigger("click")

      expect(clock(panel)).toBe("30s")
      expect(activeIndex(panel)).toBe(0)
      expect(panel.find(".typing__results").exists()).toBe(false)
   })

   it("changes the length and resets the run with it", async() => {
      const panel = await mountSuspended(TypingTestPanel)

      vi.useFakeTimers()

      await typeActiveWord(panel)
      await vi.advanceTimersByTimeAsync(4000)

      const shorter = panel.findAll(".typing__length-input")[0]

      await shorter?.setValue(true)

      expect(clock(panel)).toBe("15s")
      expect(activeIndex(panel)).toBe(0)
   })

   it("keeps each length's best apart from the others", async() => {
      localStorage.setItem(BEST_KEY, "120")

      const panel = await mountSuspended(TypingTestPanel)

      await panel.findAll(".typing__length-input")[0]?.setValue(true)

      vi.useFakeTimers()

      await typeActiveWord(panel)
      await typeActiveWord(panel)
      await vi.advanceTimersByTimeAsync(16_000)

      // A 15-second burst and a 120-second grind are not the same
      // achievement, so beating one must not touch the other.
      expect(Number(localStorage.getItem(SHORT_BEST_KEY))).toBeGreaterThan(0)
      expect(localStorage.getItem(BEST_KEY)).toBe("120")
   })
})

describe("TypingTestPanel — the words on screen", () => {
   /// The bug this covers: words are keyed by their index in the stream, so a
   /// restart deals fresh words into the same slots. Without the word itself
   /// as a `v-memo` dependency, every word ahead of the caret keeps the
   /// previous run's text and only swaps to the real one as the caret arrives
   /// — the reader watches the line rewrite itself while they type.

   it("keeps every word it dealt after a restart", async() => {
      const panel = await mountSuspended(TypingTestPanel)

      await typeActiveWord(panel)
      await typeActiveWord(panel)

      await panel.find(".typing__actions .button").trigger("click")

      const dealt = dealtWords(panel).slice(0, 6)

      for (const word of dealt) {
         // The word on screen when the caret reaches it must be the word that
         // was on screen before it got there.
         expect(activeWord(panel)).toBe(word)

         await type(panel, `${word} `)
      }
   })

   it("grades against the word the reader can actually see", async() => {
      const panel = await mountSuspended(TypingTestPanel)

      vi.useFakeTimers()

      await typeActiveWord(panel)
      await panel.find(".typing__actions .button").trigger("click")

      for (const word of dealtWords(panel).slice(0, 4)) {
         await type(panel, `${word} `)
      }

      await vi.advanceTimersByTimeAsync(31_000)
      await vi.advanceTimersByTimeAsync(1000)

      // Typing exactly what is on screen has to score 100%: anything less
      // means the stream being graded is not the stream being shown.
      expect(panel.findAll(".typing__grid .stat__value")[1]?.text()).toBe("100%")
   })
})
