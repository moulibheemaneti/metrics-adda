<template>
   <ToolShell tool-key="weightConverter" slug="weight-converter">
      <UnitConverter dimension="mass" from="kg" to="lb" />
   </ToolShell>
</template>

<script lang="ts" setup>
useToolPage("weightConverter")
</script>
