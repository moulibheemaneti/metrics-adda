<template>
   <ToolShell tool-key="timeConverter" slug="time-converter">
      <UnitConverter dimension="time" from="h" to="min" />
   </ToolShell>
</template>

<script lang="ts" setup>
useToolPage("timeConverter")
</script>
