<template>
   <aside v-if="enabled" :aria-label="COPY.ads.label" class="ad-slot">
      <span class="ad-slot__label">{{ COPY.ads.label }}</span>
      <!-- Three elements, not two, because Google's script rewrites the
           inline styles of both the <ins> and its immediate parent. The
           <aside> above is the first ancestor it leaves alone, which is why
           that is where the reserved height lives (see the stylesheet). -->
      <div class="ad-slot__box">
         <ins
            ref="unit"
            class="adsbygoogle ad-slot__unit"
            :data-ad-client="client"
            :data-ad-slot="slotId"
            data-ad-format="horizontal"
            data-full-width-responsive="false"
         />
      </div>
   </aside>
</template>

<script lang="ts" setup>
/// The site's only advertising surface: one AdSense display unit, rendered
/// by `layouts/default.vue` between the page and the footer.
///
/// Everything AdSense-related lives here — the script tag, the publisher
/// ID, the unit, and the reserved box — so there is exactly one file to
/// read when the ads misbehave and one file to delete if they ever go.

/// `window.adsbygoogle` is injected by Google's script; the push queue
/// exists before the script arrives, which is the whole point of the API.
declare global {
   interface Window {
      adsbygoogle?: Record<string, unknown>[]
   }
}

const config = useRuntimeConfig().public
const client = config.adsenseClient
const slotId = config.adsenseSlotFooter

/// Both IDs are required: a unit with no slot renders an empty grey box
/// rather than an ad, so a half-configured environment is treated as
/// unconfigured. This is `false` in dev and CI, where neither is set.
const enabled = Boolean(client && slotId)

const unit = useTemplateRef<HTMLElement>("unit")

/// Loaded from the component rather than `app.head` so the tag ships only
/// on pages that actually render a slot, and so the publisher ID has a
/// single source. `low` priority keeps it behind the stylesheet and the
/// critical theme script in nuxt.config.
if (enabled) {
   useHead({
      script: [
         {
            // A stable key, or unhead cannot match the tag it rendered
            // during SSR against this one and appends a second copy on
            // hydration — measured, not theoretical. Two loaders means two
            // auctions racing for one <ins>, which logs "already have ads
            // in it" and wastes a request on every page view.
            key: "adsense",
            src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`,
            async: true,
            crossorigin: "anonymous",
            tagPriority: "low",
         },
      ],
   })
}

/// Fills the unit. Wrapped in try/catch for the same reason the theme
/// script in nuxt.config is: an ad blocker can leave `adsbygoogle` as a
/// non-array stub whose `push` throws, and an uncaught error here would
/// take the rest of hydration down with it.
///
/// `onMounted` guarantees the <ins> is in the DOM before the push — Google
/// binds to whichever unfilled units exist at that moment, so pushing
/// during SSR or before mount silently drops the impression.
onMounted(() => {
   if (!enabled || !unit.value) return

   try {
      (window.adsbygoogle = window.adsbygoogle || []).push({})
   }
   catch {
      // Blocked or unavailable. The reserved box stays empty; nothing else
      // on the page depends on this.
   }
})
</script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

/// The width at which a leaderboard-shaped unit has room to be one.
/// Below it the slot holds a mobile banner instead.
$wide: 48rem;

/// The slot reserves its own height in the server-rendered CSS, so the
/// space exists in the first painted frame and never changes size —
/// filled, unsold and ad-blocked all measure the same.
///
/// This is the entire reason the unit is built by hand instead of using
/// Auto ads. `lighthouserc.json` fails the build outright on CLS above
/// 0.1, and one ad arriving late into an auto-height container shoves the
/// footer down by 250px, which clears that budget on its own. Measured
/// with the reservation in place: CLS 0.004.
///
/// The cost is an empty labelled box on an unfilled impression. That is
/// the right trade against a hard build gate.
.ad-slot {
   /// The creative height this slot reserves. 320x100 large mobile
   /// banner, 970x250 billboard on desktop.
   --ad-height: #{px-to-rem(100)};

   display: flex;
   flex-direction: column;
   gap: var(--space-3xs);
   inline-size: 100%;
   max-inline-size: var(--page-max);
   /// The reservation lives HERE, on the grandparent, and not on the box
   /// that wraps the <ins>.
   ///
   /// Google's script reaches one level up and stamps `height: auto
   /// !important` on the <ins>'s immediate parent whenever the slot comes
   /// back `data-ad-status="unfilled"` — that is its collapse behaviour,
   /// and `!important` beats anything a stylesheet can say. Reserving on
   /// the direct wrapper therefore does nothing at all on exactly the
   /// impressions where the reservation matters most. It does not walk up
   /// past that one level, so this element's height survives.
   ///
   /// The addend is the label's own row: its 11px text at the inherited
   /// line height, plus the 4px flex gap beneath it. Keep it in step with
   /// `&__label` below, or the reservation stops matching what renders.
   min-block-size: calc(var(--ad-height) + #{px-to-rem(17)});
   // Mirrors `.page` in layout/_page.scss so the unit lines up with the
   // content column above it rather than sitting proud of it.
   margin-inline: auto;
   padding-block-end: var(--space-lg);
   padding-inline: var(--page-gutter);

   @media (width >= $wide) {
      --ad-height: #{px-to-rem(250)};
   }

   /// Google's programme policies require ads to be distinguishable from
   /// site content. A quiet label does that, and it also stops the unit
   /// reading as our own copy to anything crawling the page.
   &__label {
      color: var(--muted);
      font-size: px-to-rem(11);
      letter-spacing: 0.08em;
      text-transform: uppercase;
   }

   /// The visible frame around the creative. Google collapses this to
   /// `height: auto` on an unfilled impression (see above), which is why
   /// it is not the element holding the space. `overflow: hidden` is the
   /// backstop for a creative taller than its declared size: it gets
   /// clipped rather than shoving the footer down the page.
   &__box {
      display: flex;
      align-items: center;
      justify-content: center;
      inline-size: 100%;
      block-size: var(--ad-height);
      border-radius: var(--radius-sm);
      background-color: var(--surface-raised);
      overflow: hidden;
   }

   /// `display: block` because the reset does not cover <ins>. Sized to
   /// fill the box; Google overwrites both once it picks a creative, which
   /// is fine now that the box above owns the layout.
   &__unit {
      display: block;
      inline-size: 100%;
      block-size: 100%;
   }
}
</style>
