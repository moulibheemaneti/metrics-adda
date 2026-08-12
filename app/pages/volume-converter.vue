<template>
   <ToolShell tool-key="volumeConverter" slug="volume-converter">
      <UnitConverter dimension="volume" from="l" to="us-gal" />
   </ToolShell>
</template>

<script lang="ts" setup>
useToolPage("volumeConverter")
</script>
