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
            class="button button--icon text-stats__settings-trigger"
            type="button"
            :aria-label="COPY.stats.settingsLabel"
            aria-haspopup="dialog"
            @click="open"
         >
            <span aria-hidden="true">⚙</span>
         </button>
      </div>

      <!-- `aria-live` on the grid means the numbers are announced as they
           change, rather than being a silent update for screen readers. -->
      <ul class="text-stats__grid" aria-live="polite">
         <li v-for="item in items" :key="item.key" class="stat">
            <span class="stat__value">{{ item.value }}</span>
            <span class="stat__label">{{ item.label }}</span>
         </li>
      </ul>

      <dialog
         ref="settings"
         class="text-stats__settings"
         :aria-labelledby="`${uid}-settings-title`"
         @click="closeOnScrim"
         @close="onClose"
      >
         <form class="text-stats__panel" method="dialog" @submit.prevent="save">
            <h2 :id="`${uid}-settings-title`" class="text-stats__panel-title">
               {{ COPY.stats.settingsHeading }}
            </h2>

            <label class="checkbox">
               <input v-model="draft.useRecommended" class="checkbox__box" type="checkbox" />
               <span class="checkbox__label">
                  {{ COPY.stats.useRecommended }}
                  ({{ READING_WORDS_PER_MINUTE }} / {{ SPEAKING_WORDS_PER_MINUTE }}
                  {{ COPY.stats.wordsPerMinute }})
               </span>
            </label>

            <div class="field" :class="{ 'field--disabled': draft.useRecommended }">
               <label class="field__label" :for="`${uid}-reading`">
                  {{ COPY.stats.readingSpeedLabel }}: {{ shownReading }} {{ COPY.stats.wordsPerMinute }}
               </label>
               <input
                  :id="`${uid}-reading`"
                  class="slider"
                  type="range"
                  :min="READING_SPEED_MIN"
                  :max="READING_SPEED_MAX"
                  :step="SPEED_STEP"
                  :value="shownReading"
                  :disabled="draft.useRecommended"
                  @input="draft.reading = toSpeed($event)"
               />
            </div>

            <div class="field" :class="{ 'field--disabled': draft.useRecommended }">
               <label class="field__label" :for="`${uid}-speaking`">
                  {{ COPY.stats.speakingSpeedLabel }}: {{ shownSpeaking }} {{ COPY.stats.wordsPerMinute }}
               </label>
               <input
                  :id="`${uid}-speaking`"
                  class="slider"
                  type="range"
                  :min="SPEAKING_SPEED_MIN"
                  :max="SPEAKING_SPEED_MAX"
                  :step="SPEED_STEP"
                  :value="shownSpeaking"
                  :disabled="draft.useRecommended"
                  @input="draft.speaking = toSpeed($event)"
               />
            </div>

            <p class="field__hint">
               {{ COPY.stats.settingsHint }}
            </p>

            <div class="text-stats__panel-actions">
               <button class="button" type="button" @click="close">
                  {{ COPY.common.cancel }}
               </button>
               <button class="button button--primary" type="submit">
                  {{ COPY.common.save }}
               </button>
            </div>
         </form>
      </dialog>
   </div>
</template>

<script lang="ts" setup>
/// The gear opens a modal <dialog> rather than an inline panel or a
/// popover. Modal is what makes Escape, the focus trap, the return of
/// focus to the gear and the inert page behind it browser behaviour — the
/// same reasoning as `SiteMenu.vue`. A popover renders in the top layer,
/// so anchoring it to the button would have needed CSS anchor positioning,
/// which is not portable yet.
///
/// It also settles an announcement problem. The stat grid below is a
/// polite live region, and while the dialog is open everything outside it
/// is inert and therefore out of the accessibility tree — so dragging a
/// slider announces nothing, and saving announces the new figures once.

const uid = useId()

const text = ref("")

const { speeds, usesDefaults, setSpeeds, sync } = useReadingSpeeds()

const stats = computed(() => analyseText(text.value, speeds.value))

/** "Reading time" normally; "Reading time (300 wpm)" once it is not 238. */
const speedLabel = (base: string, value: number, recommended: number): string =>
   value === recommended ? base : `${base} (${value} ${COPY.stats.wordsPerMinute})`

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
      label: speedLabel(COPY.stats.readingTime, speeds.value.reading, READING_WORDS_PER_MINUTE),
      value: formatDuration(stats.value.readingTimeSeconds),
   },
   {
      key: "speakingTime",
      label: speedLabel(COPY.stats.speakingTime, speeds.value.speaking, SPEAKING_WORDS_PER_MINUTE),
      value: formatDuration(stats.value.speakingTimeSeconds),
   },
])

const settings = useTemplateRef<HTMLDialogElement>("settings")

// What the sliders edit. Nothing reaches `setSpeeds` until Save, and that
// is the whole of "closing without saving reverts": Escape, a click on the
// scrim and Cancel all simply close, and the draft is thrown away and
// reseeded from the committed speeds the next time the dialog opens.
const draft = reactive({
   reading: READING_WORDS_PER_MINUTE,
   speaking: SPEAKING_WORDS_PER_MINUTE,
   useRecommended: true,
})

// While the box is ticked the sliders show the recommended figures, but
// `draft` keeps whatever was dragged to — so unticking hands the value
// back rather than making someone find it again. A disabled input fires no
// `input` event, so nothing overwrites it in the meantime.
const shownReading = computed(() =>
   draft.useRecommended ? READING_WORDS_PER_MINUTE : draft.reading,
)

const shownSpeaking = computed(() =>
   draft.useRecommended ? SPEAKING_WORDS_PER_MINUTE : draft.speaking,
)

const toSpeed = (event: Event): number => Number((event.target as HTMLInputElement).value)

function open() {
   draft.reading = speeds.value.reading
   draft.speaking = speeds.value.speaking
   draft.useRecommended = usesDefaults.value

   settings.value?.showModal()
   // A modal dialog leaves the page behind scrollable in some browsers,
   // which drags the backdrop around with it.
   document.documentElement.style.overflow = "hidden"
}

function close() {
   settings.value?.close()
}

function onClose() {
   document.documentElement.style.overflow = ""
}

function save() {
   setSpeeds({ reading: shownReading.value, speaking: shownSpeaking.value })
   close()
}

/** Clicks land on the dialog itself only outside the panel — the scrim. */
function closeOnScrim(event: MouseEvent) {
   if (event.target === settings.value) close()
}

onMounted(sync)

onBeforeUnmount(onClose)
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

   /// The dialog covers the viewport and the panel inside it is the
   /// surface, so a click anywhere outside the panel is a click on the
   /// dialog — which is what `closeOnScrim` tests for.
   &__settings {
      max-inline-size: none;
      max-block-size: none;
      inline-size: 100%;
      block-size: 100%;
      border: 0;
      background: none;

      &::backdrop {
         background-color: rgb(11 16 32 / 48%);
         backdrop-filter: blur(2px);
      }
   }

   &__panel {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      // Centres in both axes inside the full-viewport dialog.
      margin: auto;
      inline-size: min(#{px-to-rem(400)}, calc(100vw - var(--space-md)));
      padding: var(--space-md);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      background-color: var(--surface);
      box-shadow: var(--shadow-lg);
   }

   &__panel-title {
      font-size: px-to-rem(17);
   }

   &__panel-actions {
      display: flex;
      gap: var(--space-2xs);
      justify-content: flex-end;
   }
}
</style>
