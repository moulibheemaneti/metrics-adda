/// --------------------------------------------------
/// utils/base64.ts
/// --------------------------------------------------
/// Base64, both directions, over text that is not necessarily ASCII.
///
/// `btoa` is the trap this module exists to cover. It takes a *binary
/// string* — one character per byte — and throws on any code point above
/// 255, so `btoa("café")` is an exception rather than an encoding. The fix
/// is not to catch it: text has to be turned into UTF-8 bytes first, and
/// those bytes into the binary string `btoa` actually wants. Every
/// "base64 encode" that mangles an emoji skipped that step.
///
/// Decoding runs the same path backwards, with `TextDecoder` in fatal mode
/// so that bytes which are valid base64 but not valid UTF-8 are reported
/// rather than silently replaced with question marks. Those are two
/// different failures with two different fixes, so they get two different
/// messages.
///
/// Auto-imported by Nuxt. Tests import it relatively (see test/unit).
/// --------------------------------------------------

/**
 * Which 62nd and 63rd characters to use.
 *
 * Standard base64 ends in `+` and `/`, both of which have meaning in a URL
 * and get percent-encoded on the way through one. The URL-safe alphabet of
 * RFC 4648 §5 swaps them for `-` and `_`, which is what JWTs and most
 * token formats use.
 */
export const BASE64_ALPHABETS = ["standard", "urlSafe"] as const

export type Base64Alphabet = typeof BASE64_ALPHABETS[number]

/** Why a decode failed. The two cases have genuinely different fixes. */
export type Base64Fault
   /** Characters outside the alphabet, or a length that cannot be base64. */
   = | "notBase64"
   /** Valid base64, but the bytes it holds are not valid UTF-8 text. */
     | "notText"

export type Base64Decoded
   = | { ok: true, text: string }
     | { ok: false, fault: Base64Fault }

/** Bytes to a one-character-per-byte string, in chunks so long input works. */
function toBinaryString(bytes: Uint8Array): string {
   // Chunked rather than `String.fromCharCode(...bytes)`: spreading a
   // large array into an argument list overflows the call stack, and does
   // it at a size that is easy to miss in testing — tens of kilobytes.
   const CHUNK = 0x8000
   let binary = ""

   for (let offset = 0; offset < bytes.length; offset += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK))
   }

   return binary
}

/**
 * Encode text as base64.
 *
 * The text is taken as UTF-8, which is what makes this work for anything
 * that is not plain ASCII. Padding is separable because the URL-safe
 * alphabet is usually written without it, and `=` is itself awkward in a
 * URL — but it is a free choice in both alphabets, so it is its own flag
 * rather than something implied by the alphabet.
 */
export function encodeBase64(
   text: string,
   alphabet: Base64Alphabet = "standard",
   padded = true,
): string {
   const encoded = btoa(toBinaryString(new TextEncoder().encode(text)))
   const mapped = alphabet === "urlSafe"
      ? encoded.replace(/\+/gu, "-").replace(/\//gu, "_")
      : encoded

   return padded ? mapped : mapped.replace(/=+$/u, "")
}

/**
 * Decode base64 back to text.
 *
 * Both alphabets are accepted without being asked which one this is: `-`
 * and `_` cannot appear in standard base64 and `+` and `/` cannot appear
 * in the URL-safe one, so the two are distinguishable from the input
 * itself. Making someone pick the right one before their token will decode
 * is a question the tool can answer for them.
 *
 * Missing padding is restored for the same reason. Unpadded is how
 * URL-safe base64 is normally written, and refusing it would reject most
 * of what people paste in.
 */
export function decodeBase64(text: string): Base64Decoded {
   // Whitespace is stripped first: base64 arrives wrapped at 76 characters
   // from MIME, and pasted out of terminals and config files with newlines
   // and indentation still in it.
   const compact = text.replace(/\s/gu, "")

   if (compact === "") return { ok: true, text: "" }

   const canonical = compact.replace(/-/gu, "+").replace(/_/gu, "/")

   if (!/^[A-Za-z0-9+/]*={0,2}$/u.test(canonical)) return { ok: false, fault: "notBase64" }

   // A remainder of 1 is impossible: no number of bytes encodes to a
   // single base64 character, so it is a truncation rather than something
   // padding can repair.
   const remainder = canonical.length % 4

   if (remainder === 1) return { ok: false, fault: "notBase64" }

   const padded = remainder === 0 ? canonical : canonical + "=".repeat(4 - remainder)

   let binary: string

   try {
      binary = atob(padded)
   }
   catch {
      return { ok: false, fault: "notBase64" }
   }

   const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))

   try {
      // Fatal, so invalid UTF-8 is reported rather than turned into
      // replacement characters. Base64 carrying a PNG decodes perfectly
      // well as bytes and is not text — saying so beats handing back a
      // screenful of "".
      return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) }
   }
   catch {
      return { ok: false, fault: "notText" }
   }
}

/** Whether `text` would decode. Convenience over `decodeBase64().ok`. */
export function isValidBase64(text: string): boolean {
   return decodeBase64(text).ok
}
