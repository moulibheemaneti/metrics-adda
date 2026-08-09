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
      </div>

      <!-- `aria-live` on the grid means the numbers are announced as they
           change, rather than being a silent update for screen readers. -->
      <ul class="text-stats__grid" aria-live="polite">
         <li v-for="item in items" :key="item.label" class="stat">
            <span class="stat__value">{{ item.value }}</span>
            <span class="stat__label">{{ item.label }}</span>
         </li>
      </ul>
   </div>
</template>

<script lang="ts" setup>
const uid = useId()

const text = ref("")

const stats = computed(() => analyseText(text.value))

const items = computed(() => [
   { label: COPY.stats.words, value: formatCount(stats.value.words) },
   { label: COPY.stats.characters, value: formatCount(stats.value.characters) },
   { label: COPY.stats.charactersNoSpaces, value: formatCount(stats.value.charactersNoSpaces) },
   { label: COPY.stats.sentences, value: formatCount(stats.value.sentences) },
   { label: COPY.stats.paragraphs, value: formatCount(stats.value.paragraphs) },
   { label: COPY.stats.lines, value: formatCount(stats.value.lines) },
   { label: COPY.stats.readingTime, value: formatDuration(stats.value.readingTimeSeconds) },
   { label: COPY.stats.speakingTime, value: formatDuration(stats.value.speakingTimeSeconds) },
])
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
}
</style>
