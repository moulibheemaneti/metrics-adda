<template>
   <!-- Renders nothing at all until the browser has actually offered an
        install, which is also every render on Safari and Firefox. -->
   <div v-if="canInstall" class="install-button">
      <button
         class="button install-button__action"
         type="button"
         aria-describedby="install-button-hint"
         @click="onClick"
      >
         <span aria-hidden="true">↓</span>
         {{ COPY.install.action }}
      </button>
      <span id="install-button-hint" class="install-button__hint">
         {{ COPY.install.hint }}
      </span>
   </div>
</template>

<script lang="ts" setup>
/// The site's only install affordance, rendered by `SiteFooter.vue`.
///
/// The footer rather than the header for two reasons. The topbar's
/// single-row width is measured to the pixel in `layouts/default.vue`
/// (brand + toggle + nav = 946px, hence `$single-row: 60rem`), and a fifth
/// item would push that breakpoint up for everyone — including the Safari
/// and Firefox visitors who can never install anything. And an element
/// that appears mid-session cannot shift layout down here: it takes a
/// wrapped line at the end of the last block on the page, so the document
/// grows downward into nothing. In the header it would move the nav.
///
/// Deliberately not a banner, a toast or an interstitial. App-install
/// interstitials are what Google's intrusive-interstitial treatment was
/// introduced for, and organic search is this site's whole acquisition
/// channel — that is not a trade worth making for an install.

const { canInstall, install } = useInstallPrompt()

const onClick = async(): Promise<void> => {
   await install()
}
</script>

<style scoped lang="scss">
.install-button {
   display: flex;
   flex-wrap: wrap;
   align-items: center;
   gap: var(--space-2xs) var(--space-xs);

   &__hint {
      color: var(--muted);
   }
}
</style>
