<template>
   <ToolShell tool-key="temperatureConverter" slug="temperature-converter">
      <UnitConverter dimension="temperature" from="c" to="f" />
   </ToolShell>
</template>

<script lang="ts" setup>
useToolPage("temperatureConverter")
</script>
