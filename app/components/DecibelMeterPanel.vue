<template>
   <div class="decibel stack stack--tight">
      <div class="card card--panel stack stack--tight">
         <div class="decibel__controls">
            <!-- Not disabled while starting: the permission prompt can sit
                 open indefinitely, and Stop is how someone changes their
                 mind without reloading the page. -->
            <button class="button button--primary" type="button" @click="toggle">
               {{ isLive ? COPY.decibel.stop : COPY.decibel.start }}
            </button>
            <button v-if="latest !== null" class="button" type="button" @click="reset">
               {{ COPY.decibel.reset }}
            </button>
            <p
               v-if="statusLabel"
               class="decibel__status"
               :class="{ 'decibel__status--live': status === 'running' }"
            >
               {{ statusLabel }}
            </p>
         </div>

         <p class="field__hint">
            {{ COPY.decibel.note }}
         </p>

         <p v-if="fault" class="notice" role="alert">
            {{ COPY.decibel.faults[fault] }}
         </p>

         <!-- Plain text rather than a live region. The reading changes four
              times a second, and announced on every change it would talk
              without pause; a screen reader reaches it by moving to it
              instead, and the region at the foot announces the start and
              the end of a run. -->
         <div class="decibel__readout">
            <p class="decibel__reading">
               <span class="visually-hidden">{{ COPY.decibel.levelLabel }}:</span>
               <span class="decibel__value">{{ shownDb === null ? "—" : formatLevel(shownDb) }}</span>
               <span class="decibel__unit">{{ COPY.decibel.unit }}</span>
            </p>
            <p class="decibel__comparison">
               {{ comparison }}
            </p>
         </div>

         <!-- The bar says what the number says, for the eye, so it is hidden
              from assistive technology rather than read out twice. -->
         <div class="decibel__meter" aria-hidden="true">
            <div class="decibel__track">
               <div
                  class="decibel__fill"
                  :class="`decibel__fill--${zone}`"
                  :style="{ inlineSize: percent(liveDb) }"
               />
               <div v-if="loudest !== null" class="decibel__hold" :style="{ insetInlineStart: percent(loudest) }" />
            </div>
            <ol class="decibel__scale">
               <li
                  v-for="tick in TICKS"
                  :key="tick"
                  class="decibel__tick"
                  :style="{ insetInlineStart: percent(tick) }"
               >
                  {{ tick }}
               </li>
            </ol>
         </div>

         <ul class="decibel__stats">
            <li v-for="item in stats" :key="item.key" class="stat decibel__stat">
               <span class="stat__value">
                  {{ item.value === null ? "—" : formatLevel(item.value) }}
                  <span v-if="item.value !== null" class="decibel__stat-unit">{{ COPY.decibel.unit }}</span>
               </span>
               <span class="stat__label">{{ item.label }}</span>
            </li>
         </ul>

         <p v-if="exposure" class="decibel__notice" :class="`decibel__notice--${exposure.zone}`">
            {{ exposure.text }}
         </p>
         <p v-if="session.clipped" class="decibel__notice">
            {{ COPY.decibel.clipped }}
         </p>
         <p v-if="silent" class="decibel__notice">
            {{ COPY.decibel.silent }}
         </p>

         <!-- Side by side on a wide screen, one above the other on a phone.
              Both are the same height, so their axes line up across the gap. -->
         <div class="decibel__charts">
            <!-- Hidden from assistive technology whole. The graph is a picture
                 of the last minute for the eye; the three figures above are
                 the same minute in words, and they are what a screen reader
                 gets. -->
            <figure class="decibel__figure" aria-hidden="true">
               <figcaption class="decibel__figure-head">
                  <span class="decibel__figure-label">{{ historyLabel }}</span>
               </figcaption>

               <div class="decibel__chart">
                  <ol class="decibel__axis">
                     <li
                        v-for="tick in TICKS"
                        :key="tick"
                        class="decibel__axis-tick"
                        :style="{ insetBlockStart: `${(chartY(tick) / CHART_HEIGHT) * 100}%` }"
                     >
                        {{ tick }}
                     </li>
                  </ol>

                  <div
                     class="decibel__plot"
                     @pointerdown="point"
                     @pointermove="point"
                     @pointerleave="unpoint"
                     @pointercancel="unpoint"
                  >
                     <svg
                        class="decibel__svg"
                        :viewBox="`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`"
                        preserveAspectRatio="none"
                        focusable="false"
                     >
                        <line
                           v-for="tick in TICKS"
                           :key="tick"
                           class="decibel__grid"
                           x1="0"
                           :x2="CHART_WIDTH"
                           :y1="chartY(tick)"
                           :y2="chartY(tick)"
                        />
                        <path class="decibel__area" :d="areaPath" />
                        <path class="decibel__line" :d="linePath" />
                        <line
                           v-if="cursor"
                           class="decibel__cursor"
                           :x1="cursor.x * CHART_WIDTH"
                           :x2="cursor.x * CHART_WIDTH"
                           y1="0"
                           :y2="CHART_HEIGHT"
                        />
                     </svg>

                     <!-- The dot and the label are HTML over the drawing
                          rather than inside it: the drawing stretches to fit,
                          and a circle drawn in it would stretch into an
                          ellipse. -->
                     <template v-if="cursor">
                        <span
                           class="decibel__dot"
                           :style="{ insetInlineStart: `${cursor.x * 100}%`, insetBlockStart: `${cursor.y * 100}%` }"
                        />
                        <span
                           class="decibel__tooltip"
                           :style="{ insetInlineStart: `${cursor.x * 100}%`, transform: `translateX(-${cursor.x * 100}%)` }"
                        >
                           <strong class="decibel__tooltip-value">{{ cursor.value }}</strong>
                           <span class="decibel__tooltip-detail">{{ cursor.when }}</span>
                        </span>
                     </template>
                  </div>

                  <p class="decibel__times">
                     <span>{{ oldestLabel }}</span>
                     <span>{{ COPY.decibel.now }}</span>
                  </p>
               </div>
            </figure>

            <figure class="decibel__figure">
               <figcaption class="decibel__figure-head">
                  <span class="decibel__figure-label">{{ COPY.decibel.spectrumLabel }}</span>
                  <span v-if="loudestLabel" class="decibel__loudest">{{ loudestLabel }}</span>
               </figcaption>

               <!-- The bars are for the eye. The list after them is the same
                    ten levels in words, which is what a screen reader gets. -->
               <div class="decibel__chart" aria-hidden="true">
                  <ol class="decibel__axis">
                     <li
                        v-for="tick in SPECTRUM_TICKS"
                        :key="tick"
                        class="decibel__axis-tick"
                        :style="{ insetBlockStart: spectrumTop(tick) }"
                     >
                        {{ tick }}
                     </li>
                  </ol>

                  <div
                     class="decibel__plot decibel__bands"
                     @pointerdown="pointBand"
                     @pointermove="pointBand"
                     @pointerleave="unpointBand"
                     @pointercancel="unpointBand"
                  >
                     <span
                        v-for="tick in SPECTRUM_TICKS"
                        :key="tick"
                        class="decibel__gridline"
                        :style="{ insetBlockStart: spectrumTop(tick) }"
                     />
                     <span
                        v-for="(band, index) in bands"
                        :key="band.nominal"
                        class="decibel__band"
                        :class="{
                           'decibel__band--loudest': index === loudestIndex,
                           'decibel__band--active': index === bandPointer,
                        }"
                     >
                        <span class="decibel__band-bar" :style="{ blockSize: `${band.height * 100}%` }" />
                     </span>

                     <span
                        v-if="bandTip"
                        class="decibel__tooltip"
                        :style="{ insetInlineStart: `${bandTip.x * 100}%`, transform: `translateX(-${bandTip.x * 100}%)` }"
                     >
                        <strong class="decibel__tooltip-value">{{ bandTip.value }}</strong>
                        <span class="decibel__tooltip-detail">{{ bandTip.band }}</span>
                     </span>
                  </div>

                  <span class="decibel__corner">{{ COPY.decibel.hertz }}</span>
                  <ol class="decibel__band-labels">
                     <li v-for="band in bands" :key="band.nominal">
                        {{ band.axis }}
                     </li>
                  </ol>
               </div>

               <ul class="visually-hidden">
                  <li v-for="band in bands" :key="band.nominal">
                     {{ band.spoken }}:
                     {{ band.level === null ? "—" : `${formatLevel(band.level)} ${COPY.decibel.decibelsSpoken}` }}
                  </li>
               </ul>
            </figure>
         </div>

         <div class="field">
            <label class="field__label" :for="`${uid}-calibration`">
               {{ COPY.decibel.calibrationLabel }}: {{ signedCalibration }} {{ COPY.decibel.unit }}
            </label>
            <input
               :id="`${uid}-calibration`"
               class="slider"
               type="range"
               :min="CALIBRATION_MIN"
               :max="CALIBRATION_MAX"
               step="1"
               :value="calibration"
               :aria-valuetext="`${signedCalibration} ${COPY.decibel.decibelsSpoken}`"
               :aria-describedby="`${uid}-calibration-hint`"
               @input="calibrate"
            />
            <p :id="`${uid}-calibration-hint`" class="field__hint">
               {{ COPY.decibel.calibrationHint }}
            </p>
         </div>
      </div>

      <!-- Server-rendered, so the page carries real reference figures before
           anyone presses Start — and the row nearest the live reading is
           marked as the reading moves, which is what ties the two together. -->
      <section class="stack stack--tight">
         <h2 class="section-heading">
            {{ COPY.decibel.referencesHeading }}
         </h2>
         <p class="decibel__lede">
            {{ COPY.decibel.referencesLede }}
         </p>

         <div class="card decibel__references">
            <div class="data-table">
               <table class="data-table__table">
                  <thead>
                     <tr>
                        <th class="data-table__cell data-table__head" scope="col">
                           {{ COPY.decibel.soundColumn }}
                        </th>
                        <th class="data-table__cell data-table__head data-table__cell--value" scope="col">
                           {{ COPY.decibel.levelColumn }}
                        </th>
                     </tr>
                  </thead>
                  <tbody>
                     <tr
                        v-for="reference in SOUND_REFERENCES"
                        :key="reference.id"
                        class="data-table__row"
                        :class="{ 'data-table__row--active': reference.id === activeReference }"
                     >
                        <th class="data-table__cell decibel__sound" scope="row">
                           {{ COPY.decibel.references[reference.id] }}
                        </th>
                        <td class="data-table__cell data-table__cell--value">
                           {{ reference.level }} {{ COPY.decibel.unit }}
                        </td>
                     </tr>
                  </tbody>
               </table>
            </div>
         </div>
      </section>

      <p class="visually-hidden" aria-live="polite">
         {{ announcement }}
      </p>
   </div>
