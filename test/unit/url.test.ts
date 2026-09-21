import { describe, expect, it } from "vitest"
// Relative, not aliased: `~` is a Nuxt convenience that exists only inside
// the Nuxt/Vite environment, and these tests run in plain Node.
import { decodeUrl, encodeUrl, isValidPercentEncoding } from "../../app/utils/url"

/// `encodeUrl` returns a result, and a round trip has nothing to say until
/// the encode has succeeded. Unwrapping through here keeps the round-trip
/// tests below about the round trip rather than about the wrapper.
function encoded(...args: Parameters<typeof encodeUrl>): string {
   const result = encodeUrl(...args)

   if (!result.ok) throw new Error(`expected an encode, got ${result.fault}`)

   return result.text
}

describe("encodeUrl", () => {
   it("escapes reserved characters in component scope", () => {
      expect(encodeUrl("a b&c=d")).toEqual({ ok: true, text: "a%20b%26c%3Dd" })
   })

   /// The distinction the whole tool turns on. Component scope escapes a
   /// URL into something unfollowable; full scope leaves its structure
   /// alone and escapes only what cannot appear.
   it("keeps a URL's structure in full scope", () => {
      const url = "https://example.com/a b?q=1&r=2#top"

      expect(encodeUrl(url, "full")).toEqual({
         ok: true,
         text: "https://example.com/a%20b?q=1&r=2#top",
      })
      expect(encodeUrl(url, "component")).toEqual({
         ok: true,
         text: "https%3A%2F%2Fexample.com%2Fa%20b%3Fq%3D1%26r%3D2%23top",
      })
   })

   it("encodes text outside ASCII as UTF-8 bytes", () => {
      // é is a single character but the two bytes C3 A9 in UTF-8.
      expect(encodeUrl("café")).toEqual({ ok: true, text: "caf%C3%A9" })
      // An emoji is four.
      expect(encodeUrl("🎉")).toEqual({ ok: true, text: "%F0%9F%8E%89" })
   })

   it("writes a space as + when asked", () => {
      expect(encodeUrl("a b", "component", true)).toEqual({ ok: true, text: "a+b" })
   })

   /// The swap is safe precisely because `encodeURIComponent` has already
   /// escaped any literal plus, so the only `%20` in the string is a space
   /// and the only `+` is the one just written.
   it("keeps a literal plus distinguishable from a space", () => {
      expect(encodeUrl("a b+c", "component", true)).toEqual({ ok: true, text: "a+b%2Bc" })
   })

   /// A space in a path has to be `%20` — a `+` there names a different
   /// resource — so full scope ignores the flag rather than honouring it.
   it("never writes a space as + in full scope", () => {
      expect(encodeUrl("https://example.com/a b", "full", true))
         .toEqual({ ok: true, text: "https://example.com/a%20b" })
   })

   it("encodes the empty string as the empty string", () => {
      expect(encodeUrl("")).toEqual({ ok: true, text: "" })
   })

   /// The one way an encode fails, and the reason it returns a result at
   /// all. An astral character is stored as two UTF-16 halves; one half on
   /// its own is not text in any encoding, so there is no UTF-8 to escape
   /// and both platform encoders throw `URIError`. Reported rather than
   /// thrown, because the caller is a render.
   it("reports an unpaired surrogate rather than throwing", () => {
      // 😀 is U+1F600, stored as the pair D83D DE00. Either half alone,
      // and the generic high and low surrogates, are all unpaired.
      for (const broken of ["\uD83D", "\uDE00", "a\uD83Db", "\uD800", "\uDFFF"]) {
         expect(encodeUrl(broken), JSON.stringify(broken))
            .toEqual({ ok: false, fault: "loneSurrogate" })
      }
   })

   /// Full scope goes through `encodeURI`, a different platform function
   /// with the same constraint, so the guard has to cover both paths.
   it("reports an unpaired surrogate in full scope too", () => {
      expect(encodeUrl("https://example.com/\uD83D", "full"))
         .toEqual({ ok: false, fault: "loneSurrogate" })
   })

   /// The guard must not have been bought by rejecting astral characters
   /// in general — a *paired* surrogate is one ordinary character.
   it("still encodes a complete astral character", () => {
      expect(encodeUrl("\uD83D\uDE00")).toEqual({ ok: true, text: "%F0%9F%98%80" })
   })
})

describe("decodeUrl", () => {
   it("decodes escapes back to text", () => {
      expect(decodeUrl("caf%C3%A9")).toEqual({ ok: true, text: "café" })
   })

   it("decodes the empty string", () => {
      expect(decodeUrl("")).toEqual({ ok: true, text: "" })
   })

   /// Unlike `decodeURI`, which would leave the reserved escapes in place
   /// and hand back a string still carrying `%2F`.
   it("decodes reserved escapes too", () => {
      expect(decodeUrl("a%2Fb%3Fc")).toEqual({ ok: true, text: "a/b?c" })
   })

   it("round-trips both scopes", () => {
      const text = "chai & coffee ☕ / 50% off"

      expect(decodeUrl(encoded(text))).toEqual({ ok: true, text })
   })

   /// The first of the two faults: something a reader can see and fix by
   /// looking at their own input.
   it("reports a broken escape as malformed", () => {
      for (const broken of ["100%", "%2", "%GG", "a%zzb", "%"]) {
         expect(decodeUrl(broken), broken).toEqual({ ok: false, fault: "malformed" })
      }
   })

   /// The second: every escape is well formed and the bytes they spell are
   /// not UTF-8. `%FF` is not a valid lead byte, and `%E0%A4` is a
   /// three-byte sequence with its last byte missing.
   it("reports well-formed escapes that are not UTF-8 separately", () => {
      for (const bytes of ["%FF", "%E0%A4", "%C3%28"]) {
         expect(decodeUrl(bytes), bytes).toEqual({ ok: false, fault: "notText" })
      }
   })

   it("reads + as a space only when asked", () => {
      expect(decodeUrl("a+b")).toEqual({ ok: true, text: "a+b" })
      expect(decodeUrl("a+b", true)).toEqual({ ok: true, text: "a b" })
   })

   /// The form-encoding round trip, and the reason `%2B` exists: with the
   /// flag on, a literal plus still has to survive as a plus.
   it("keeps an escaped plus a plus while reading + as a space", () => {
      expect(decodeUrl("a+b%2Bc", true)).toEqual({ ok: true, text: "a b+c" })
      expect(decodeUrl(encoded("a b+c", "component", true), true))
         .toEqual({ ok: true, text: "a b+c" })
   })

   /// The malformed check runs before the plus swap, so a broken escape is
   /// still named as one rather than being masked by the substitution.
   it("reports a broken escape even with the plus flag set", () => {
      expect(decodeUrl("a+b%", true)).toEqual({ ok: false, fault: "malformed" })
   })
})

describe("isValidPercentEncoding", () => {
   it("accepts well-formed input and rejects both faults", () => {
      expect(isValidPercentEncoding("caf%C3%A9")).toBe(true)
      expect(isValidPercentEncoding("plain text")).toBe(true)
      expect(isValidPercentEncoding("100%")).toBe(false)
      expect(isValidPercentEncoding("%FF")).toBe(false)
   })
})
