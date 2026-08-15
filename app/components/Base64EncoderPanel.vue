<template>
   <div class="base64 stack stack--tight">
      <div class="card card--panel stack stack--tight">
         <fieldset class="base64__directions">
            <legend class="field__label">
               {{ COPY.base64.directionLabel }}
            </legend>
            <label v-for="option in DIRECTIONS" :key="option" class="base64__direction">
               <input
                  v-model="direction"
                  class="base64__direction-input radio-dot"
                  type="radio"
                  :name="`${uid}-direction`"
                  :value="option"
               />
               <span>{{ COPY.base64.directions[option] }}</span>
            </label>
         </fieldset>

         <div class="field">
            <label class="field__label" :for="`${uid}-input`">
               {{ COPY.base64.inputLabels[direction] }}
            </label>
            <textarea
               :id="`${uid}-input`"
               v-model="input"
               class="control control--textarea base64__text"
               spellcheck="false"
            />
         </div>

         <!-- Encoding only. Both of these are choices about how the base64
              is *written*, and decoding reads either alphabet with or
              without padding — so on that side they would be controls that
              change nothing, which reads as a bug rather than as tolerance. -->
         <fieldset v-if="direction === 'encode'" class="option-group">
            <legend class="option-group__legend">
               {{ COPY.base64.alphabetLegend }}
            </legend>
            <label v-for="option in BASE64_ALPHABETS" :key="option" class="base64__direction">
               <input
                  v-model="alphabet"
                  class="base64__direction-input radio-dot"
                  type="radio"
                  :name="`${uid}-alphabet`"
                  :value="option"
               />
               <span>{{ COPY.base64.alphabets[option] }}</span>
            </label>
            <label class="checkbox">
               <input v-model="padded" class="checkbox__box" type="checkbox" />
               <span class="checkbox__label">{{ COPY.base64.padding }}</span>
            </label>
         </fieldset>
         <p v-else class="field__hint">
            {{ COPY.base64.optionsNote }}
         </p>

         <div class="base64__actions">
            <button class="button" type="button" :disabled="input === ''" @click="input = ''">
               {{ COPY.common.clear }}
            </button>
            <button
               class="button"
               type="button"
               :disabled="output === ''"
               @click="useResult"
            >
               {{ COPY.base64.useResult }}
            </button>
         </div>
      </div>

      <div class="card card--panel stack stack--tight">
         <p v-if="input.trim() === ''" class="base64__note">
            {{ COPY.base64.empty }}
         </p>

         <p v-else-if="fault !== null" class="base64__fault">
            {{ COPY.base64.faults[fault] }}
         </p>

         <template v-else>
            <div class="field">
               <label class="field__label" :for="`${uid}-output`">
                  {{ COPY.base64.outputLabels[direction] }}
               </label>
               <textarea
                  :id="`${uid}-output`"
                  class="control control--textarea control--readonly base64__text"
                  readonly
                  spellcheck="false"
                  :value="output"
               />
            </div>

            <div class="base64__actions">
               <CopyButton :value="output" />
            </div>
         </template>
      </div>
   </div>
</template>

<script lang="ts" setup>
import type { Base64Fault } from "~/utils/base64"

/// The encoding itself is in `utils/base64.ts`, including the UTF-8 step
/// that a bare `btoa` skips. This file is the direction, the two writing
/// options, and the difference between "that is not base64" and "that is
/// base64, but it is not text".

const DIRECTIONS = ["encode", "decode"] as const

const uid = useId()

const direction = ref<typeof DIRECTIONS[number]>("encode")
const alphabet = ref<Base64Alphabet>("standard")
const padded = ref(true)

// Seeded so the page server-renders a worked example rather than an empty
// box, matching the converters and the case converter. Both directions of
// this run in the server's JavaScript as readily as the browser's, so
// there is nothing to defer to `onMounted` here.
const input = ref("Metrics Adda")

/// One computed for both directions, because the failure only exists on
/// one of them: encoding any string always succeeds, so `fault` is null
/// throughout an encode and the template needs no separate branch.
const result = computed<{ output: string, fault: Base64Fault | null }>(() => {
   if (direction.value === "encode") {
      return { output: encodeBase64(input.value, alphabet.value, padded.value), fault: null }
   }

   const decoded = decodeBase64(input.value)

   return decoded.ok
      ? { output: decoded.text, fault: null }
      : { output: "", fault: decoded.fault }
})

const output = computed(() => result.value.output)
const fault = computed(() => result.value.fault)

/**
 * Move the result back into the input and turn around.
 *
 * The round trip is how people check their own work — encode something,
 * then decode it and confirm they get it back. Doing that by hand means a
 * copy, a direction change and a paste, in that order, and getting the
 * order wrong loses the text.
 */
function useResult(): void {
   const next = output.value

   direction.value = direction.value === "encode" ? "decode" : "encode"
   input.value = next
}
</script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

.base64 {
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

   // Base64 is an unbroken run of characters with no spaces to wrap at, so
   // it would otherwise push the textarea into a horizontal scroll on one
   // very long line.
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