</template>

<script lang="ts" setup>
import type { LoudnessZone, SoundReferenceId } from "~/utils/decibel"

/// The panel draws what `useDecibelMeter` measures. Every level arrives in
/// dBFS and becomes decibels here, at the last moment, with the current
/// calibration — so moving the slider re-scales the number, the bar, the
/// figures and the whole graph at once, readings from before it moved
/// included.

const uid = useId()

const { status, fault, latest, history, session, silent, spectrum, start, stop, reset } = useDecibelMeter()
const { calibration, sync, setCalibration } = useDecibelCalibration()

/** The scale's labels, every 20 dB. */
const TICK_STEP = 20
const TICKS = Array.from(
   { length: (SCALE_MAX - SCALE_MIN) / TICK_STEP + 1 },
   (_, index) => SCALE_MIN + index * TICK_STEP,
)

/** The graph's drawing space. It stretches to fit, so only the ratio matters. */
const CHART_WIDTH = 600
const CHART_HEIGHT = 200

/**
 * How long the big number holds each value, in seconds.
 *
 * The bar and the graph move with every reading, ten times a second. A
 * number changing that often cannot be read — the digits smear into one
 * another — so it holds each value for a quarter of a second, about the
 * rate a hand-held meter's display refreshes at.
 */
const READOUT_HOLD = 0.25

