<template>
   <div class="password stack stack--tight">
      <div class="field">
         <label class="field__label" :for="`${uid}-password`">
            {{ COPY.password.outputLabel }}
         </label>
         <div class="password__output">
            <input
               :id="`${uid}-password`"
               class="control control--numeric control--readonly"
               type="text"
               :value="password"
               readonly
               autocomplete="off"
               spellcheck="false"
            />
            <CopyButton :value="password" />
         </div>
      </div>

      <p v-if="error" class="notice">
         {{ error }}
      </p>

      <button class="button button--primary" type="button" @click="regenerate">
         {{ COPY.password.generate }}
      </button>

      <!-- The value of a readonly input is not announced when it changes,
           so the new password is surfaced through a live region instead. -->
      <p class="visually-hidden" aria-live="polite">
         {{ announcement }}
      </p>

      <div class="field">
         <label class="field__label" :for="`${uid}-length`">
            {{ COPY.password.lengthLabel }}: {{ options.length }}
         </label>
         <input
            :id="`${uid}-length`"
            v-model.number="options.length"
            class="slider"
            type="range"
            :min="PASSWORD_MIN_LENGTH"
            :max="PASSWORD_MAX_LENGTH"
            step="1"
         />
      </div>

      <fieldset class="option-group">
         <legend class="option-group__legend">
            {{ COPY.password.setsLegend }}
         </legend>

         <label v-for="set in characterSets" :key="set.key" class="checkbox">
            <input v-model="options[set.key]" class="checkbox__box" type="checkbox" />
            <span class="checkbox__label">{{ set.label }}</span>
         </label>

         <label class="checkbox">
            <input v-model="options.excludeAmbiguous" class="checkbox__box" type="checkbox" />
            <span class="checkbox__label">{{ COPY.password.excludeAmbiguous }}</span>
         </label>
      </fieldset>

      <div class="meter">
         <div class="meter__track">
            <div class="meter__fill" :style="{ inlineSize: fillWidth, backgroundColor: fillColour }" />
         </div>
         <p class="meter__label">
            <span>{{ COPY.password.strengthLabel }}: {{ strengthLabel }}</span>
            <span>{{ COPY.password.entropyLabel }}: {{ roundedBits }} {{ COPY.password.entropyUnit }}</span>
         </p>
      </div>
   </div>
</template>

<script lang="ts" setup>
import type { CharacterSetName, PasswordOptions } from "~/utils/password"

const uid = useId()

const options = reactive<PasswordOptions>({
   length: 16,
   lowercase: true,
   uppercase: true,
   digits: true,
   symbols: true,
   excludeAmbiguous: false,
})

const characterSets: { key: CharacterSetName, label: string }[] = [
   { key: "lowercase", label: COPY.password.lowercase },
   { key: "uppercase", label: COPY.password.uppercase },
   { key: "digits", label: COPY.password.digits },
   { key: "symbols", label: COPY.password.symbols },
]

const password = ref("")
const error = ref("")
const announcement = ref("")

const regenerate = (): void => {
   try {
      password.value = generatePassword(options)
      error.value = ""
      // Deliberately does not include the password: screen readers would
      // read the whole string aloud, in earshot of whoever is nearby.
      announcement.value = `New password generated at ${new Date().toLocaleTimeString()}`
   }
   catch(cause) {
      password.value = ""
      error.value = cause instanceof Error ? cause.message : COPY.password.noSets
   }
}

const entropyBits = computed(() => passwordEntropyBits(options))
const roundedBits = computed(() => Math.round(entropyBits.value))

const strengthLabel = computed(() => {
   const strength = passwordStrength(entropyBits.value)

   return COPY.password[strength]
})

/** Full bar at 128 bits — past that the difference stops being meaningful. */
const fillWidth = computed(() => `${Math.min(entropyBits.value / 128, 1) * 100}%`)

const fillColour = computed(() => {
   const strength = passwordStrength(entropyBits.value)

   if (strength === "weak") return "var(--danger)"
   if (strength === "fair") return "var(--warn)"

   return "var(--success)"
})

// Generation is client-only, and deliberately so: a password produced
// during server rendering would be baked into the HTML, where a cache or
// CDN could hand the identical "random" password to every visitor.
onMounted(regenerate)

watch(options, regenerate)
</script>

<style scoped lang="scss">
.password {
   &__output {
      display: flex;
      gap: var(--space-2xs);
      align-items: stretch;
   }
}
</style>
