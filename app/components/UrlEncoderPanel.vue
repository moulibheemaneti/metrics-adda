<template>
   <div class="url-encoder stack stack--tight">
      <div class="card card--panel stack stack--tight">
         <fieldset class="url-encoder__directions">
            <legend class="field__label">
               {{ COPY.url.directionLabel }}
            </legend>
            <label v-for="option in DIRECTIONS" :key="option" class="url-encoder__direction">
               <input
                  v-model="direction"
                  class="url-encoder__direction-input radio-dot"
                  type="radio"
                  :name="`${uid}-direction`"
                  :value="option"
               />
               <span>{{ COPY.url.directions[option] }}</span>
            </label>
         </fieldset>

         <div class="field">
            <label class="field__label" :for="`${uid}-input`">
               {{ COPY.url.inputLabels[direction] }}
            </label>
            <textarea
               :id="`${uid}-input`"
               v-model="input"
               class="control control--textarea url-encoder__text"
               spellcheck="false"
            />
         </div>

         <!-- Encoding only. Scope is a question about which characters to
              escape, and decoding escapes nothing — it reads every escape
              it finds either way, so the control would change nothing. -->
         <fieldset v-if="direction === 'encode'" class="option-group">
            <legend class="option-group__legend">
               {{ COPY.url.scopeLegend }}
            </legend>
            <label v-for="option in URL_SCOPES" :key="option" class="url-encoder__direction">
               <input
                  v-model="scope"
                  class="url-encoder__direction-input radio-dot"
                  type="radio"
                  :name="`${uid}-scope`"
                  :value="option"
               />
               <span>{{ COPY.url.scopes[option] }}</span>
            </label>
            <p class="field__hint">
               {{ COPY.url.scopeHints[scope] }}
            </p>

            <!-- Component scope only, and not for tidiness: a space in a
                 path has to be %20, so a "+" there names a different
                 resource. An option that is wrong in one mode is worse
                 than one that is merely inert. -->
            <label v-if="scope === 'component'" class="checkbox">
               <input v-model="spaceAsPlus" class="checkbox__box" type="checkbox" />
               <span class="checkbox__label">{{ COPY.url.spaceAsPlus }}</span>
            </label>
         </fieldset>

         <fieldset v-else class="option-group">
            <legend class="option-group__legend">
               {{ COPY.url.directions.decode }}
            </legend>
            <label class="checkbox">
               <input v-model="plusAsSpace" class="checkbox__box" type="checkbox" />
               <span class="checkbox__label">{{ COPY.url.plusAsSpace }}</span>
            </label>
            <p class="field__hint">
               {{ COPY.url.decodeNote }}
            </p>
         </fieldset>

         <div class="url-encoder__actions">
            <button class="button" type="button" :disabled="input === ''" @click="input = ''">
               {{ COPY.common.clear }}
            </button>
            <button
               class="button"
               type="button"
               :disabled="output === ''"
               @click="useResult"
            >
               {{ COPY.url.useResult }}
            </button>
         </div>
      </div>

      <div class="card card--panel stack stack--tight">
         <p v-if="input === ''" class="url-encoder__note">
            {{ COPY.url.empty }}
         </p>

         <p v-else-if="fault !== null" class="url-encoder__fault">
            {{ COPY.url.faults[fault] }}
         </p>

         <template v-else>
            <div class="field">
               <label class="field__label" :for="`${uid}-output`">
                  {{ COPY.url.outputLabels[direction] }}
               </label>
               <textarea
                  :id="`${uid}-output`"
                  class="control control--textarea control--readonly url-encoder__text"
                  readonly
                  spellcheck="false"
                  :value="output"
               />
            </div>

            <div class="url-encoder__actions">
               <CopyButton :value="output" />
            </div>
         </template>
      </div>
   </div>
</template>

<script lang="ts" setup>
import type { UrlFault, UrlScope } from "~/utils/url"

/// The encoding itself is in `utils/url.ts`. This file is the direction,
/// the scope question that decides whether a URL's own punctuation
/// survives, and the two form-encoding checkboxes that are the same
/// question asked in each direction.

const DIRECTIONS = ["encode", "decode"] as const

const uid = useId()

const direction = ref<typeof DIRECTIONS[number]>("encode")
const scope = ref<UrlScope>("component")
const spaceAsPlus = ref(false)
const plusAsSpace = ref(false)

// Seeded so the page server-renders a worked example rather than an empty
// box. The sample carries an accent and an ampersand on purpose: between
// them they show the UTF-8 step and the reserved-character escaping, which
// is the whole of what this tool does.
const input = ref(COPY.url.sample)

/// One computed for both directions, because only one of them can fail:
/// any string can be percent-encoded, so `fault` is null throughout an
/// encode and the template needs no separate branch for it.
const result = computed<{ output: string, fault: UrlFault | null }>(() => {
   if (direction.value === "encode") {
      return { output: encodeUrl(input.value, scope.value, spaceAsPlus.value), fault: null }
   }

   const decoded = decodeUrl(input.value, plusAsSpace.value)

   return decoded.ok
      ? { output: decoded.text, fault: null }
      : { output: "", fault: decoded.fault }
})

const output = computed(() => result.value.output)
const fault = computed(() => result.value.fault)

/**
 * Move the result back into the input and turn around.
 *
 * The round trip is how people check their own work, and doing it by hand
 * means a copy, a direction change and a paste — in that order, or the
 * text is lost. Same affordance as the base64 panel, for the same reason.
 */
function useResult(): void {
   const next = output.value

   direction.value = direction.value === "encode" ? "decode" : "encode"
   input.value = next
}
</script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

.url-encoder {
   &__directions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2xs) var(--space-sm);
      align-items: center;
      border: 0;
   }

   &__direction {
      display: inline-flex;
      gap: var(--space-3xs);
      align-items: center;
      cursor: pointer;
   }

   // An encoded URL is one unbroken run with no spaces to wrap at, so it
   // would otherwise push the textarea into a horizontal scroll.
   &__text {
      min-block-size: px-to-rem(160);
      overflow-wrap: anywhere;
   }

   &__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2xs);
   }

   &__note {
      color: var(--muted);
   }

   &__fault {
      color: var(--danger);
      font-size: px-to-rem(15);
   }
}
</style>