const isLive = computed(() => status.value === "running" || status.value === "starting")

const statusLabel = computed(() => {
   if (status.value === "starting") return COPY.decibel.starting
   if (status.value === "running") return COPY.decibel.listening
   if (status.value === "stopped") return COPY.decibel.stopped

   return ""
})

function toggle(): void {
   if (isLive.value) stop()
   else void start()
}

/** A dBFS level as the decibels on screen. */
const toDb = (dbfs: number): number => toSoundLevel(dbfs, calibration.value)

/**
 * Whole decibels, with a true minus. A band in a quiet room can dip below
 * zero, and a hyphen there reads as a dash rather than a sign.
 */
function formatLevel(level: number): string {
   const rounded = Math.round(level)

   return rounded < 0 ? `−${-rounded}` : String(rounded)
}

/** A level's place along the bar, as a CSS length. Nothing reads as empty. */
const percent = (level: number | null): string => `${level === null ? 0 : scalePosition(level) * 100}%`

/// --- The number -----------------------------------------------------------

/** The dBFS level on show, held for `READOUT_HOLD` at a time. */
const shown = shallowRef<number | null>(null)
let shownAt = Number.NEGATIVE_INFINITY

// `sync`, so the hold sees every reading. A default watcher is batched to
// the next render, and a tab brought back from the background can be
// handed a second of queued readings at once — the hold would then only
// ever see the last of them, and would show whichever one that was.
watch(latest, (reading) => {
   if (reading === null) {
      shown.value = null
      shownAt = Number.NEGATIVE_INFINITY

      return
   }

   if (reading.time - shownAt < READOUT_HOLD) return

   shown.value = isSilentReading(reading) ? null : reading.level
   shownAt = reading.time
}, { flush: "sync" })

