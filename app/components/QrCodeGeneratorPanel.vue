<template>
   <div class="qr stack stack--tight">
      <div class="card card--panel stack stack--tight">
         <div class="field">
            <label class="field__label" :for="`${uid}-text`">
               {{ COPY.qr.inputLabel }}
            </label>
            <!-- One row, because what goes in here is nearly always a link.
                 It grows with longer text where the browser supports
                 `field-sizing`, and can be dragged taller where it does not. -->
            <textarea
               :id="`${uid}-text`"
               v-model="text"
               class="control control--textarea qr__text"
               rows="1"
               autocomplete="off"
               spellcheck="false"
            />
         </div>

         <div class="qr__actions">
            <button class="button" type="button" :disabled="text === ''" @click="text = ''">
               {{ COPY.common.clear }}
            </button>
         </div>

         <!-- <details> for the same reasons the phone menu uses one: it
              brings its own open state and keyboard handling, and it works
              before hydration. Closed by default, because M is right for
              nearly everyone and the slider is for the few who know why
              they want another level. -->
         <details class="qr__options">
            <summary class="qr__summary">
               <span class="qr__summary-label">{{ COPY.qr.optionsSummary }}</span>
               <!-- The level in force, visible while the section is shut,
                    so a code made at H after a visit to the slider does
                    not look like a default one. -->
               <span class="qr__summary-value">{{ level }}</span>
               <NavChevron class="qr__chevron" />
            </summary>

            <div class="qr__options-body stack stack--tight">
               <div class="field">
                  <label class="field__label" :for="`${uid}-level`">
                     {{ COPY.qr.levelLabel }}: {{ levelText }}
                  </label>
                  <input
                     :id="`${uid}-level`"
                     v-model.number="levelIndex"
                     class="slider"
                     type="range"
                     min="0"
                     :max="QR_LEVELS.length - 1"
                     step="1"
                     :aria-valuetext="levelText"
                     :aria-describedby="`${uid}-level-hint`"
                  />
                  <!-- Hidden from assistive technology: the slider's own
                       value text already names the level, and four bare
                       letters read after it would only repeat it. -->
                  <div class="qr__ticks" aria-hidden="true">
                     <span
                        v-for="option in QR_LEVELS"
                        :key="option"
                        class="qr__tick"
                        :class="{ 'qr__tick--current': option === level }"
                     >
                        {{ option }}
                     </span>
                  </div>
                  <p :id="`${uid}-level-hint`" class="field__hint">
                     {{ COPY.qr.levelHints[level] }}
                  </p>
               </div>

               <p class="field__hint">
                  {{ COPY.qr.levelNote }}
               </p>
            </div>
         </details>

         <details class="qr__options">
            <summary class="qr__summary">
               <span class="qr__summary-label">{{ COPY.qr.logo.summary }}</span>
               <span v-if="logo" class="qr__summary-value">{{ COPY.qr.logo.on }}</span>
               <NavChevron class="qr__chevron" />
            </summary>

            <div class="qr__options-body stack stack--tight">
               <div v-if="logo" class="qr__logo">
                  <!-- Decorative: the file name beside it says which image
                       this is, and the code below shows it in place. -->
                  <img class="qr__thumb" :src="logo.href" alt="" width="40" height="40" />
                  <span class="qr__logo-name">{{ logo.name }}</span>
               </div>

               <div class="qr__actions">
                  <!-- A label styled as a button, wrapping a visually hidden
                       file input. The native control's look cannot be
                       styled, and hiding it this way rather than with
                       `display: none` keeps it in the tab order. -->
                  <label class="button qr__file">
                     <input
                        class="visually-hidden"
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                        :aria-describedby="`${uid}-logo-hint`"
                        @change="onFile"
                     />
                     {{ logo ? COPY.qr.logo.replace : COPY.qr.logo.choose }}
                  </label>
                  <button v-if="logo" class="button" type="button" @click="removeLogo">
                     {{ COPY.qr.logo.remove }}
                  </button>
               </div>

               <p v-if="logoFault" class="qr__logo-fault" aria-live="polite">
                  {{ COPY.qr.logo.faults[logoFault] }}
               </p>

               <p :id="`${uid}-logo-hint`" class="field__hint">
                  {{ COPY.qr.logo.hint }}
               </p>

               <div v-if="logo" class="field" :class="{ 'field--disabled': logoCap === 0 }">
                  <label class="field__label" :for="`${uid}-logo-size`">
                     {{ COPY.qr.logo.sizeLabel }}: {{ logoSizeText }}
                  </label>
                  <!-- Bound to the size in force, not the size asked for:
                       lowering the level shrinks the logo and the thumb
                       moves with it, and raising it again gives the
                       earlier size back. -->
                  <input
                     :id="`${uid}-logo-size`"
                     class="slider"
                     type="range"
                     :min="QR_LOGO_MIN"
                     :max="Math.max(logoCap, QR_LOGO_MIN)"
                     step="1"
                     :value="logoPercent"
                     :disabled="logoCap === 0"
                     :aria-valuetext="logoSizeText"
                     @input="logoRequest = Number(($event.target as HTMLInputElement).value)"
                  />
                  <p class="field__hint">
                     {{ COPY.qr.logo.levelNote }}
                  </p>
               </div>
            </div>
         </details>
      </div>

      <p v-if="text === ''" class="card card--panel qr__note">
         {{ COPY.qr.empty }}
      </p>

      <!-- Announced: it replaces the code someone was looking at, and the
           fix it suggests is a control they may not have opened yet. -->
      <p v-else-if="!result.ok" class="card card--panel qr__fault" aria-live="polite">
         {{ faultMessage }}
      </p>

      <div v-else class="card card--panel qr__result">
         <div class="qr__tile">
            <!-- Black on white in both themes. An inverted code — light on
                 dark — is the one thing a fair number of scanners still
                 cannot read, so the code does not follow the page into dark
                 mode. The quiet zone is part of the drawing rather than
                 padding around it, so the downloads carry it too. -->
            <svg
               class="qr__code"
               role="img"
               :aria-label="COPY.qr.previewLabel"
               :viewBox="`0 0 ${extent} ${extent}`"
               shape-rendering="crispEdges"
            >
               <rect :width="extent" :height="extent" fill="#ffffff" />
               <path :d="path" fill="#000000" />
               <image
                  v-if="logo && logoBox"
                  :href="logo.href"
                  :x="logoBox.x"
                  :y="logoBox.y"
                  :width="logoBox.width"
                  :height="logoBox.height"
                  preserveAspectRatio="xMidYMid meet"
               />
            </svg>
         </div>

         <!-- Under the code rather than in either section: the level that
              causes it is set in one, the logo in the other, and both may
              be shut. -->
         <p v-if="logoNote" class="qr__logo-note" aria-live="polite">
            {{ logoNote }}
         </p>

         <div class="qr__actions qr__actions--centred">
            <button class="button button--primary" type="button" @click="downloadPng">
               {{ COPY.qr.downloadPng }}
            </button>
            <button class="button" type="button" @click="downloadSvg">
               {{ COPY.qr.downloadSvg }}
            </button>
         </div>
      </div>
   </div>
