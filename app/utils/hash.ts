/// --------------------------------------------------
/// utils/hash.ts
/// --------------------------------------------------
/// SHA digests of text, via the platform's own WebCrypto.
///
/// Three things about `crypto.subtle.digest` shape everything here and
/// every caller:
///
///  1. **It is asynchronous.** Digesting a few kilobytes takes microseconds
///     and still comes back as a promise, because the same API has to cover
///     a multi-megabyte file. A synchronous `computed` cannot hold the
///     result, so `HashGeneratorPanel.vue` awaits the first one during
///     render and watches for the rest.
///  2. **It is secure-context only.** Unlike `crypto.getRandomValues`, which
///     `utils/password.ts` uses without ceremony, `crypto.subtle` is simply
///     absent over plain http — including the `http://192.168.x.x` address
///     a phone uses to reach a dev server on the same network. Reading it
///     through `subtleCrypto()` turns that into an answer the page can give
///     rather than a `TypeError` in the console.
///  3. **It offers no MD5.** Deliberately, on the part of the specification:
///     MD5 and the other broken digests are not there to be misused. Adding
///     it back would mean a hand-rolled implementation or a dependency, and
///     the FAQ says so instead.
///
/// SHA-1 is included and labelled. It is broken for anything adversarial —
/// a chosen-prefix collision has been public since 2017 — and it is also
/// what Git object ids and a great many legacy systems still use, so a tool
/// that omits it sends people somewhere else to check a real value.
///
/// Auto-imported by Nuxt. Tests import it relatively (see test/unit).
/// --------------------------------------------------

// Imported rather than left to Nuxt's auto-import, which the panels rely
// on: this module is unit-tested in plain Node, where there is none.
import { encodeBase64Bytes } from "./base64"

/**
 * The four SHA digests WebCrypto implements, weakest first.
 *
 * Ids rather than the specification's own names, which carry a hyphen:
 * `"SHA-256"` as an object key would have to be quoted, and
 * `@stylistic/quote-props` is `consistent`, so one hyphenated key forces
 * every key in the copy block to be quoted too. The volume converter
 * learned that with `"us-gal"`; there is no reason to relearn it here when
 * the mapping costs four lines.
 */
export const HASH_ALGORITHMS = ["sha1", "sha256", "sha384", "sha512"] as const

export type HashAlgorithm = typeof HASH_ALGORITHMS[number]

/** Id to the name `crypto.subtle.digest` actually takes. */
const SUBTLE_NAMES = {
   sha1: "SHA-1",
   sha256: "SHA-256",
   sha384: "SHA-384",
   sha512: "SHA-512",
} as const satisfies Record<HashAlgorithm, string>

/**
 * Digest length in bits, which is the number in each algorithm's name.
 *
 * Shown beside each result because it is the only thing distinguishing
 * four rows of hex, and because it is what someone comparing a checksum
 * against a published one is really matching on.
 */
export const HASH_BITS = {
   sha1: 160,
   sha256: 256,
   sha384: 384,
   sha512: 512,
} as const satisfies Record<HashAlgorithm, number>

/** How a digest is written out. Hex is the near-universal convention. */
export const HASH_FORMATS = ["hex", "base64"] as const

export type HashFormat = typeof HASH_FORMATS[number]

export type Digests = Record<HashAlgorithm, Uint8Array>

/**
 * `crypto.subtle`, or null where the page is not a secure context.
 *
 * Read through a function rather than captured once at module load: in the
 * Nuxt build this module is evaluated on the server as well, and what is
 * true there says nothing about the browser that will run it.
 */
export function subtleCrypto(): SubtleCrypto | null {
   return globalThis.crypto?.subtle ?? null
}

/** Digest `text` as UTF-8 bytes. Rejects only if WebCrypto itself does. */
export async function digestText(text: string, algorithm: HashAlgorithm): Promise<Uint8Array> {
   const subtle = subtleCrypto()

   if (subtle === null) {
      throw new Error("Hashing needs a secure context — crypto.subtle is unavailable.")
   }

   return new Uint8Array(await subtle.digest(SUBTLE_NAMES[algorithm], new TextEncoder().encode(text)))
}

/**
 * All four digests of `text`, or null where WebCrypto is unavailable.
 *
 * All four rather than one at a time because the panel shows all four:
 * someone arriving from "sha256 online" and someone checking a Git object
 * id are the same visit, and a selector would make each of them read the
 * page twice. The four run concurrently, which for text-sized input is
 * indistinguishable from one.
 */
export async function digestAll(text: string): Promise<Digests | null> {
   if (subtleCrypto() === null) return null

   const digests = await Promise.all(
      HASH_ALGORITHMS.map(async(algorithm) => [algorithm, await digestText(text, algorithm)] as const),
   )

   return Object.fromEntries(digests) as Digests
}

/** Lowercase hex, two characters per byte. */
export function toHex(bytes: Uint8Array): string {
   let hex = ""

   for (const byte of bytes) {
      hex += byte.toString(16).padStart(2, "0")
   }

   return hex
}

export function formatDigest(bytes: Uint8Array, format: HashFormat): string {
   return format === "hex" ? toHex(bytes) : encodeBase64Bytes(bytes)
}

/**
 * Which algorithm, if any, produced `expected`.
 *
 * The point of returning the algorithm rather than a boolean: a checksum
 * published beside a download usually says what it is, and the one time it
 * does not is the time someone needs telling. "Matches SHA-256" answers
 * the question they could not ask.
 *
 * Both written forms are accepted, and both are normalised rather than
 * compared literally. Hex arrives lowercase from `sha256sum`, uppercase
 * from a Windows `certutil`, and space- or colon-separated from a handful
 * of tools that group it into bytes. Base64 arrives in either alphabet,
 * padded or not, for the reasons `utils/base64.ts` sets out.
 *
 * Not constant-time, and does not need to be: both sides of the comparison
 * are already on the visitor's screen.
 */
export function matchDigest(digests: Digests, expected: string): HashAlgorithm | null {
   const candidate = expected.trim()

   if (candidate === "") return null

   const asHex = candidate.replace(/[\s:-]/gu, "").toLowerCase()
   const asBase64 = candidate
      .replace(/\s/gu, "")
      .replace(/-/gu, "+")
      .replace(/_/gu, "/")
      .replace(/=+$/u, "")

   for (const algorithm of HASH_ALGORITHMS) {
      const bytes = digests[algorithm]

      if (toHex(bytes) === asHex) return algorithm
      if (encodeBase64Bytes(bytes, "standard", false) === asBase64) return algorithm
   }

   return null
}