const shownDb = computed(() => shown.value === null ? null : Math.round(toDb(shown.value)))

const comparison = computed(() => {
   if (shownDb.value !== null) return COPY.decibel.comparisons[nearestReference(shownDb.value)]

   return status.value === "idle" ? COPY.decibel.idle : ""
})

const activeReference = computed<SoundReferenceId | null>(() =>
   shownDb.value === null ? null : nearestReference(shownDb.value))

/// --- The bar --------------------------------------------------------------

/** The latest level, unheld — the bar is meant to move. */
const liveDb = computed(() => {
   const reading = latest.value

   return reading === null || isSilentReading(reading) ? null : toDb(reading.level)
})

const zone = computed<LoudnessZone>(() => liveDb.value === null ? "safe" : loudnessZone(liveDb.value))

/** The session's loudest moment, held on the bar as a marker. */
const loudest = computed(() => Number.isFinite(session.value.max) ? toDb(session.value.max) : null)

/// --- The figures ----------------------------------------------------------

const stats = computed(() => {
   const rounded = (dbfs: number | null): number | null =>
      dbfs === null || !Number.isFinite(dbfs) ? null : Math.round(toDb(dbfs))

   return [
      { key: "min", label: COPY.decibel.minLabel, value: rounded(session.value.min) },
      { key: "average", label: COPY.decibel.averageLabel, value: rounded(sessionAverage(session.value)) },
      { key: "max", label: COPY.decibel.maxLabel, value: rounded(session.value.max) },
   ]
})

/**
 * The hearing notice, read off the average rather than the moment, and
 * only once there is enough of it to judge — see `EXPOSURE_MIN_SECONDS`.
 */
const exposure = computed(() => {
   const average = sessionAverage(session.value)

   if (average === null || session.value.seconds < EXPOSURE_MIN_SECONDS) return null

   const risk = loudnessZone(toDb(average))

   if (risk === "safe") return null

   const threshold = risk === "harmful" ? HEARING_HARM_LEVEL : HEARING_RISK_LEVEL

   return { zone: risk, text: COPY.decibel[risk].replace("{level}", String(threshold)) }
})

/// --- The graph ------------------------------------------------------------

const historyLabel = COPY.decibel.historyLabel.replace("{seconds}", String(HISTORY_SECONDS))
const oldestLabel = COPY.decibel.ago.replace("{seconds}", String(HISTORY_SECONDS))

/** The newest reading's time: the graph's right-hand edge. */
const end = computed(() => history.value.at(-1)?.time ?? 0)

const chartX = (time: number): number => (time - end.value + HISTORY_SECONDS) / HISTORY_SECONDS * CHART_WIDTH
const chartY = (level: number): number => (1 - scalePosition(level)) * CHART_HEIGHT