</template>

<script lang="ts" setup>
/// SSR is the easy case here, the same one the hash generator has: a QR
/// code is a pure function of its text and level, so the sample's code is
/// computed during render and a crawler gets a real one rather than an
/// empty box. Unlike a hash it is also synchronous, so a `computed` holds
/// it and no `await` is needed.
///
/// The logo and the downloads are the parts that need a browser, and both
/// only run when someone acts, long after hydration.

const uid = useId()

const text = ref(COPY.qr.sample)

/** The slider's position. The level is derived from it, never stored twice. */
const levelIndex = ref(QR_LEVELS.indexOf(QR_DEFAULT_LEVEL))

const level = computed(() => qrLevelAt(levelIndex.value))

const levelText = computed(() =>
   COPY.qr.levelValue
      .replace("{level}", level.value)
      .replace("{name}", COPY.qr.levels[level.value])
      .replace("{percent}", String(QR_RECOVERY[level.value])),
)

const result = computed(() => encodeQr(text.value, level.value))

/** The successful matrix, or null — what every drawing and download reads. */
const matrix = computed(() => (result.value.ok ? result.value.matrix : null))

const extent = computed(() => (matrix.value === null ? 0 : qrExtent(matrix.value)))

const faultMessage = computed(() => {
   if (result.value.ok) return ""

   if (result.value.fault === "loneSurrogate") return COPY.qr.faults.loneSurrogate

   return COPY.qr.faults.tooLong
      .replace("{level}", level.value)
      .replace("{bytes}", qrByteLength(text.value).toLocaleString("en"))
      .replace("{limit}", QR_BYTE_CAPACITY[level.value].toLocaleString("en"))
})

// ---- Logo -----------------------------------------------------------

const { logo, fault: logoFault, load: loadLogo, remove: forgetLogo } = useQrLogo()

