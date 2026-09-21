<template>
   <div class="hash stack stack--tight">
      <div class="card card--panel stack stack--tight">
         <div class="field">
            <label class="field__label" :for="`${uid}-text`">
               {{ COPY.hash.inputLabel }}
            </label>
            <textarea
               :id="`${uid}-text`"
               v-model="text"
               class="control control--textarea hash__text"
               spellcheck="false"
            />
         </div>

         <fieldset class="hash__formats">
            <legend class="field__label">
               {{ COPY.hash.formatLegend }}
            </legend>
            <label v-for="option in HASH_FORMATS" :key="option" class="hash__format">
               <input
                  v-model="format"
                  class="hash__format-input radio-dot"
                  type="radio"
                  :name="`${uid}-format`"
                  :value="option"
               />
               <span>{{ COPY.hash.formats[option] }}</span>
            </label>
         </fieldset>

         <div class="hash__actions">
            <button class="button" type="button" :disabled="text === ''" @click="text = ''">
               {{ COPY.common.clear }}
            </button>
         </div>
      </div>

      <p v-if="text === ''" class="card card--panel hash__note">
         {{ COPY.hash.empty }}
      </p>

      <p v-else-if="digests === null" class="card card--panel hash__fault">
         {{ COPY.hash.unavailable }}
      </p>

      <template v-else>
         <ul class="hash-list">
            <li
               v-for="row in rows"
               :key="row.algorithm"
               class="hash-list__item"
               :class="{ 'hash-list__item--match': row.algorithm === match }"
            >
               <span class="hash-list__label">
                  {{ row.name }}
                  <span class="hash-list__bits">{{ row.bits }}</span>
                  <!-- Listing SHA-1 without this would be the page quietly
                       recommending it. It is here because Git object ids
                       and a lot of older systems still use it, which is a
                       reason to compute it and not a reason to trust it. -->
                  <span v-if="row.weak" class="hash-list__weak">{{ COPY.hash.weak }}</span>
               </span>
               <output class="hash-list__value" :for="`${uid}-text`">{{ row.value }}</output>
               <CopyButton :value="row.value" />
            </li>
         </ul>

         <div class="card card--panel stack stack--tight">
            <div class="field">
               <label class="field__label" :for="`${uid}-expected`">
                  {{ COPY.hash.compareLabel }}
               </label>
               <input
                  :id="`${uid}-expected`"
                  v-model="expected"
                  class="control hash__expected"
                  type="text"
                  autocomplete="off"
                  spellcheck="false"
                  :placeholder="COPY.hash.comparePlaceholder"
               />
               <p class="field__hint">
                  {{ COPY.hash.compareHint }}
               </p>
            </div>

            <!-- Announced rather than merely shown: the verdict is the
                 answer someone came for, and it appears beneath a field
                 they are still looking at. -->
            <p
               v-if="verdict !== ''"
               class="hash__verdict"
               :class="{ 'hash__verdict--match': match !== null }"
               aria-live="polite"
            >
               {{ verdict }}
            </p>
         </div>
      </template>
   </div>
</template>

<script lang="ts" setup>
import type { HashFormat } from "~/utils/hash"

/// SSR is a fourth question here, and the answer is not one of the three
/// already in this repo.
///
/// Lorem ipsum seeds a generator so the server and the client agree; UUIDs
/// are generated after mount so no two visitors share one; the age
/// calculator ships a fixed example and replaces it on mount. A digest is
/// none of those: it is perfectly deterministic — the same text always
/// hashes the same, so a cached page is correct forever — and it is
/// *asynchronous*, which no `computed` can hold. So the seeded example is
/// awaited during render. Nuxt wraps pages in `<Suspense>`, so an async
/// setup resolves before the HTML is written, and a crawler gets four real
/// digests rather than four empty rows.
///
/// The one case where server and client disagree is a page served over
/// plain http, where `crypto.subtle` is withheld from the browser but not
/// from Node. The client then renders the unavailable message over
/// server HTML that had digests in it. That is the correct end state, it
/// cannot happen on the live site, and the alternative — withholding the
/// digests from everyone — costs the SSR content this tool exists to have.

const uid = useId()

