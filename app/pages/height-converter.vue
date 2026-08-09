<template>
   <ToolShell tool-key="heightConverter" slug="height-converter">
      <div class="stack">
         <HeightConverter />
         <UnitConverter dimension="length" from="cm" to="ft" />
      </div>
   </ToolShell>
</template>

<script lang="ts" setup>
/// Two panels rather than one: the composite feet-and-inches input people
/// expect for a height, plus the full length converter underneath for
/// every other unit pairing.

useToolPage("heightConverter")
</script>