const linePath = computed(() =>
   history.value
      .map((point, index) =>
         `${index === 0 ? "M" : "L"}${chartX(point.time).toFixed(1)} ${chartY(toDb(point.level)).toFixed(1)}`)
      .join(""))

/** The line, closed down to the floor — the wash under it. */
const areaPath = computed(() => {
   const first = history.value[0]
   const newest = history.value.at(-1)

   if (!first || !newest) return ""

   return `${linePath.value}L${chartX(newest.time).toFixed(1)} ${CHART_HEIGHT}L${chartX(first.time).toFixed(1)} ${CHART_HEIGHT}Z`
})

/** Where the pointer is across the graph, from 0 to 1, or null when it is not. */
const pointer = ref<number | null>(null)

function point(event: PointerEvent): void {
   const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()

   pointer.value = bounds.width > 0
      ? Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width))
      : null
}

function unpoint(): void {
   pointer.value = null
}

/**
 * The crosshair: the reading nearest the pointer.
 *
 * Kept live while a run goes on, so a pointer held still reads "20 s ago"
 * as the graph scrolls beneath it — the same moment of the past, not the
 * same reading.
 */
const cursor = computed(() => {
   const first = history.value[0]

   if (pointer.value === null || !first) return null

   const time = end.value - HISTORY_SECONDS + pointer.value * HISTORY_SECONDS

   // Left of where the run began there is nothing to point at.
   if (time < first.time - READING_INTERVAL) return null

   const nearest = nearestByTime(history.value, time)

   if (!nearest) return null

   const level = toDb(nearest.level)
   const ago = Math.round(end.value - nearest.time)

   return {
      x: chartX(nearest.time) / CHART_WIDTH,
      y: chartY(level) / CHART_HEIGHT,
      value: nearest.level <= SILENCE_DBFS ? "—" : `${formatLevel(level)} ${COPY.decibel.unit}`,
      when: ago === 0 ? COPY.decibel.now : COPY.decibel.ago.replace("{seconds}", String(ago)),
   }
})

/// --- The spectrum ---------------------------------------------------------

const SPECTRUM_TICKS = Array.from(
   { length: (SPECTRUM_MAX - SPECTRUM_MIN) / TICK_STEP + 1 },
   (_, index) => SPECTRUM_MIN + index * TICK_STEP,
)

/** A level's distance down from the top of the spectrum, as a CSS length. */
const spectrumTop = (level: number): string =>
   `${(1 - scalePosition(level, SPECTRUM_MIN, SPECTRUM_MAX)) * 100}%`

/** Each band named three ways: "1k" on the axis, "1 kHz" in text, "1 kilohertz" aloud. */
const BANDS = OCTAVE_BANDS.map((nominal) => {
   if (nominal < 1000) {
      return {
         nominal,
         axis: String(nominal),
         text: `${nominal} ${COPY.decibel.hertz}`,
         spoken: `${nominal} ${COPY.decibel.hertzSpoken}`,
      }
   }

   const kilo = nominal / 1000

   return {
      nominal,
      axis: `${kilo}k`,
      text: `${kilo} ${COPY.decibel.kilohertz}`,
      spoken: `${kilo} ${COPY.decibel.kilohertzSpoken}`,
   }
})

const bands = computed(() => BANDS.map((band, index) => {
   const dbfs = spectrum.value?.[index] ?? null
   // A silent band has no level to draw, rather than a level at the floor.
   const level = dbfs === null || dbfs <= SILENCE_DBFS ? null : toDb(dbfs)

   return {
      ...band,
      level,
      height: level === null ? 0 : scalePosition(level, SPECTRUM_MIN, SPECTRUM_MAX),
   }
}))

/** The loudest band, held until another beats it clearly — see `loudestBand`. */
const loudestIndex = ref<number | null>(null)

watch(spectrum, (levels) => {
   loudestIndex.value = levels === null ? null : loudestBand(levels, loudestIndex.value)
})

const loudestLabel = computed(() => {
   const band = loudestIndex.value === null ? undefined : BANDS[loudestIndex.value]

   return band ? COPY.decibel.loudestBand.replace("{band}", band.text) : null
})

/** The band under the pointer, or null when it is off the bars. */
const bandPointer = ref<number | null>(null)

