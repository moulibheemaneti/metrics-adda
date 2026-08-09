<template>
   <button
      class="button copy-button"
      type="button"
      :disabled="value === ''"
      @click="copy"
   >
      <span aria-hidden="true">{{ state === "idle" ? "⧉" : "✓" }}</span>
      {{ buttonLabel }}
   </button>
</template>

<script lang="ts" setup>
const props = defineProps<{
   /** Text placed on the clipboard. An empty value disables the button. */
   value: string
}>()

type CopyState = "idle" | "copied" | "failed"

const state = ref<CopyState>("idle")
let resetTimer: ReturnType<typeof setTimeout> | undefined

const buttonLabel = computed(() => {
   if (state.value === "copied") return COPY.common.copied
   if (state.value === "failed") return COPY.common.copyFailed

   return COPY.common.copy
})

const settle = (next: CopyState): void => {
   state.value = next
   clearTimeout(resetTimer)
   resetTimer = setTimeout(() => {
      state.value = "idle"
   }, 2000)
}

const copy = async(): Promise<void> => {
   // The Clipboard API needs a secure context; over plain http it is
   // missing entirely, so fall back to telling the user rather than
   // throwing an unhandled rejection at them.
   if (!navigator.clipboard) {
      settle("failed")

      return
   }

   try {
      await navigator.clipboard.writeText(props.value)
      settle("copied")
   }
   catch {
      settle("failed")
   }
}

// The timer outlives the component if the user navigates away mid-flash.
onBeforeUnmount(() => clearTimeout(resetTimer))
</script>

<style scoped lang="scss">
.copy-button {
   flex: none;
}
</style>
