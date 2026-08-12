<template>
   <ToolShell tool-key="dataStorageConverter" slug="data-storage-converter">
      <UnitConverter dimension="data" from="gb" to="gib" />
   </ToolShell>
</template>

<script lang="ts" setup>
useToolPage("dataStorageConverter")
</script>