/** The size someone asked for. What is drawn is this, capped by the level. */
const logoRequest = ref(QR_LOGO_DEFAULT)

const logoCap = computed(() => QR_LOGO_MAX[level.value])
const logoPercent = computed(() => Math.min(logoRequest.value, logoCap.value))

const logoSizeText = computed(() =>
   COPY.qr.logo.sizeValue.replace("{percent}", String(logoPercent.value)),
)

/**
 * The cleared rectangle, or null when there is no logo or the level allows
 * none. Shaped to the logo, so a wordmark gets a wide space rather than
 * being shrunk into a square.
 */
const hole = computed(() =>
   matrix.value === null || logo.value === null || logoCap.value === 0
      ? null
      : qrLogoHole(matrix.value, logoPercent.value, logo.value.width / logo.value.height, logoCap.value),
)

const logoBox = computed(() => (hole.value === null ? null : qrLogoBox(hole.value)))

const path = computed(() => (matrix.value === null ? "" : qrPath(matrix.value, hole.value)))

const logoNote = computed(() => {
   if (logo.value === null) return ""

   if (logoCap.value === 0) return COPY.qr.logo.hidden.replace("{level}", level.value)

   if (logoRequest.value > logoCap.value) {
      return COPY.qr.logo.shrunk
         .replace("{level}", level.value)
         .replace("{max}", String(logoCap.value))
   }

   return ""
})

/**
 * The level from before a logo raised it, so removing the logo can put it
 * back. Only restored if the level is still the one the logo set: someone
 * who moved the slider themselves since meant it.
 */
let levelBeforeLogo: number | null = null

const onFile = async(event: Event): Promise<void> => {
   const input = event.target as HTMLInputElement
   const file = input.files?.[0]

   // Cleared at once, so choosing the same file again — after removing
   // it, say — still fires `change`. The File itself stays readable.
   input.value = ""

   if (file === undefined) return

   const hadLogo = logo.value !== null

   if (!(await loadLogo(file))) return

   if (!hadLogo) levelBeforeLogo = levelIndex.value

   levelIndex.value = QR_LEVELS.indexOf(QR_LOGO_LEVEL)
}

const removeLogo = (): void => {
   forgetLogo()

   if (levelBeforeLogo !== null && level.value === QR_LOGO_LEVEL) levelIndex.value = levelBeforeLogo

   levelBeforeLogo = null
}

// ---- Downloads ------------------------------------------------------

/**
 * Hand a blob to the browser as a download.
 *
 * The object URL is revoked on a delay rather than straight after the
 * click: some browsers start reading it asynchronously, and revoking it
 * first leaves a failed download. Forty seconds is FileSaver.js's figure,
 * and an unrevoked URL costs no more than the few kilobytes it points at.
 */
function save(blob: Blob, extension: string): void {
   const url = URL.createObjectURL(blob)
   const link = document.createElement("a")

   link.href = url
   link.download = `${COPY.qr.filename}.${extension}`
   link.click()

   setTimeout(() => URL.revokeObjectURL(url), 40_000)
}

const downloadSvg = (): void => {
   if (matrix.value === null) return

   const embedded = logo.value !== null && hole.value !== null
      ? { hole: hole.value, href: logo.value.href }
      : null

   save(new Blob([qrSvg(matrix.value, embedded)], { type: "image/svg+xml" }), "svg")
}

/**
 * Draw the same path the preview uses onto a canvas, at a whole number of
 * pixels per module, and save that.
 *
 * Drawn from the matrix rather than by rasterising the SVG through an
 * <img>: some browsers taint the canvas or resample the image on the way
 * through, which blurs exactly the edges a scanner needs to be sharp.
 *
 * Everything it reads is captured before the one `await`, so a keystroke
 * while the logo decodes cannot pair one code with another's logo.
 */
const downloadPng = async(): Promise<void> => {
   if (matrix.value === null) return

   const scale = qrPngScale(matrix.value)
   const side = extent.value * scale
   const modules = path.value
   const box = logoBox.value
   const image = logo.value
   const canvas = document.createElement("canvas")

   canvas.width = side
   canvas.height = side

   const context = canvas.getContext("2d")

   if (context === null) return

   context.fillStyle = "#ffffff"
   context.fillRect(0, 0, side, side)
   context.scale(scale, scale)
   context.fillStyle = "#000000"
   context.fill(new Path2D(modules))

   if (image !== null && box !== null) {
      const element = new Image()

      element.src = image.href
      await element.decode()

      const fitted = qrFitLogo(box, image.width, image.height)

      context.imageSmoothingQuality = "high"
      context.drawImage(element, fitted.x, fitted.y, fitted.width, fitted.height)
   }

   canvas.toBlob((blob) => {
      if (blob !== null) save(blob, "png")
   }, "image/png")
}
</script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

