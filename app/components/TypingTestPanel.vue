<template>
   <div class="typing card card--panel stack stack--tight">
      <div class="typing__settings">
         <fieldset class="typing__pills typing__pills--duration">
            <legend class="visually-hidden">
               {{ COPY.typing.durationLegend }}
            </legend>

            <label
               v-for="option in TEST_DURATIONS"
               :key="option"
               class="typing__pill"
               :class="{ 'typing__pill--active': duration === option }"
            >
               <input
                  class="typing__pill-input visually-hidden"
                  type="radio"
                  :name="`${uid}-duration`"
                  :value="option"
                  :checked="duration === option"
                  @change="selectDuration(option)"
               />
               <span>{{ option }}{{ COPY.typing.seconds }}</span>
            </label>
         </fieldset>

         <fieldset class="typing__pills typing__pills--difficulty">
            <legend class="visually-hidden">
               {{ COPY.typing.difficultyLegend }}
            </legend>

            <label
               v-for="option in DIFFICULTIES"
               :key="option"
               class="typing__pill"
               :class="{ 'typing__pill--active': settings.difficulty === option }"
            >
               <input
                  class="typing__pill-input visually-hidden"
                  type="radio"
                  :name="`${uid}-difficulty`"
                  :value="option"
                  :checked="settings.difficulty === option"
                  @change="selectDifficulty(option)"
               />
               <span>{{ COPY.typing.difficulties[option] }}</span>
            </label>
         </fieldset>

         <!-- Checkboxes rather than radios: the two mixes are independent, so
              a group that allowed only one would be lying about the model. -->
         <fieldset class="typing__pills typing__pills--mix">
            <legend class="visually-hidden">
               {{ COPY.typing.mixLegend }}
            </legend>

            <label
               v-for="option in mixToggles"
               :key="option.key"
               class="typing__pill"
               :class="{ 'typing__pill--active': settings[option.key] }"
               :title="option.name"
            >
               <input
                  class="typing__pill-input visually-hidden"
                  type="checkbox"
                  :checked="settings[option.key]"
                  @change="toggleMix(option.key)"
               />
               <span aria-hidden="true">{{ option.label }}</span>
               <span class="visually-hidden">{{ option.name }}</span>
            </label>
         </fieldset>

         <div class="field typing__topic">
            <label class="visually-hidden" :for="`${uid}-topic`">
               {{ COPY.typing.topicLabel }}
            </label>
            <select
               :id="`${uid}-topic`"
               class="control control--select typing__select"
               :value="settings.topic"
               @change="selectTopic(($event.target as HTMLSelectElement).value)"
            >
               <option v-for="option in TOPICS" :key="option" :value="option">
                  {{ COPY.typing.topics[option] }}
               </option>
            </select>
         </div>
      </div>

      <!-- The clock and the live figures. `aria-hidden` because this repaints
           ten times a second: a live region here would talk continuously and
           bury everything else on the page. The region at the foot announces
           the transitions instead. -->
      <div class="typing__hud" aria-hidden="true">
         <span class="typing__clock" :class="{ 'typing__clock--low': isRunningOut }">
            {{ remainingSeconds }}{{ COPY.typing.seconds }}
         </span>
         <span class="typing__hud-item">
            <strong>{{ status === "idle" ? 0 : live.wpm }}</strong> {{ COPY.typing.wpm }}
         </span>
         <span class="typing__hud-item">
            <strong>{{ status === "idle" ? 0 : live.accuracy }}%</strong>
            {{ COPY.typing.accuracyLabel.toLowerCase() }}
         </span>
         <span class="typing__hud-item typing__hud-item--best">
            {{ COPY.typing.bestLabel }}:
            <strong>{{ best === undefined ? "—" : `${best} ${COPY.typing.wpm}` }}</strong>
         </span>
      </div>

      <!-- The stage is a rendering of text the reader is typing, not content
           in its own right, so it is hidden from assistive technology
           entirely — the input below carries the real label. -->
      <div
         v-if="status !== 'finished'"
         class="typing__stage"
         :class="{ 'typing__stage--idle': !focused }"
         aria-hidden="true"
         @mousedown.prevent="focusField"
      >
         <div ref="viewport" class="typing__viewport">
            <div
               ref="strip"
               class="typing__strip"
               :style="{ transform: `translateY(${-scrollY}px)` }"
            >
               <span
                  v-for="(word, index) in words"
                  :key="index"
                  v-memo="[word, typedAt(index), index === wordIndex]"
                  class="typing__word"
                  :class="{ 'typing__word--active': index === wordIndex }"
               >
                  <span
                     v-for="(cell, position) in charsFor(index)"
                     :key="position"
                     class="typing__char"
                     :class="`typing__char--${cell.state}`"
                  >{{ cell.char }}</span>
               </span>

               <span
                  class="typing__caret"
                  :class="{ 'typing__caret--resting': status !== 'running' }"
                  :style="caretStyle"
               />
            </div>
         </div>

         <p v-if="!focused" class="typing__prompt">
            {{ status === "idle" ? COPY.typing.start : COPY.typing.focusPrompt }}
         </p>
      </div>

      <section v-else class="typing__results stack stack--tight">
         <h2 class="section-heading">
            {{ COPY.typing.resultsHeading }}
         </h2>

         <p v-if="isRecord" class="typing__record">
            {{ COPY.typing.newBest }}
         </p>

         <ul class="typing__grid">
            <li
               v-for="(item, index) in resultItems"
               :key="item.key"
               class="stat typing__tile"
               :style="{ '--index': index }"
            >
               <span class="stat__value">{{ item.value }}</span>
               <span class="stat__label">
                  {{ item.label }}
                  <span v-if="item.note" class="stat__note">{{ item.note }}</span>
               </span>
            </li>
         </ul>
      </section>

      <div class="typing__actions">
         <!-- The real control. Visually hidden rather than absent, because a
              hidden *input* still raises a soft keyboard on a phone where a
              document-level keydown listener never would. -->
         <label class="visually-hidden" :for="`${uid}-field`">
            {{ COPY.typing.inputLabel }}
         </label>
         <input
            :id="`${uid}-field`"
            ref="field"
            class="typing__field visually-hidden"
            type="text"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            :value="typed"
            :disabled="status === 'finished'"
            @input="onInput"
            @paste.prevent
            @keydown.esc.prevent="restartRun"
            @focus="focused = true"
            @blur="focused = false"
         />

         <button class="button button--primary" type="button" @click="restartRun">
            {{ status === "finished" ? COPY.typing.tryAgain : COPY.typing.restart }}
         </button>
      </div>

      <p class="visually-hidden" aria-live="polite">
         {{ announcement }}
      </p>
   </div>
