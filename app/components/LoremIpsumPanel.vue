<template>
   <div class="lorem stack stack--tight">
      <div class="card card--panel stack stack--tight">
         <fieldset class="lorem__units">
            <legend class="field__label">
               {{ COPY.lorem.unitLabel }}
            </legend>
            <label v-for="option in LOREM_UNITS" :key="option" class="lorem__unit">
               <input
                  v-model="unit"
                  class="radio-dot"
                  type="radio"
                  :name="`${uid}-unit`"
                  :value="option"
               />
               <span>{{ COPY.lorem.units[option] }}</span>
            </label>
         </fieldset>

         <div class="field">
            <label class="field__label" :for="`${uid}-count`">
               {{ COPY.lorem.countLabel }}
            </label>
            <input
               :id="`${uid}-count`"
               v-model.number="count"
               class="control control--numeric"
               type="number"
               inputmode="numeric"
               :min="limits.min"
               :max="limits.max"
               step="1"
            />
            <p class="field__hint">
               {{ limits.min }}–{{ limits.max }}
            </p>
         </div>

         <label class="checkbox">
            <input v-model="startWithLorem" class="checkbox__box" type="checkbox" />
            <span class="checkbox__label">{{ COPY.lorem.startWithLorem }}</span>
         </label>

         <div class="lorem__actions">
            <button class="button button--primary" type="button" @click="regenerate">
               {{ COPY.lorem.generate }}
            </button>
            <CopyButton :value="text" />
         </div>
      </div>

      <div class="card card--panel stack stack--tight">
         <div class="field">
            <label class="field__label" :for="`${uid}-output`">
               {{ COPY.lorem.outputLabel }}
            </label>
            <!-- Readonly rather than disabled: the text still has to be
                 selectable and scrollable for anyone copying by hand. -->
            <textarea
               :id="`${uid}-output`"
               class="control control--textarea control--readonly lorem__output"
               :value="text"
               readonly
               spellcheck="false"
            />
         </div>

         <p class="lorem__meta">
            {{ COPY.lorem.wordCount }}: {{ formatCount(words) }}
         </p>
      </div>
   </div>
</template>

<script lang="ts" setup>
import type { LoremUnit } from "~/utils/lorem"

/// Unlike the password generator, this panel renders its text during SSR.
/// That is the whole reason `generateLorem` takes a seed: the first passage
/// is generated from a fixed one, so the server and the client produce the
/// same characters and hydration is silent. A crawler gets a page with real
/// placeholder text on it rather than an empty box.
///
/// "Regenerate" only ever runs from a click, which is necessarily
/// client-side, so drawing a fresh seed there cannot desynchronise anything.

const uid = useId()

const unit = ref<LoremUnit>(DEFAULT_LOREM_UNIT)
const count = ref(LOREM_LIMITS[DEFAULT_LOREM_UNIT].initial)
const startWithLorem = ref(true)

/** Fixed for the first render — see the note above. */
const seed = ref(1)

const limits = computed(() => LOREM_LIMITS[unit.value])

// Switching unit carries the count into a different range: 50 words is a
// sensible request, 50 paragraphs is not. Each unit returns to its own
// starting count rather than keeping a number that meant something else.
watch(unit, (next) => {
   count.value = LOREM_LIMITS[next].initial
})

const text = computed(() =>
   generateLorem(
      { unit: unit.value, count: count.value, startWithLorem: startWithLorem.value },
      seed.value,
   ),
)

// `analyseText` rather than a local split, so "word" means the same thing
// here as it does in the word counter — one definition, in one module.
const words = computed(() => analyseText(text.value).words)

const regenerate = (): void => {
   // Any 32-bit integer will do — the seed selects a passage, it does not
   // protect anything, so `Math.random()` is the right tool here.
   seed.value = Math.floor(Math.random() * 0x1_0000_0000)
}
</script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

.lorem {
   &__units {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2xs) var(--space-sm);
      align-items: center;
   }

   &__unit {
      display: flex;
      gap: var(--space-3xs);
      align-items: center;
      cursor: pointer;
   }

   &__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2xs);
   }

   // Tall enough that three paragraphs are readable without scrolling, and
   // resizable for the times they are not.
   &__output {
      min-block-size: px-to-rem(280);
      font-size: px-to-rem(15);
      line-height: 1.7;
   }

   &__meta {
      color: var(--muted);
      font-size: px-to-rem(13);
   }
}
</style>
