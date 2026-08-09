<template>
   <div class="height-converter">
      <div class="field">
         <label class="field__label" :for="`${uid}-cm`">
            {{ COPY.converter.centimetresLabel }}
         </label>
         <input
            :id="`${uid}-cm`"
            v-model="centimetresText"
            class="control control--numeric"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            spellcheck="false"
            @input="fromCentimetres"
         />
      </div>

      <p class="height-converter__equals" aria-hidden="true">
         =
      </p>

      <div class="height-converter__imperial">
         <div class="field">
            <label class="field__label" :for="`${uid}-feet`">
               {{ COPY.converter.feetLabel }}
            </label>
            <input
               :id="`${uid}-feet`"
               v-model="feetText"
               class="control control--numeric"
               type="text"
               inputmode="decimal"
               autocomplete="off"
               spellcheck="false"
               @input="fromImperial"
            />
         </div>

         <div class="field">
            <label class="field__label" :for="`${uid}-inches`">
               {{ COPY.converter.inchesLabel }}
            </label>
            <input
               :id="`${uid}-inches`"
               v-model="inchesText"
               class="control control--numeric"
               type="text"
               inputmode="decimal"
               autocomplete="off"
               spellcheck="false"
               @input="fromImperial"
            />
         </div>
      </div>

      <p class="visually-hidden" aria-live="polite">
         {{ spoken }}
      </p>
   </div>
</template>

<script lang="ts" setup>
/// Height is the one length people write as two numbers — "5 ft 11 in"
/// rather than 5.9167 ft — so it gets a composite input that the generic
/// UnitConverter cannot express. The page renders the full length
/// converter alongside this for every other unit.

const uid = useId()

const centimetresText = ref("180")
const feetText = ref("")
const inchesText = ref("")

const fromCentimetres = (): void => {
   const centimetres = parseQuantity(centimetresText.value)

   if (centimetres === null) {
      feetText.value = ""
      inchesText.value = ""

      return
   }

   const metres = convert(centimetres, "cm", "m", DIMENSIONS.length)
   const { feet, inches } = toFeetInches(metres)

   feetText.value = String(feet)
   inchesText.value = formatQuantity(inches, 4)
}

const fromImperial = (): void => {
   const feet = parseQuantity(feetText.value) ?? 0
   const inches = parseQuantity(inchesText.value) ?? 0

   if (feetText.value.trim() === "" && inchesText.value.trim() === "") {
      centimetresText.value = ""

      return
   }

   const metres = fromFeetInches(feet, inches)

   centimetresText.value = formatQuantity(convert(metres, "m", "cm", DIMENSIONS.length))
}

const spoken = computed(() => {
   if (feetText.value === "") return ""

   return `${centimetresText.value} centimetres is ${feetText.value} feet ${inchesText.value} inches`
})

// Seed during setup so the server-rendered HTML already carries both
// halves of the conversion.
fromCentimetres()
</script>

<style scoped lang="scss">
.height-converter {
   display: grid;
   grid-template-columns: 1fr;
   gap: var(--space-sm);
   align-items: end;

   &__equals {
      color: var(--muted);
      font-size: 1.25rem;
      text-align: center;
   }

   &__imperial {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-sm);
   }

   @media (width >= 40rem) {
      grid-template-columns: 1fr auto 2fr;
   }
}
</style>