</template>

<script lang="ts" setup>
import type { CharState, Difficulty, StreamOptions, TestDuration } from "~/utils/typing"

/// The stage renders the word stream and the caret; the composable owns the
/// clock and the keystrokes. The one genuinely fiddly part is here rather
/// than there: the caret is an absolutely-positioned bar that has to be told
/// where the character it follows ended up, which means measuring the DOM
/// after every keystroke.
///
/// That measurement is cheap enough to do on every input because `v-memo`
/// keeps the re-render to the active word — without it, a 120-second run
/// would be diffing a couple of thousand character spans ten times a second.
///
/// The word itself is the first `v-memo` dependency, and has to be. Words are
/// keyed by their index in the stream, and a restart deals a fresh stream into
/// those same indices — so without it, every word ahead of the caret keeps the
/// previous run's text (its other dependencies not having changed) while
/// `charsFor` grades against the new one, and each word visibly swaps itself
/// out as the caret arrives.

const uid = useId()

const duration = ref<TestDuration>(DEFAULT_DURATION)

const { settings, sync: syncSettings, setSettings } = useTypingSettings()

const {
   status,
   stream,
   wordIndex,
   submitted,
   typed,
   remainingSeconds,
   live,
   result,
   handleInput,
   restart,
} = useTypingTest(duration, settings)

