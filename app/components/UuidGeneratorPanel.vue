<template>
   <div class="uuid stack stack--tight">
      <div class="card card--panel stack stack--tight">
         <div class="field">
            <label class="field__label" :for="`${uid}-output`">
               {{ COPY.uuid.outputLabel }}
            </label>
            <div class="uuid__output">
               <textarea
                  :id="`${uid}-output`"
                  class="control control--textarea control--readonly uuid__list"
                  :value="joined"
                  readonly
                  autocomplete="off"
                  spellcheck="false"
               />
            </div>
         </div>

         <div class="uuid__actions">
            <button class="button button--primary" type="button" @click="regenerate">
               {{ COPY.uuid.generate }}
            </button>
            <CopyButton :value="joined" />
         </div>

         <!-- A readonly field's value is not announced when it changes, so
              the refresh is reported here instead. The UUIDs themselves are
              left out: reading a hundred of them aloud helps nobody. -->
         <p class="visually-hidden" aria-live="polite">
            {{ announcement }}
         </p>
      </div>

      <div class="card card--panel stack stack--tight">
         <div class="field">
            <label class="field__label" :for="`${uid}-count`">
               {{ COPY.uuid.countLabel }}
            </label>
            <input
               :id="`${uid}-count`"
               v-model.number="options.count"
               class="control control--numeric"
               type="number"
               inputmode="numeric"
               :min="UUID_MIN_COUNT"
               :max="UUID_MAX_COUNT"
               step="1"
            />
            <p class="field__hint">
               {{ UUID_MIN_COUNT }}–{{ UUID_MAX_COUNT }}
            </p>
         </div>

         <fieldset class="option-group">
            <legend class="option-group__legend">
               {{ COPY.uuid.formatLegend }}
            </legend>

            <label class="checkbox">
               <input v-model="options.hyphens" class="checkbox__box" type="checkbox" />
               <span class="checkbox__label">{{ COPY.uuid.hyphens }}</span>
            </label>

            <label class="checkbox">
               <input v-model="options.uppercase" class="checkbox__box" type="checkbox" />
               <span class="checkbox__label">{{ COPY.uuid.uppercase }}</span>
            </label>

            <label class="checkbox">
               <input v-model="options.braces" class="checkbox__box" type="checkbox" />
               <span class="checkbox__label">{{ COPY.uuid.braces }}</span>
            </label>
         </fieldset>
      </div>
   </div>
</template>

<script lang="ts" setup>
import type { UuidOptions } from "~/utils/uuid"

/// Generation is client-only, and deliberately so — the same rule the
/// password generator follows. A UUID produced during server rendering
/// would be baked into the HTML, where a CDN or a cache could hand the
/// identical "unique" identifier to every visitor who loaded the page.
/// That is worse than useless for something people paste into a database
/// as a primary key.
///
/// The cost is that the output box is empty until hydration. The page
/// around it is not — heading, lede, FAQ and cross-links all render on the
/// server — so there is still something for a crawler to read.

const uid = useId()

const options = reactive<UuidOptions>({
   count: 5,
   uppercase: false,
   hyphens: true,
   braces: false,
})

const uuids = ref<string[]>([])
const announcement = ref("")

/** One per line: the form that pastes straight into a file or a query. */
const joined = computed(() => uuids.value.join("\n"))

const regenerate = (): void => {
   uuids.value = generateUuids(options)
   announcement.value = `${uuids.value.length} new identifiers generated.`
}

/**
 * Reformatting is not regeneration.
 *
 * Ticking "uppercase" should restyle the identifiers already on screen,
 * not silently swap them for different ones — someone who has just pasted
 * the first of them somewhere would find the rest no longer match. Only a
 * change of `count` needs new values, and only for the extras.
 */
watch(
   () => [options.uppercase, options.hyphens, options.braces],
   () => {
      uuids.value = uuids.value.map((value) => formatUuid(canonicalise(value), options))
   },
)

watch(
   () => options.count,
   (next) => {
      const target = clampUuidCount(next)

      if (target === uuids.value.length) return

      uuids.value = target < uuids.value.length
         ? uuids.value.slice(0, target)
         : [
            ...uuids.value,
            ...generateUuids({ ...options, count: target - uuids.value.length }),
         ]
   },
)

/** Strip the display options back off, so the value can be reformatted. */
function canonicalise(value: string): string {
   const bare = value.replace(/^\{|\}$/gu, "").toLowerCase()

   if (bare.includes("-") || bare.length !== 32) return bare

   return [
      bare.slice(0, 8),
      bare.slice(8, 12),
      bare.slice(12, 16),
      bare.slice(16, 20),
      bare.slice(20),
   ].join("-")
}

onMounted(regenerate)
</script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

.uuid {
   &__output {
      display: flex;
      gap: var(--space-2xs);
      align-items: stretch;
   }

   // Monospace and no wrapping: a UUID is compared character by character,
   // and a value split across two lines cannot be.
   &__list {
      min-block-size: px-to-rem(200);
      font-family: var(--font-mono);
      font-size: px-to-rem(14);
      white-space: pre;
      overflow-x: auto;
   }

   &__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2xs);
   }
}
</style>