function pointBand(event: PointerEvent): void {
   const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
   const across = (event.clientX - bounds.left) / bounds.width

   bandPointer.value = bounds.width > 0
      ? Math.min(BANDS.length - 1, Math.max(0, Math.floor(across * BANDS.length)))
      : null
}

function unpointBand(): void {
   bandPointer.value = null
}

const bandTip = computed(() => {
   const index = bandPointer.value
   const band = index === null ? undefined : bands.value[index]

   if (index === null || !band || spectrum.value === null) return null

   return {
      x: (index + 0.5) / BANDS.length,
      value: band.level === null ? "—" : `${formatLevel(band.level)} ${COPY.decibel.unit}`,
      band: band.text,
   }
})

/// --- Calibration ----------------------------------------------------------

/** With its sign, and a true minus rather than a hyphen. */
const signedCalibration = computed(() => {
   const offset = calibration.value

   if (offset > 0) return `+${offset}`
   if (offset < 0) return `−${Math.abs(offset)}`

   return "0"
})

function calibrate(event: Event): void {
   setCalibration(Number((event.target as HTMLInputElement).value))
}

/// --- Announcements --------------------------------------------------------

const announcement = ref("")

watch(status, (next, previous) => {
   if (next === "running") {
      announcement.value = COPY.decibel.startedAnnouncement

      return
   }

   if (next !== "stopped" || previous !== "running") return

   const average = sessionAverage(session.value)

   if (average === null) {
      announcement.value = COPY.decibel.stoppedAnnouncement

      return
   }

   // Spelled out rather than abbreviated: this string exists only to be
   // read aloud, and a voice makes "58 dB" into "fifty-eight d b".
   announcement.value = [
      COPY.decibel.stoppedAnnouncement,
      `${formatLevel(toDb(average))} ${COPY.decibel.decibelsSpoken} ${COPY.decibel.averageSpoken},`,
      `${formatLevel(toDb(session.value.max))} ${COPY.decibel.decibelsSpoken} ${COPY.decibel.loudestSpoken}.`,
   ].join(" ")
})

// The stored calibration is read after hydration, the same way the word
// counter's speeds are: storage does not exist on the server, and reading
// it during setup would render a different label on each side.
onMounted(sync)
</script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