const { bests, sync: syncBests, record } = useTypingBest()

/** The two independent mixes, as pills. */
const mixToggles: { key: "numbers" | "punctuation", label: string, name: string }[] = [
   { key: "numbers", label: COPY.typing.numbers, name: COPY.typing.numbersName },
   { key: "punctuation", label: COPY.typing.punctuation, name: COPY.typing.punctuationName },
]

const field = useTemplateRef<HTMLInputElement>("field")
const viewport = useTemplateRef<HTMLElement>("viewport")
const strip = useTemplateRef<HTMLElement>("strip")

const focused = ref(false)
const announcement = ref("")
const isRecord = ref(false)

const best = computed(() => bests.value[duration.value])

/** The last five seconds, where the clock turns urgent. */
const LOW_TIME_SECONDS = 5
const isRunningOut = computed(() =>
   status.value === "running" && remainingSeconds.value <= LOW_TIME_SECONDS,
)

/// --- The word stream on screen ------------------------------------------

/**
 * How far ahead of the caret to render.
 *
 * The stream itself runs well past this; rendering all of it would put a few
 * thousand spans in the document for the sake of words nobody will reach.
 */
const LOOKAHEAD = 100

const words = computed(() => stream.value.slice(0, wordIndex.value + LOOKAHEAD))

/** What was typed for a word, or `undefined` if it has not been reached. */
function typedAt(index: number): string | undefined {
   if (index < wordIndex.value) return submitted.value[index]
   if (index === wordIndex.value) return typed.value

   return undefined
}

interface CharCell {
   char: string
   state: CharState
}

/**
 * The characters to draw for one word.
 *
 * A wrong character shows the letter that *should* have been typed, coloured
 * as an error — the reader needs to see the target to correct towards it.
 * Surplus characters past the end of the word are the exception: those show
 * what was actually typed, since there is no target to show instead.
 */
function charsFor(index: number): CharCell[] {
   const target = words.value[index] ?? ""
   const input = typedAt(index)
   const targetChars = [...target]

   if (input === undefined) {
      return targetChars.map((char) => ({ char, state: "pending" }))
   }

   const typedChars = [...input]

   return gradeWord(input, target).map((state, position) => ({
      char: position < targetChars.length
         ? targetChars[position] ?? ""
         : typedChars[position] ?? "",
      state,
   }))
}

/// --- Caret and scrolling -------------------------------------------------

const caret = reactive({ x: 0, y: 0, height: 0, measured: false })
const scrollY = ref(0)

const caretStyle = computed(() => ({
   transform: `translate(${caret.x}px, ${caret.y}px)`,
   blockSize: `${caret.height}px`,
   opacity: caret.measured ? "1" : "0",
}))

/**
 * Put the caret after the last character typed in the active word.
 *
 * Every measurement is taken before anything is assigned, so the loop is
 * reads-then-writes rather than alternating — interleaving them would force a
 * synchronous layout on each keystroke.
 *
 * The caret and the words share a coordinate space because both live inside
 * the strip, which is what makes the scroll transform move them together
 * instead of leaving the caret behind.
 */
function measure(): void {
   const active = strip.value?.querySelector<HTMLElement>(".typing__word--active")

   if (!active) return

   const cells = active.querySelectorAll<HTMLElement>(".typing__char")
   const position = [...typed.value].length
   // Clamped rather than indexed directly: a reader who overshoots the word
   // has a `position` past the last cell for one keystroke.
   const anchor = position > 0 ? cells[Math.min(position, cells.length) - 1] : undefined

   const lineHeight = active.offsetHeight
   const top = active.offsetTop
   const x = anchor === undefined
      ? active.offsetLeft
      : anchor.offsetLeft + anchor.offsetWidth

   caret.x = x
   caret.y = top
   caret.height = lineHeight
   caret.measured = true

   // Keeps the active line second of the three on show, so there is always a
   // line of context above and one of lookahead below.
   scrollY.value = Math.max(0, top - lineHeight)
}

const remeasure = (): void => {
   void nextTick(measure)
}

watch([typed, wordIndex, status], remeasure)

