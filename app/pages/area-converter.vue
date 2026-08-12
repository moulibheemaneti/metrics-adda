<template>
   <ToolShell tool-key="areaConverter" slug="area-converter">
      <UnitConverter dimension="area" from="m2" to="ft2" />
   </ToolShell>
</template>

<script lang="ts" setup>
useToolPage("areaConverter")
</script>