.decibel {
   &__controls {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2xs);
   }

   &__status {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2xs);
      margin-inline-start: auto;
      color: var(--muted);
      font-size: px-to-rem(13);
      font-weight: var(--weight-label);
   }

   // A recording light. The browser's own microphone indicator is up in
   // the tab strip or the status bar, where it is easy to miss that the
   // page is still listening.
   &__status--live {
      color: var(--ink);

      &::before {
         content: "";
         inline-size: px-to-rem(8);
         block-size: px-to-rem(8);
         border-radius: 50%;
         background-color: var(--danger);
         animation: decibel-pulse 1.6s var(--ease) infinite;
      }
   }

   &__readout {
      display: flex;
      flex-direction: column;
      gap: var(--space-3xs);
   }

   &__reading {
      display: flex;
      align-items: baseline;
      gap: var(--space-2xs);
      line-height: 1;
   }

   // Tabular figures, against the usual advice for a number this size: it
   // changes four times a second, and proportional digits would shuffle
   // the unit beside it back and forth on every change.
   &__value {
      color: var(--ink);
      font-family: var(--font-display);
      font-size: clamp(#{px-to-rem(56)}, 14vw, #{px-to-rem(88)});
      font-variant-numeric: tabular-nums;
      font-weight: var(--weight-heading);
      letter-spacing: -0.03em;
   }

   &__unit {
      color: var(--muted);
      font-family: var(--font-display);
      font-size: px-to-rem(24);
      font-weight: var(--weight-label);
   }

   // Holds its line even when empty, so the bar under it does not jump as
   // the text comes and goes.
   &__comparison {
      min-block-size: 1.5em;
      color: var(--ink-soft);
      font-size: px-to-rem(15);
      line-height: 1.5;
   }

   &__meter {
      display: flex;
      flex-direction: column;
      gap: var(--space-3xs);
   }

   // Track and fill are two steps of the same indigo, so the bar reads as
   // one object at any level; only the fill changes colour, and only once
   // a level is loud enough to matter.
   &__track {
      position: relative;
      block-size: px-to-rem(12);
      border-radius: var(--radius-pill);
      background-color: var(--accent-soft);
      overflow: hidden;
   }

   &__fill {
      block-size: 100%;
      border-radius: var(--radius-pill);
      background-color: var(--accent-solid);
      // Linear and one reading long, so ten updates a second read as
      // movement rather than as a staircase.
      transition:
         inline-size 100ms linear,
         background-color var(--duration) var(--ease);
   }

   &__fill--risky {
      background-color: var(--warn);
   }

   &__fill--harmful {
      background-color: var(--danger);
   }

   &__hold {
      position: absolute;
      inset-block: 0;
      inline-size: 2px;
      margin-inline-start: -1px;
      background-color: var(--ink);
   }

   &__scale {
      position: relative;
      block-size: px-to-rem(16);
      color: var(--muted);
      font-size: px-to-rem(11);
      font-variant-numeric: tabular-nums;
      list-style: none;
   }

   // Centred on their mark, except the two ends, which would otherwise hang
   // half outside the bar.
   &__tick {
      position: absolute;
      transform: translateX(-50%);

      &:first-child {
         transform: none;
      }

      &:last-child {
         transform: translateX(-100%);
      }
   }

   // Three across at every width: they are one set — the bottom, the middle
   // and the top of the same minute — and wrapping one of them onto a row
   // of its own would read as a different kind of figure.
   &__stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--space-2xs);
      list-style: none;
   }

   &__stat-unit {
      color: var(--muted);
      font-size: 0.6em;
      font-weight: var(--weight-label);
   }

   &__notice {
      padding: var(--space-2xs) var(--space-xs);
      border: 1px solid var(--line-strong);
      border-radius: var(--radius-md);
      background-color: var(--surface-raised);
      color: var(--ink-soft);
      font-size: px-to-rem(14);
   }

   &__notice--risky {
      border-color: var(--warn);
      background-color: var(--warn-soft);
      color: var(--warn);
   }

   &__notice--harmful {
      border-color: var(--danger);
      background-color: var(--danger-soft);
      color: var(--danger);
   }

   // The history over three fifths and the spectrum over two once there is
   // room: the history is sixty seconds wide and wants the width, while ten
   // bars read perfectly well in less.
   &__charts {
      display: grid;
      gap: var(--space-md);

      @media (width >= 60rem) {
         grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
      }
   }

   &__figure {
      display: flex;
      flex-direction: column;
      gap: var(--space-2xs);
   }

   &__figure-head {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--space-3xs) var(--space-xs);
   }

   &__figure-label {
      color: var(--muted);
      font-size: px-to-rem(13);
      font-weight: var(--weight-label);
   }

   &__loudest {
      color: var(--ink-soft);
      font-size: px-to-rem(13);
      font-variant-numeric: tabular-nums;
   }

   &__chart {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: var(--space-3xs) var(--space-2xs);
   }

   &__axis {
      position: relative;
      inline-size: 3ch;
      color: var(--muted);
      font-size: px-to-rem(11);
      font-variant-numeric: tabular-nums;
      text-align: end;
      list-style: none;
   }

   &__axis-tick {
      position: absolute;
      inset-inline-end: 0;
      transform: translateY(-50%);
   }

   &__plot {
      position: relative;
      block-size: px-to-rem(160);
      cursor: crosshair;
      // A sideways drag scrubs the graph on a touch screen, while an
      // up-and-down one still scrolls the page.
      touch-action: pan-y;
   }

   &__svg {
      display: block;
      inline-size: 100%;
      block-size: 100%;
      overflow: visible;
   }

   // Every stroke keeps its width while the drawing stretches to fit.
   &__grid,
   &__line,
   &__cursor {
      vector-effect: non-scaling-stroke;
   }

   &__grid {
      stroke: var(--line);
      stroke-width: 1;
   }

   // A wash, not a block: the line is the data, and the fill under it only
   // makes the shape of the minute easier to take in.
   &__area {
      fill: var(--accent);
      fill-opacity: 0.1;
   }

   &__line {
      fill: none;
      stroke: var(--accent);
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
   }

   &__cursor {
      stroke: var(--line-strong);
      stroke-width: 1;
   }

   // Ringed in the surface colour so it stays distinct where it sits on
   // the line it marks.
   &__dot {
      position: absolute;
      inline-size: px-to-rem(10);
      block-size: px-to-rem(10);
      border: 2px solid var(--surface);
      border-radius: 50%;
      background-color: var(--accent);
      transform: translate(-50%, -50%);
      pointer-events: none;
   }

   // Positioned by the component so it slides from flush-left to
   // flush-right as the cursor crosses the graph, and never overhangs
   // either edge.
   &__tooltip {
      position: absolute;
      inset-block-start: var(--space-3xs);
      display: flex;
      align-items: baseline;
      gap: var(--space-2xs);
      padding: var(--space-3xs) var(--space-2xs);
      border: 1px solid var(--line-strong);
      border-radius: var(--radius-sm);
      background-color: var(--surface);
      box-shadow: var(--shadow-md);
      font-size: px-to-rem(12);
      white-space: nowrap;
      pointer-events: none;
   }

   &__tooltip-value {
      color: var(--ink);
      font-weight: var(--weight-label);
   }

   &__tooltip-detail {
      color: var(--muted);
   }

   // Ten equal columns with a 2px gap between them — the gap is what keeps
   // two neighbouring bars at the same height reading as two.
   &__bands {
      display: grid;
      grid-template-columns: repeat(10, minmax(0, 1fr));
      gap: 2px;
   }

   // Drawn under the bars: each band is positioned, so it paints later.
   &__gridline {
      position: absolute;
      inset-inline: 0;
      border-block-start: 1px solid var(--line);
   }

   &__band {
      position: relative;
      display: flex;
      align-items: flex-end;
      justify-content: center;
   }

   // Square where it meets the floor, rounded at the end that carries the
   // level. Capped in width so a wide screen gets air between thin bars
   // rather than a row of slabs.
   &__band-bar {
      inline-size: 100%;
      max-inline-size: px-to-rem(24);
      border-radius: 4px 4px 0 0;
      background-color: var(--accent);
      // Seventy per cent still clears 3:1 against the card in both themes;
      // the loudest band and the one under the pointer go to full strength.
      opacity: 0.7;
      transition:
         block-size 60ms linear,
         opacity var(--duration) var(--ease);
   }

   &__band--loudest &__band-bar,
   &__band--active &__band-bar {
      opacity: 1;
   }

   &__corner {
      color: var(--muted);
      font-size: px-to-rem(11);
      text-align: end;
   }

   &__band-labels {
      display: grid;
      grid-template-columns: repeat(10, minmax(0, 1fr));
      gap: 2px;
      color: var(--muted);
      font-size: px-to-rem(11);
      font-variant-numeric: tabular-nums;
      text-align: center;
      white-space: nowrap;
      list-style: none;

      // A column is barely 20px on a 320px phone, where "31.5" at 11px runs
      // into its neighbour. A point smaller keeps each label inside its bar.
      @media (width < 24rem) {
         font-size: px-to-rem(10);
      }
   }

   &__times {
      display: flex;
      grid-column: 2;
      justify-content: space-between;
      color: var(--muted);
      font-size: px-to-rem(11);
   }

   &__lede {
      max-inline-size: var(--measure);
      color: var(--ink-soft);
      line-height: 1.6;
   }

   &__references {
      padding-block: var(--space-2xs);
   }

   // Allowed to wrap, unlike a converter's unit names. These are phrases —
   // "City traffic, heard from inside a car" — and held to one line they
   // push the table wider than a phone, turning it into a sideways-scrolling
   // box that a keyboard cannot reach.
   &__sound {
      white-space: normal;
   }

   @media (width < 40rem) {
      &__plot {
         block-size: px-to-rem(128);
      }

      &__stat {
         padding: var(--space-xs);
      }

      // A notch down from the site's tile size, so "109 dB" still fits on
      // one line three to a row on a 390px phone.
      &__stat .stat__value {
         font-size: px-to-rem(22);
      }
   }
}

@keyframes decibel-pulse {
   0%,
   100% {
      opacity: 1;
   }

   50% {
      opacity: 0.35;
   }
}
</style>