const text = ref(COPY.hash.sample)
const format = ref<HashFormat>("hex")
const expected = ref("")

// Null means WebCrypto is unavailable, and only that: the empty string has
// four perfectly good digests, so an empty box is a template branch rather
// than a null here.
const digests = ref(await digestAll(text.value))

/**
 * Digesting is asynchronous, so results can land out of order.
 *
 * Four `subtle.digest` calls on a short string settle in the same tick and
 * this never bites; paste a megabyte, then immediately paste something
 * short, and the slow result can arrive last and overwrite the value the
 * input now shows. A monotonic request number costs three lines and makes
 * that impossible rather than merely unlikely.
 */
let latest = 0

watch(text, async(next) => {
   const request = latest + 1

   latest = request

   const computed = await digestAll(next)

   if (request !== latest) return

   digests.value = computed
})

/**
 * Changing the format re-writes the digests rather than recomputing them.
 *
 * The same rule the UUID panel follows: the bytes have not changed, only
 * how they are spelled, so this stays synchronous and instant. It is also
 * why `digests` holds bytes rather than strings.
 */
const rows = computed(() =>
   HASH_ALGORITHMS.map((algorithm) => ({
      algorithm,
      name: COPY.hash.names[algorithm],
      bits: COPY.hash.bits.replace("{bits}", String(HASH_BITS[algorithm])),
      weak: algorithm === "sha1",
      value: digests.value === null ? "" : formatDigest(digests.value[algorithm], format.value),
   })),
)

/** Which algorithm the pasted checksum matches, if any. */
const match = computed(() =>
   digests.value === null ? null : matchDigest(digests.value, expected.value),
)

const verdict = computed(() => {
   if (expected.value.trim() === "" || digests.value === null) return ""

   return match.value === null
      ? COPY.hash.unmatched
      : COPY.hash.matched.replace("{algorithm}", COPY.hash.names[match.value])
})
</script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

.hash {
   &__text {
      min-block-size: px-to-rem(140);
      overflow-wrap: anywhere;
   }

   &__formats {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2xs) var(--space-sm);
      align-items: center;
      border: 0;
   }

   &__format {
      display: inline-flex;
      gap: var(--space-3xs);
      align-items: center;
      cursor: pointer;
   }

   &__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2xs);
   }

   // A checksum is compared character by character, so it gets the same
   // monospace face as the digests it is being held against.
   &__expected {
      font-family: var(--font-mono);
      font-size: px-to-rem(14);
   }

   &__note {
      color: var(--muted);
   }

   &__fault {
      color: var(--danger);
      font-size: px-to-rem(15);
   }

   &__verdict {
      color: var(--danger);
      font-size: px-to-rem(15);

      &--match {
         color: var(--success);
      }
   }
}

.hash-list {
   display: flex;
   flex-direction: column;
   gap: var(--space-3xs);
   list-style: none;

   &__item {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: var(--space-3xs) var(--space-2xs);
      align-items: start;
      padding: var(--space-2xs) var(--space-xs);
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      background-color: var(--surface);

      // The label and the copy button share a row on a phone, with the
      // digest spanning underneath. Widening moves the digest up beside
      // the name, where it reads as a result rather than a caption.
      @media (width >= 40rem) {
         grid-template-columns: px-to-rem(160) 1fr auto;
         align-items: center;
      }

      // The row a pasted checksum matches. The border carries it rather
      // than a background tint: `--success` is defined in both themes and
      // a tint would need a second value maintained alongside it.
      &--match {
         border-color: var(--success);
      }
   }

   &__label {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3xs);
      align-items: baseline;
      color: var(--muted);
      font-size: px-to-rem(13);
   }

   &__bits {
      font-size: px-to-rem(12);
      opacity: 0.8;
   }

   &__weak {
      color: var(--danger);
      font-size: px-to-rem(12);
   }

   // Hex is compared character by character and wraps anywhere, because a
   // SHA-512 digest is 128 characters with nothing in it to break at.
   &__value {
      grid-column: 1 / -1;
      font-family: var(--font-mono);
      font-size: px-to-rem(14);
      overflow-wrap: anywhere;

      @media (width >= 40rem) {
         grid-column: auto;
      }
   }
}
</style>
