<template>
   <div class="text-stats card card--panel stack stack--tight">
      <div class="field">
         <label class="field__label" :for="`${uid}-text`">
            {{ COPY.stats.inputLabel }}
         </label>
         <textarea
            :id="`${uid}-text`"
            v-model="text"
            class="control control--textarea"
            :placeholder="COPY.stats.placeholder"
         />
      </div>

      <div class="text-stats__actions">
         <button class="button" type="button" :disabled="text === ''" @click="text = ''">
            {{ COPY.common.clear }}
         </button>
         <CopyButton :value="text" />
         <button
            ref="trigger"
            class="button button--icon text-stats__settings-trigger"
            type="button"
            :aria-label="COPY.stats.settingsLabel"
            :aria-expanded="isOpen"
            :aria-controls="`${uid}-settings`"
            @click="toggle"
         >
            <span aria-hidden="true">⚙</span>
         </button>
      </div>

      <form
         v-if="isOpen"
         :id="`${uid}-settings`"
         class="text-stats__settings"
         :aria-labelledby="`${uid}-settings-title`"
         @submit.prevent="save"
         @keydown.esc="cancel"
      >
         <h2 :id="`${uid}-settings-title`" class="text-stats__settings-title">
            {{ COPY.stats.settingsHeading }}
         </h2>

         <label class="checkbox">
            <input
               ref="recommended"
               v-model="draft.useRecommended"
               class="checkbox__box"
               type="checkbox"
            />
            <span class="checkbox__label">
               {{ COPY.stats.useRecommended }}
               ({{ READING_WORDS_PER_MINUTE }} / {{ SPEAKING_WORDS_PER_MINUTE }}
               {{ COPY.stats.wordsPerMinute }})
            </span>
         </label>

         <div class="field" :class="{ 'field--disabled': draft.useRecommended }">
            <label class="field__label" :for="`${uid}-reading`">
               {{ COPY.stats.readingSpeedLabel }}: {{ preview.reading }} {{ COPY.stats.wordsPerMinute }}
            </label>
            <input
               :id="`${uid}-reading`"
               class="slider"
               type="range"
               :min="READING_SPEED_MIN"
               :max="READING_SPEED_MAX"
               :step="SPEED_STEP"
               :value="preview.reading"
               :disabled="draft.useRecommended"
               @input="draft.reading = toSpeed($event)"
            />
         </div>

         <div class="field" :class="{ 'field--disabled': draft.useRecommended }">
            <label class="field__label" :for="`${uid}-speaking`">
               {{ COPY.stats.speakingSpeedLabel }}: {{ preview.speaking }} {{ COPY.stats.wordsPerMinute }}
            </label>
            <input
               :id="`${uid}-speaking`"
               class="slider"
               type="range"
               :min="SPEAKING_SPEED_MIN"
               :max="SPEAKING_SPEED_MAX"
               :step="SPEED_STEP"
               :value="preview.speaking"
               :disabled="draft.useRecommended"
               @input="draft.speaking = toSpeed($event)"
            />
         </div>

         <p class="field__hint">
            {{ COPY.stats.settingsHint }}
         </p>

         <div class="text-stats__settings-actions">
            <button class="button" type="button" @click="cancel">
               {{ COPY.common.cancel }}
            </button>
            <button class="button button--primary" type="submit">
               {{ COPY.common.save }}
            </button>
         </div>
      </form>

      <!-- `aria-live` on the grid means the numbers are announced as they
           change, rather than being a silent update for screen readers. It
           drops to "off" while the settings are open: a slider already
           announces its own value on every step, and eight tiles talking
           over that would bury it. The region below covers what that
           silences. -->
      <ul class="text-stats__grid" :aria-live="isOpen ? 'off' : 'polite'">
         <li v-for="item in items" :key="item.key" class="stat">
            <span class="stat__value">{{ item.value }}</span>
            <span class="stat__label">{{ item.label }}</span>
         </li>
      </ul>

      <!-- Saving usually changes nothing on screen — the tiles already
           moved as the sliders did — so the grid has nothing to announce
           at the moment it starts listening again. This says what the
           estimates ended up as. -->
      <p class="visually-hidden" aria-live="polite">
         {{ announcement }}
      </p>
   </div>
</template>

<script lang="ts" setup>
/// The gear expands the speed settings in place rather than opening a
/// dialog. Watching the estimate move as the slider does is the whole
/// point of the control, and a modal works against that: it dims the
/// tiles behind a scrim on a desktop and covers them outright on a phone.
///
/// The cost is that Escape, focus on open and focus back on close have to
/// be written by hand here, where `showModal()` would have given them for
/// free. That is about thirty lines, and worth it for the live feedback.

const uid = useId()

const text = ref("")

const { speeds, usesDefaults, setSpeeds, sync } = useReadingSpeeds()

const isOpen = ref(false)
const announcement = ref("")

const trigger = useTemplateRef<HTMLButtonElement>("trigger")
const recommended = useTemplateRef<HTMLInputElement>("recommended")

