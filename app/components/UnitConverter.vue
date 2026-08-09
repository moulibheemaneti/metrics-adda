<template>
   <div class="converter stack stack--tight">
      <div class="card card--panel converter__panel">
         <div class="converter__row">
         <div class="field converter__value">
            <label class="field__label" :for="`${uid}-from-value`">
               {{ COPY.converter.valueLabel }}
            </label>
            <input
               :id="`${uid}-from-value`"
               v-model="fromText"
               class="control control--numeric"
               type="text"
               inputmode="decimal"
               autocomplete="off"
               spellcheck="false"
               @input="convertForwards"
            />
         </div>

         <div class="field converter__unit">
            <label class="field__label" :for="`${uid}-from-unit`">
               {{ COPY.converter.fromLabel }}
            </label>
            <select :id="`${uid}-from-unit`" v-model="fromUnit" class="control control--select">
               <option v-for="unit in activeDimension.units" :key="unit.id" :value="unit.id">
                  {{ unitLabel(unit.id) }}
               </option>
            </select>
         </div>

         <button
            class="button button--icon converter__swap"
            type="button"
            :aria-label="COPY.common.swap"
            :title="COPY.common.swap"
            @click="swap"
         >
            <span aria-hidden="true">⇅</span>
         </button>

         <div class="field converter__value">
            <label class="field__label" :for="`${uid}-to-value`">
               {{ COPY.converter.resultLabel }}
            </label>
            <input
               :id="`${uid}-to-value`"
               v-model="toText"
               class="control control--numeric"
               type="text"
               inputmode="decimal"
               autocomplete="off"
               spellcheck="false"
               @input="convertBackwards"
            />
         </div>

         <div class="field converter__unit">
            <label class="field__label" :for="`${uid}-to-unit`">
               {{ COPY.converter.toLabel }}
            </label>
            <select :id="`${uid}-to-unit`" v-model="toUnit" class="control control--select">
               <option v-for="unit in activeDimension.units" :key="unit.id" :value="unit.id">
                  {{ unitLabel(unit.id) }}
               </option>
            </select>
         </div>
         </div>

         <p v-if="invalid" class="field__error converter__error">
            {{ COPY.converter.invalid }}
         </p>

         <!-- Announced on change, so the conversion is not silent for anyone
              who cannot see the second field update. -->
         <p class="visually-hidden" aria-live="polite">
            {{ spokenResult }}
         </p>
      </div>

      <section class="stack stack--tight">
         <h2 class="section-heading">
            {{ COPY.converter.allUnitsHeading }}
         </h2>
         <div class="data-table">
            <table class="data-table__table">
               <thead>
                  <tr>
                     <th class="data-table__cell data-table__head" scope="col">
                        {{ COPY.converter.unitColumn }}
                     </th>
                     <th class="data-table__cell data-table__head data-table__cell--value" scope="col">
                        {{ COPY.converter.valueColumn }}
                     </th>
                  </tr>
               </thead>
               <tbody>
                  <tr
                     v-for="unit in activeDimension.units"
                     :key="unit.id"
                     class="data-table__row"
                     :class="{ 'data-table__row--active': unit.id === toUnit }"
                  >
                     <th class="data-table__cell" scope="row">
                        {{ COPY.units[dimension][unit.id]?.name }}
                        <span class="data-table__unit">({{ COPY.units[dimension][unit.id]?.symbol }})</span>
                     </th>
                     <td class="data-table__cell data-table__cell--value">
                        {{ allUnits[unit.id] ?? "—" }}
                     </td>
                  </tr>
               </tbody>
            </table>
         </div>
      </section>
   </div>
</template>

<script lang="ts" setup>
import type { Ref } from "vue"
import type { DimensionId } from "~/utils/units"

const props = defineProps<{
   /** Which set of units this instance converts between. */
   dimension: DimensionId
   /** Unit id selected on the left at first paint. */
   from: string
   /** Unit id selected on the right at first paint. */
   to: string
}>()

const activeDimension = computed(() => DIMENSIONS[props.dimension])

// Stable across server and client render, so label/input pairing survives
// hydration rather than mismatching.
const uid = useId()

const fromUnit = ref(props.from)
const toUnit = ref(props.to)
const fromText = ref("1")
const toText = ref("")

const unitLabel = (id: string): string => {
   const unit = COPY.units[props.dimension][id]

   return unit ? `${unit.name} (${unit.symbol})` : id
}

/**
 * True only when a field holds text that is not a number — not when it is
 * merely empty, so clearing the box to type a new value does not throw an
 * error message at the user mid-keystroke.
 */
const invalid = computed(() =>
   [fromText.value, toText.value].some(
      (text) => text.trim() !== "" && parseQuantity(text) === null,
   ),
)

/** Recompute one field from the other. Only ever writes the field not being typed in. */
const project = (source: Ref<string>, target: Ref<string>, from: string, to: string): void => {
   const value = parseQuantity(source.value)

   if (value === null) {
      target.value = ""

      return
   }

   target.value = formatQuantity(convert(value, from, to, activeDimension.value))
}

const convertForwards = (): void => {
   project(fromText, toText, fromUnit.value, toUnit.value)
}

const convertBackwards = (): void => {
   project(toText, fromText, toUnit.value, fromUnit.value)
}

const swap = (): void => {
   const previousUnit = fromUnit.value
   const previousText = fromText.value

   fromUnit.value = toUnit.value
   toUnit.value = previousUnit

   // Carry the numbers across with the units, so swapping twice returns
   // exactly where it started instead of re-deriving and drifting.
   fromText.value = toText.value
   toText.value = previousText
}

/** Every unit at once, formatted, for the reference table. */
const allUnits = computed<Record<string, string>>(() => {
   const value = parseQuantity(fromText.value)

   if (value === null) return {}

   const formatted: Record<string, string> = {}

   for (const [id, result] of Object.entries(convertToAll(value, fromUnit.value, activeDimension.value))) {
      formatted[id] = formatQuantity(result)
   }

   return formatted
})

const spokenResult = computed(() => {
   if (toText.value === "") return ""

   return `${toText.value} ${COPY.units[props.dimension][toUnit.value]?.name ?? ""}`
})

// Changing either unit re-derives the result from the value the user
// typed, which stays the source of truth.
watch([fromUnit, toUnit], convertForwards)

// Seed the first result during setup so it is already present in the
// server-rendered HTML and nothing shifts on hydration.
convertForwards()
</script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

.converter {
   &__row {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-sm);
      align-items: end;
   }

   &__error {
      margin-block-start: var(--space-sm);
   }

   // Round rather than square, and set on the accent: it is the one
   // control between the two halves of the conversion, so it reads as the
   // hinge of the panel rather than as another button in a row.
   &__swap {
      justify-self: start;
      inline-size: px-to-rem(44);
      border-color: var(--accent-soft);
      border-radius: 50%;
      color: var(--accent);
      font-size: px-to-rem(18);

      &:hover {
         border-color: var(--accent);
         transform: translateY(-1px) rotate(180deg);
      }
   }

   @media (width >= 48rem) {
      &__row {
         // value · unit · swap · value · unit
         grid-template-columns: 1fr 1fr auto 1fr 1fr;
      }

      &__swap {
         // Nudged up so it centres against the inputs rather than their
         // labels, which only the outer columns have.
         align-self: end;
         justify-self: center;
         margin-block-end: px-to-rem(2);
      }
   }
}
</style>