/// --- Results -------------------------------------------------------------

/**
 * The headline figure counts up rather than appearing.
 *
 * Driven by rAF because CSS cannot interpolate the text inside an element —
 * so, unlike every other animation here, it has to check the reduced-motion
 * preference itself rather than inheriting the global stylesheet rule.
 */
const COUNT_UP_MS = 700
const displayWpm = ref(0)
let countFrame: number | undefined

function stopCountUp(): void {
   if (countFrame === undefined) return

   cancelAnimationFrame(countFrame)
   countFrame = undefined
}

function countUpTo(target: number): void {
   stopCountUp()

   const reduced = typeof matchMedia === "function"
     && matchMedia("(prefers-reduced-motion: reduce)").matches

   if (reduced) {
      displayWpm.value = target

      return
   }

   const startedAt = performance.now()

   const step = (now: number): void => {
      const progress = Math.min(1, (now - startedAt) / COUNT_UP_MS)

      // Eased out, so the number decelerates into its final value rather than
      // stopping dead on it.
      displayWpm.value = Math.round(target * (1 - (1 - progress) ** 3))

      countFrame = progress < 1 ? requestAnimationFrame(step) : undefined
   }

   countFrame = requestAnimationFrame(step)
}

const resultItems = computed(() => [
   {
      key: "wpm",
      label: COPY.typing.wpmLabel,
      value: formatCount(displayWpm.value),
   },
   {
      key: "accuracy",
      label: COPY.typing.accuracyLabel,
      value: `${result.value?.accuracy ?? 0}%`,
   },
   {
      key: "raw",
      label: COPY.typing.rawLabel,
      note: `(${COPY.typing.wpm})`,
      value: formatCount(result.value?.rawWpm ?? 0),
   },
   {
      key: "best",
      label: COPY.typing.bestLabel,
      note: `(${duration.value}${COPY.typing.seconds})`,
      value: best.value === undefined ? "—" : formatCount(best.value),
   },
])

/// --- Wiring --------------------------------------------------------------

function focusField(): void {
   field.value?.focus()
}

function onInput(event: Event): void {
   const el = event.target as HTMLInputElement

   handleInput(el.value)

   // Written back explicitly rather than left to the `:value` binding. When
   // the composable rejects a keystroke — a leading space before the run has
   // started — `typed` does not change, so Vue sees no update to patch and
   // the character would sit in the field.
   el.value = typed.value
}

function restartRun(): void {
   stopCountUp()
   displayWpm.value = 0
   isRecord.value = false
   restart()
   // Remeasured explicitly: restarting from an untouched run changes neither
   // `typed`, `wordIndex` nor `status`, so the watcher below never fires and
   // the caret would keep the previous stream's measurements.
   remeasure()
   void nextTick(focusField)
}

function selectDuration(next: TestDuration): void {
   duration.value = next
   restartRun()
}

/**
 * Change one setting and deal again.
 *
 * A settings change always restarts. Swapping the word list mid-run would
 * score the seconds already typed against one vocabulary and the rest against
 * another, and the resulting figure would measure neither.
 */
function applySettings(next: Partial<StreamOptions>): void {
   setSettings({ ...settings.value, ...next })
   restartRun()
}

function selectTopic(next: string): void {
   if (isTopic(next)) applySettings({ topic: next })
}

/**
 * Hard turns both mixes on as it is selected.
 *
 * A nudge, not a lock: the toggles stay live afterwards, so someone who wants
 * long words without punctuation can still have them. Difficulty sets a
 * starting point; the mixes remain the reader's own choice.
 */
function selectDifficulty(next: Difficulty): void {
   applySettings(next === "hard"
      ? { difficulty: next, numbers: true, punctuation: true }
      : { difficulty: next })
}

function toggleMix(key: "numbers" | "punctuation"): void {
   applySettings({ [key]: !settings.value[key] })
}