// What the sliders edit. Nothing reaches `setSpeeds` until Save, so Escape
// and Cancel revert simply by collapsing: the draft is thrown away and
// reseeded from the committed speeds the next time the panel opens.
const draft = reactive({
   reading: READING_WORDS_PER_MINUTE,
   speaking: SPEAKING_WORDS_PER_MINUTE,
   useRecommended: true,
})

// While the box is ticked the sliders show the recommended figures, but
// `draft` keeps whatever was dragged to — so unticking hands the value
// back rather than making someone find it again. A disabled input fires no
// `input` event, so nothing overwrites it in the meantime.
const preview = computed<TextSpeeds>(() => {
   if (!isOpen.value) return speeds.value

   return draft.useRecommended
      ? DEFAULT_SPEEDS
      : { reading: draft.reading, speaking: draft.speaking }
})

// Reading `preview` rather than `speeds` is what makes the tiles track the
// sliders live, before anything is committed.
const stats = computed(() => analyseText(text.value, preview.value))

/** "Reading time" normally; "Reading time (300 wpm)" once it is not 238. */
const speedLabel = (base: string, value: number, recommendedValue: number): string =>
   value === recommendedValue ? base : `${base} (${value} ${COPY.stats.wordsPerMinute})`

const items = computed(() => [
   { key: "words", label: COPY.stats.words, value: formatCount(stats.value.words) },
   { key: "characters", label: COPY.stats.characters, value: formatCount(stats.value.characters) },
   {
      key: "charactersNoSpaces",
      label: COPY.stats.charactersNoSpaces,
      value: formatCount(stats.value.charactersNoSpaces),
   },
   { key: "sentences", label: COPY.stats.sentences, value: formatCount(stats.value.sentences) },
   { key: "paragraphs", label: COPY.stats.paragraphs, value: formatCount(stats.value.paragraphs) },
   { key: "lines", label: COPY.stats.lines, value: formatCount(stats.value.lines) },
   {
      key: "readingTime",
      label: speedLabel(COPY.stats.readingTime, preview.value.reading, READING_WORDS_PER_MINUTE),
      value: formatDuration(stats.value.readingTimeSeconds),
   },
   {
      key: "speakingTime",
      label: speedLabel(COPY.stats.speakingTime, preview.value.speaking, SPEAKING_WORDS_PER_MINUTE),
      value: formatDuration(stats.value.speakingTimeSeconds),
   },
])

const toSpeed = (event: Event): number => Number((event.target as HTMLInputElement).value)

async function open() {
   draft.reading = speeds.value.reading
   draft.speaking = speeds.value.speaking
   draft.useRecommended = usesDefaults.value
   announcement.value = ""
   isOpen.value = true

   // The panel is `v-if`, so nothing exists to focus until it has rendered.
   await nextTick()
   recommended.value?.focus()
}

function close() {
   isOpen.value = false
   // Focus is inside the panel that is about to disappear; without this it
   // would fall back to <body> and a keyboard user would lose their place.
   trigger.value?.focus()
}

function toggle() {
   if (isOpen.value) {
      close()

      return
   }

   void open()
}

function cancel() {
   close()
}

function save() {
   setSpeeds(preview.value)
   // Spelled out, not the compact "1m 3s" on the tiles: this string only
   // ever gets read aloud, and a voice makes "1m 3s" into "one m three s".
   announcement.value = [
      `${COPY.stats.readingTime}: ${formatDurationSpoken(stats.value.readingTimeSeconds)}`,
      `${COPY.stats.speakingTime}: ${formatDurationSpoken(stats.value.speakingTimeSeconds)}`,
   ].join(", ")
   close()
}

onMounted(sync)
</script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

.text-stats {
   &__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2xs);
   }

   &__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(#{px-to-rem(150)}, 1fr));
      gap: var(--space-2xs);
      list-style: none;
   }

   // Sits at the far end of the action row, apart from Clear and Copy: it
   // changes how the numbers are worked out, not what is in the box.
   &__settings-trigger {
      margin-inline-start: auto;
      font-size: px-to-rem(18);
      line-height: 1;
   }

   // Sunken rather than raised. It sits between the actions and the tiles,
   // so it has to read as a recess in the panel it opened inside, not as a
   // second card floating on top of one.
   &__settings {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      padding: var(--space-sm);
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      background-color: var(--surface-sunken);

      // The shared track colour *is* `--surface-sunken`, so on this block
      // the track would vanish into its own background. `--line-strong`
      // reads against the recess in both themes, where `--surface` would
      // only work in the light one. Two rules, not one selector list: an
      // unknown vendor pseudo-element invalidates the whole list.
      .slider::-webkit-slider-runnable-track {
         background-color: var(--line-strong);
      }

      .slider::-moz-range-track {
         background-color: var(--line-strong);
      }
   }

   &__settings-title {
      font-size: px-to-rem(15);
      font-weight: var(--weight-label);
      letter-spacing: 0.04em;
      color: var(--muted);
      text-transform: uppercase;
   }

   &__settings-actions {
      display: flex;
      gap: var(--space-2xs);
      justify-content: flex-end;
   }
}
</style>
