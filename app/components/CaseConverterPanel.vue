<template>
   <div class="case-converter stack stack--tight">
      <div class="card card--panel stack stack--tight">
         <div class="field">
            <label class="field__label" :for="`${uid}-text`">
               {{ COPY.textCase.inputLabel }}
            </label>
            <textarea
               :id="`${uid}-text`"
               v-model="text"
               class="control control--textarea"
               :placeholder="COPY.textCase.placeholder"
            />
         </div>

         <div class="case-converter__actions">
            <button class="button" type="button" :disabled="text === ''" @click="text = ''">
               {{ COPY.common.clear }}
            </button>
            <CopyButton :value="text" />
         </div>
      </div>

      <section v-for="group in GROUPS" :key="group.heading" class="stack stack--tight">
         <h2 class="section-heading">
            {{ group.heading }}
         </h2>
         <ul class="case-list">
            <li v-for="id in group.cases" :key="id" class="case-list__item">
               <span class="case-list__label">{{ COPY.textCase.names[id] }}</span>
               <!-- <output> rather than a <p>: this is a value derived from
                    another field, which is exactly what the element is for,
                    and it is announced as a result rather than as prose. -->
               <output class="case-list__value" :for="`${uid}-text`">{{ results[id] }}</output>
               <CopyButton :value="results[id]" />
            </li>
         </ul>
      </section>
   </div>
</template>

<script lang="ts" setup>
/// The two groups are the two families in `utils/textCase.ts`: the cases
/// that leave punctuation and line breaks alone, and the ones that rebuild
/// the string from its words. Keeping that split visible is the point —
/// someone looking for snake_case is not looking for Title Case, and the
/// difference in what happens to their punctuation is not obvious until
/// they see the two lists side by side.

// Stable across server and client render, so label/input pairing survives
// hydration rather than mismatching.
const uid = useId()

const GROUPS = [
   { heading: COPY.textCase.textHeading, cases: TEXT_CASES },
   { heading: COPY.textCase.identifierHeading, cases: IDENTIFIER_CASES },
]

// Seeded rather than empty, so the page server-renders a worked example.
// An empty panel would ship ten blank rows to a crawler, and give a first
// visitor nothing to recognise.
const text = ref(COPY.textCase.sample)

const results = computed(() =>
   Object.fromEntries(CASES.map((id) => [id, convertCase(text.value, id)])) as Record<CaseId, string>,
)
</script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

.case-converter {
   &__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2xs);
   }
}

.case-list {
   display: flex;
   flex-direction: column;
   gap: var(--space-3xs);
   list-style: none;

   &__item {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: var(--space-3xs) var(--space-2xs);
      align-items: start;
      padding: var(--space-2xs) var(--space-xs);
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      background-color: var(--surface);

      // The label and the copy button sit on one row on a phone, with the
      // value spanning underneath. Widening moves the value up beside the
      // label, which is where it reads as a result rather than a caption.
      @media (width >= 40rem) {
         grid-template-columns: px-to-rem(160) 1fr auto;
         align-items: center;
      }
   }

   &__label {
      color: var(--muted);
      font-size: px-to-rem(13);
   }

   &__value {
      // Converted text is the one thing on the page a reader compares
      // character by character, so it gets the monospace face and keeps
      // whatever whitespace the transform produced.
      grid-column: 1 / -1;
      font-family: var(--font-mono);
      font-size: px-to-rem(14);
      overflow-wrap: anywhere;
      white-space: pre-wrap;

      @media (width >= 40rem) {
         grid-column: auto;
      }
   }
}
</style>