watch(status, (next, previous) => {
   if (next === "running" && previous === "idle") {
      announcement.value = COPY.typing.startedAnnouncement

      return
   }

   if (next !== "finished") return

   const finished = result.value

   if (!finished) return

   isRecord.value = record(duration.value, finished.wpm)
   countUpTo(finished.wpm)

   // Spelled out rather than abbreviated: this string exists only to be read
   // aloud, and a voice makes "68 wpm" into "sixty-eight w p m".
   announcement.value = [
      COPY.typing.finishedAnnouncement,
      `${finished.wpm} ${COPY.typing.wordsPerMinuteSpoken},`,
      `${finished.accuracy}% ${COPY.typing.accuracySpoken}.`,
      isRecord.value ? COPY.typing.newBest : "",
   ].join(" ").trim()
})

let observer: ResizeObserver | undefined

onMounted(() => {
   syncBests()
   // Before the first deal, so the opening stream already matches the stored
   // preferences rather than flashing the defaults and replacing them.
   syncSettings()
   // The stream is random, so dealing it during setup would render different
   // words on the server and the client — a hydration mismatch. Same reason
   // `useReadingSpeeds` defers its storage read to here.
   restart()
   remeasure()

   // A narrower viewport rewraps every line, which moves the character the
   // caret is sitting after.
   if (typeof ResizeObserver === "function" && viewport.value) {
      observer = new ResizeObserver(remeasure)
      observer.observe(viewport.value)
   }

   // A webfont arriving late remeasures every glyph, and the caret would
   // otherwise stay parked at the fallback font's metrics.
   void document.fonts?.ready.then(remeasure)
})

onBeforeUnmount(() => {
   observer?.disconnect()
   stopCountUp()
})
</script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

