<template>
   <NuxtLink class="tool-card" :to="tool.path">
      <span class="tool-card__name">
         {{ copy.name }}
         <span aria-hidden="true" class="tool-card__arrow">→</span>
      </span>
      <span class="tool-card__tagline">{{ copy.tagline }}</span>
   </NuxtLink>
</template>

<script lang="ts" setup>
import type { ToolEntry } from "~/utils/tools"

const props = defineProps<{
   tool: ToolEntry
}>()

const copy = computed(() => COPY.tools[props.tool.key])
</script>