.qr {
   // One row to start, overriding the 240px every other textarea on the
   // site gets: those hold paragraphs, this nearly always holds a link.
   // `field-sizing` grows it with the text where supported; the cap keeps
   // a pasted essay from pushing the code off the screen.
   &__text {
      field-sizing: content;
      inline-size: 100%;
      min-block-size: 0;
      max-block-size: px-to-rem(200);
      overflow-wrap: anywhere;
   }

   &__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2xs);

      &--centred {
         justify-content: center;
      }
   }

   &__options {
      border-block-start: 1px solid var(--line);
      padding-block-start: var(--space-2xs);
   }

   /// The row that opens a section. `list-style: none` and the webkit
   /// marker rule remove the default triangle, the same pair the phone
   /// menu uses, so the chevron is the only mark and it turns the same way
   /// everywhere on the site.
   &__summary {
      display: flex;
      gap: var(--space-2xs);
      align-items: center;
      padding: var(--space-3xs) 0;
      border-radius: var(--radius-sm);
      color: var(--ink-soft);
      font-size: px-to-rem(14);
      font-weight: var(--weight-label);
      cursor: pointer;
      list-style: none;

      &::-webkit-details-marker {
         display: none;
      }

      &:hover {
         color: var(--ink);
      }

      &:focus-visible {
         outline: 2px solid var(--accent);
         outline-offset: 2px;
      }
   }

   &__summary-label {
      flex: 1;
   }

   &__summary-value {
      padding: 0 var(--space-2xs);
      border-radius: var(--radius-pill);
      background-color: var(--accent-soft);
      color: var(--accent-strong);
      font-family: var(--font-mono);
      font-size: px-to-rem(13);
   }

   &__chevron {
      color: var(--muted);

      .qr__options[open] & {
         rotate: 180deg;
      }
   }

   &__options-body {
      padding-block-start: var(--space-xs);
   }

   /// One letter under each stop. The thumb is 20px wide and travels the
   /// track's full width minus that, so each stop sits half a thumb in
   /// from either end — the padding is what lines the letters up with it.
   &__ticks {
      display: flex;
      justify-content: space-between;
      padding-inline: px-to-rem(4);
      color: var(--muted);
      font-family: var(--font-mono);
      font-size: px-to-rem(13);
   }

   &__tick {
      inline-size: px-to-rem(12);
      text-align: center;

      &--current {
         color: var(--accent-strong);
         font-weight: var(--weight-label);
      }
   }

   &__logo {
      display: flex;
      gap: var(--space-2xs);
      align-items: center;
      min-inline-size: 0;
   }

   // On white, like the code it is going into, so a dark logo with a
   // transparent background does not vanish against the dark theme.
   &__thumb {
      flex: none;
      inline-size: px-to-rem(40);
      block-size: px-to-rem(40);
      padding: px-to-rem(4);
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      background-color: #ffffff;
      object-fit: contain;
   }

   &__logo-name {
      overflow: hidden;
      color: var(--ink-soft);
      font-size: px-to-rem(14);
      text-overflow: ellipsis;
      white-space: nowrap;
   }

   // The input inside is visually hidden, so its focus ring is drawn on
   // the label that stands in for it.
   &__file {
      cursor: pointer;

      &:focus-within {
         outline: 2px solid var(--accent);
         outline-offset: 2px;
      }
   }

   &__logo-fault {
      color: var(--danger);
      font-size: px-to-rem(14);
   }

   &__logo-note {
      max-inline-size: px-to-rem(420);
      color: var(--warn);
      font-size: px-to-rem(14);
      text-align: center;
   }

   &__note {
      color: var(--muted);
   }

   &__fault {
      color: var(--danger);
      font-size: px-to-rem(15);
   }

   &__result {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      align-items: center;
   }

   // Sized for a phone held up to another screen: big enough that the
   // camera does not have to come close, small enough to leave the
   // download buttons on screen beneath it.
   &__tile {
      overflow: hidden;
      inline-size: min(100%, #{px-to-rem(280)});
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
   }

   &__code {
      display: block;
      inline-size: 100%;
      block-size: auto;
      aspect-ratio: 1;
   }
}
</style>