.typing {
   // One line of the stream. Set here rather than measured so the viewport
   // can be exactly three lines tall before anything has rendered into it.
   --typing-line: #{px-to-rem(44)};

   // The controls wrap onto as many rows as they need. Each group stays whole
   // when it wraps, so a pill never ends up looking as if it belongs to the
   // group beside it.
   &__settings {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2xs);
   }

   &__pills {
      display: flex;
      flex-wrap: wrap;
      gap: px-to-rem(2);
      inline-size: fit-content;
      padding: px-to-rem(3);
      border: 1px solid var(--line);
      border-radius: var(--radius-pill);
      background-color: var(--surface-sunken);
   }

   // Native radios and checkboxes in a fieldset, styled through their labels —
   // the same trade the theme toggle makes. Arrow-key navigation and the right
   // announcement come free; a role="radiogroup" would have to rebuild both.
   &__pill {
      padding: px-to-rem(5) var(--space-sm);
      border-radius: var(--radius-pill);
      color: var(--muted);
      font-size: px-to-rem(13);
      font-variant-numeric: tabular-nums;
      line-height: 1;
      white-space: nowrap;
      cursor: pointer;
      transition:
         color var(--duration) var(--ease),
         background-color var(--duration) var(--ease);

      &:hover {
         color: var(--ink);
      }
   }

   &__pill--active {
      background-color: var(--surface);
      box-shadow: var(--shadow-sm);
      color: var(--ink);
      font-weight: var(--weight-label);
   }

   // The input is visually hidden, so the ring goes on the label around it.
   &__pill:has(.typing__pill-input:focus-visible) {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
   }

   // A select rather than a fourth pill row: five topic names are longer than
   // a row of pills can hold on a phone, and a native select is the one
   // control that stays usable at that width.
   &__topic {
      flex: 1 1 px-to-rem(180);
      min-inline-size: px-to-rem(150);
      max-inline-size: px-to-rem(260);
   }

   &__select {
      min-block-size: px-to-rem(38);
      padding-block: px-to-rem(6);
      border-radius: var(--radius-pill);
      font-size: px-to-rem(13);
   }

   &__hud {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: var(--space-xs);
      color: var(--muted);
      font-size: px-to-rem(13);

      strong {
         color: var(--ink);
         font-variant-numeric: tabular-nums;
         font-weight: var(--weight-label);
      }
   }

   &__clock {
      color: var(--accent-strong);
      font-family: var(--font-display);
      font-size: px-to-rem(22);
      font-variant-numeric: tabular-nums;
      font-weight: var(--weight-heading);
      line-height: 1;
      transition: color var(--duration) var(--ease);
   }

   &__clock--low {
      color: var(--danger);
   }

   &__hud-item--best {
      margin-inline-start: auto;
   }

   &__stage {
      position: relative;
      cursor: text;
   }

   // Unfocused, the words go soft and the prompt sits over them — the one
   // state where the reader has to be told the keyboard is not connected to
   // anything yet.
   &__stage--idle .typing__viewport {
      filter: blur(3px);
      opacity: 0.55;
   }

   &__viewport {
      position: relative;
      block-size: calc(var(--typing-line) * 3);
      padding-inline: var(--space-2xs);
      overflow: hidden;
      transition:
         filter var(--duration) var(--ease),
         opacity var(--duration) var(--ease);
   }

   &__strip {
      position: relative;
      font-family: var(--font-mono);
      font-size: px-to-rem(21);
      line-height: var(--typing-line);
      // The caret animates between characters, so the words underneath it
      // must not also be sliding around.
      transition: transform calc(var(--duration) * 1.5) var(--ease);
      user-select: none;
   }

   // Inline-block so a word never breaks across two lines mid-way, which
   // would leave the caret tracking a character on the line above.
   &__word {
      display: inline-block;
      margin-inline-end: px-to-rem(12);
   }

   &__char {
      color: var(--muted);
      transition: color var(--duration) var(--ease);
   }

   &__char--correct {
      color: var(--ink);
   }

   &__char--incorrect {
      color: var(--danger);
      text-decoration: underline;
      text-decoration-thickness: 2px;
      text-underline-offset: 4px;
   }

   // Surplus characters past the end of the word. Dimmer than a plain error:
   // they are not a wrong letter so much as letters that should not be there.
   &__char--extra {
      color: var(--danger);
      opacity: 0.6;
   }

   &__caret {
      position: absolute;
      inset-block-start: 0;
      inset-inline-start: 0;
      inline-size: 2px;
      border-radius: var(--radius-pill);
      background-color: var(--accent-solid);
      // `transform` and not `left`/`top`: the caret moves on every keystroke,
      // and only a transform stays off the layout path.
      transition:
         transform var(--duration) var(--ease),
         opacity var(--duration) var(--ease);
      will-change: transform;
   }

   // Blinks only when the run is not going. During a run the caret is moving
   // constantly and a blink on top of that reads as a flicker.
   &__caret--resting {
      animation: typing-blink 1.1s steps(2, start) infinite;
   }

   &__prompt {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--ink-soft);
      font-size: px-to-rem(14);
      font-weight: var(--weight-label);
      text-align: center;
      pointer-events: none;
   }

   &__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(#{px-to-rem(150)}, 1fr));
      gap: var(--space-2xs);
      list-style: none;
   }

   // Staggered in on the run ending. An animation rather than a transition
   // because the tiles are mounted by `v-if` at that moment, and a transition
   // has no previous value to move from.
   &__tile {
      animation: typing-rise calc(var(--duration) * 2.5) var(--ease) backwards;
      animation-delay: calc(var(--index) * 60ms);
   }

   &__record {
      align-self: flex-start;
      padding: var(--space-3xs) var(--space-xs);
      border-radius: var(--radius-pill);
      background-color: var(--success-soft);
      color: var(--success);
      font-size: px-to-rem(13);
      font-weight: var(--weight-label);
   }

   &__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2xs);
   }

   @media (width < 40rem) {
      --typing-line: #{px-to-rem(38)};

      &__strip {
         font-size: px-to-rem(17);
      }

      &__hud-item--best {
         margin-inline-start: 0;
      }
   }
}

@keyframes typing-blink {
   0%,
   100% {
      opacity: 1;
   }

   50% {
      opacity: 0;
   }
}

@keyframes typing-rise {
   from {
      opacity: 0;
      transform: translateY(#{px-to-rem(8)});
   }

   to {
      opacity: 1;
      transform: none;
   }
}
</style>
