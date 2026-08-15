import { describe, expect, it } from "vitest"
// Relative, not aliased: `~` is a Nuxt convenience that exists only inside
// the Nuxt/Vite environment, and these tests run in plain Node.
import { decodeBase64, encodeBase64, isValidBase64 } from "../../app/utils/base64"

describe("encodeBase64", () => {
   it("encodes ASCII", () => {
      expect(encodeBase64("Metrics Adda")).toBe("TWV0cmljcyBBZGRh")
   })

   it("encodes the empty string as the empty string", () => {
      expect(encodeBase64("")).toBe("")
   })

   /// The three padding cases, which are decided by the input length mod 3.
   it("pads to a multiple of four", () => {
      expect(encodeBase64("abc")).toBe("YWJj")
      expect(encodeBase64("ab")).toBe("YWI=")
      expect(encodeBase64("a")).toBe("YQ==")
   })

   /// The whole reason this module exists rather than a bare `btoa` call:
   /// `btoa("café")` throws, because é is code point 233 as a character
   /// but two bytes as UTF-8.
   it("encodes text outside Latin-1", () => {
      // é is a single character but the two bytes C3 A9 in UTF-8.
      expect(encodeBase64("café")).toBe("Y2Fmw6k=")
   })

   it("encodes an emoji, which is four UTF-8 bytes", () => {
      expect(encodeBase64("🎉")).toBe("8J+OiQ==")
   })

   it("uses the URL-safe alphabet when asked", () => {
      // These two characters are four UTF-8 bytes, and land on "/" in
      // the standard alphabet.
      const text = "ÿþ"

      expect(encodeBase64(text, "standard")).toContain("/")
      expect(encodeBase64(text, "urlSafe")).not.toContain("/")
      expect(encodeBase64(text, "urlSafe")).not.toContain("+")
   })

   it("drops the padding when asked", () => {
      expect(encodeBase64("a", "standard", false)).toBe("YQ")
      expect(encodeBase64("abc", "standard", false)).toBe("YWJj")
   })

   /// Long enough to have overflowed the call stack had the bytes been
   /// spread into `String.fromCharCode` in one argument list.
   it("encodes input past the argument-list limit", () => {
      const long = "a".repeat(200_000)

      expect(encodeBase64(long)).toBe(encodeBase64(long))
      expect(decodeBase64(encodeBase64(long))).toEqual({ ok: true, text: long })
   })
})

describe("decodeBase64", () => {
   it("decodes ASCII", () => {
      expect(decodeBase64("TWV0cmljcyBBZGRh")).toEqual({ ok: true, text: "Metrics Adda" })
   })

   it("decodes the empty string", () => {
      expect(decodeBase64("")).toEqual({ ok: true, text: "" })
   })

   /// Neither alphabet has to be declared: `-` and `_` cannot occur in
   /// standard base64 and `+` and `/` cannot occur in the URL-safe one, so
   /// the input says which it is.
   it("accepts either alphabet without being told", () => {
      const text = "ÿþ"

      expect(decodeBase64(encodeBase64(text, "standard"))).toEqual({ ok: true, text })
      expect(decodeBase64(encodeBase64(text, "urlSafe"))).toEqual({ ok: true, text })
   })

   it("restores missing padding", () => {
      expect(decodeBase64("YQ")).toEqual({ ok: true, text: "a" })
      expect(decodeBase64("YWI")).toEqual({ ok: true, text: "ab" })
   })

   /// Base64 arrives wrapped from MIME and indented out of config files.
   it("ignores whitespace and line breaks", () => {
      expect(decodeBase64("TWV0cmlj\ncyBBZGRh")).toEqual({ ok: true, text: "Metrics Adda" })
      expect(decodeBase64("  TWV0cmljcyBBZGRh  ")).toEqual({ ok: true, text: "Metrics Adda" })
   })

   it("round-trips text outside Latin-1", () => {
      for (const text of ["café", "🎉 party", "日本語", "Ω≈ç√"]) {
         expect(decodeBase64(encodeBase64(text))).toEqual({ ok: true, text })
      }
   })

   it("rejects characters outside the alphabet", () => {
      expect(decodeBase64("not base64!")).toEqual({ ok: false, fault: "notBase64" })
      expect(decodeBase64("****")).toEqual({ ok: false, fault: "notBase64" })
   })

   /// No number of bytes encodes to a single base64 character, so a
   /// remainder of one is a truncated string rather than missing padding.
   it("rejects a length that cannot be base64", () => {
      expect(decodeBase64("YWJjY")).toEqual({ ok: false, fault: "notBase64" })
   })

   /// Valid base64 holding bytes that are not UTF-8 — a PNG, a key, any
   /// binary at all. Distinct from "not base64", because the fix is
   /// different: there is nothing wrong with the input, it just is not text.
   it("separates valid base64 that is not text", () => {
      // 0xFF 0xFE 0xFD is well-formed base64 and invalid UTF-8.
      expect(decodeBase64("//79")).toEqual({ ok: false, fault: "notText" })
   })

   it("rejects a lone continuation byte", () => {
      // 0x80 on its own continues a sequence that never started.
      expect(decodeBase64("gA==")).toEqual({ ok: false, fault: "notText" })
   })
})

describe("isValidBase64", () => {
   it("agrees with decodeBase64", () => {
      expect(isValidBase64("TWV0cmljcyBBZGRh")).toBe(true)
      expect(isValidBase64("not base64!")).toBe(false)
      expect(isValidBase64("//79")).toBe(false)
   })
})
