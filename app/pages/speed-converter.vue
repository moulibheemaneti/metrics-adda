<template>
   <ToolShell tool-key="speedConverter" slug="speed-converter">
      <UnitConverter dimension="speed" from="kmh" to="mph" />
   </ToolShell>
</template>

<script lang="ts" setup>
useToolPage("speedConverter")
</script>
