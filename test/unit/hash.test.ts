import { describe, expect, it } from "vitest"
// Relative, not aliased: `~` is a Nuxt convenience that exists only inside
// the Nuxt/Vite environment, and these tests run in plain Node.
import {
   type Digests,
   digestAll,
   digestText,
   formatDigest,
   HASH_ALGORITHMS,
   HASH_BITS,
   matchDigest,
   subtleCrypto,
   toHex,
} from "../../app/utils/hash"

/// The expected digests are the published test vectors for "abc" and for
/// the empty string, not values this implementation produced. A digest
/// checked against its own output only proves it is deterministic.
const ABC = {
   sha1: "a9993e364706816aba3e25717850c26c9cd0d89d",
   sha256: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
   sha384:
      "cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed"
      + "8086072ba1e7cc2358baeca134c825a7",
   sha512:
      "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a"
      + "2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f",
} as const

const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

/**
 * `digestAll`, narrowed.
 *
 * It returns null only where WebCrypto is missing, and Node is not that
 * place — so every case below wants the digests rather than the
 * possibility of their absence. Throwing here says which environment
 * assumption broke, instead of failing later on a property of null.
 */
async function digestsOf(text: string): Promise<Digests> {
   const digests = await digestAll(text)

   if (digests === null) throw new Error("WebCrypto is unavailable in this environment.")

   return digests
}

describe("digestText", () => {
   for (const algorithm of HASH_ALGORITHMS) {
      it(`matches the published ${algorithm} vector`, async() => {
         expect(toHex(await digestText("abc", algorithm))).toBe(ABC[algorithm])
      })
   }

   it("hashes the empty string", async() => {
      expect(toHex(await digestText("", "sha256"))).toBe(EMPTY_SHA256)
   })

   /// Text becomes UTF-8 bytes before it is digested, so a digest is of
   /// the bytes rather than of the code points — the same distinction
   /// `utils/base64.ts` exists to get right.
   it("digests text outside ASCII as its UTF-8 bytes", async() => {
      const fromText = await digestText("café", "sha256")
      const fromBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("café"))

      expect(toHex(fromText)).toBe(toHex(new Uint8Array(fromBytes)))
   })

   it("produces a digest of the advertised length", async() => {
      for (const algorithm of HASH_ALGORITHMS) {
         const bytes = await digestText("abc", algorithm)

         expect(bytes.length * 8, algorithm).toBe(HASH_BITS[algorithm])
      }
   })
})

describe("digestAll", () => {
   it("returns all four digests at once", async() => {
      const digests = await digestsOf("abc")

      for (const algorithm of HASH_ALGORITHMS) {
         expect(toHex(digests[algorithm]), algorithm).toBe(ABC[algorithm])
      }
   })

   it("is not null where WebCrypto is present", async() => {
      expect(await digestAll("abc")).not.toBeNull()
   })
})

describe("subtleCrypto", () => {
   /// Node has WebCrypto, so this is the available branch. The null branch
   /// is the one that matters in a browser over plain http, and it is the
   /// reason the panel reads it through a function rather than assuming.
   it("finds WebCrypto where it exists", () => {
      expect(subtleCrypto()).not.toBeNull()
   })
})

describe("toHex", () => {
   /// A byte below 16 is one hex digit and has to be padded, or every
   /// digest containing one comes out short and silently wrong.
   it("pads each byte to two digits", () => {
      expect(toHex(new Uint8Array([0, 15, 16, 255]))).toBe("000f10ff")
   })

   it("writes lowercase", () => {
      expect(toHex(new Uint8Array([0xab, 0xcd]))).toBe("abcd")
   })

   it("renders an empty digest as the empty string", () => {
      expect(toHex(new Uint8Array([]))).toBe("")
   })
})

describe("formatDigest", () => {
   it("writes hex and base64 of the same bytes", async() => {
      const bytes = await digestText("abc", "sha256")

      expect(formatDigest(bytes, "hex")).toBe(ABC.sha256)
      expect(formatDigest(bytes, "base64")).toBe("ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=")
   })
})

describe("matchDigest", () => {
   /// Naming the algorithm rather than returning a boolean is the point: a
   /// checksum published beside a download does not always say what it is.
   it("names the algorithm a hex checksum matches", async() => {
      const digests = await digestsOf("abc")

      expect(matchDigest(digests, ABC.sha256)).toBe("sha256")
      expect(matchDigest(digests, ABC.sha1)).toBe("sha1")
      expect(matchDigest(digests, ABC.sha384)).toBe("sha384")
      expect(matchDigest(digests, ABC.sha512)).toBe("sha512")
   })

   /// `sha256sum` writes lowercase, Windows `certutil` uppercase, and a
   /// handful of tools group the bytes with spaces or colons. All four are
   /// the same checksum.
   it("accepts hex however it was written", async() => {
      const digests = await digestsOf("abc")
      const grouped = ABC.sha256.toUpperCase().replace(/(..)/gu, "$1:").replace(/:$/u, "")

      expect(matchDigest(digests, ABC.sha256.toUpperCase())).toBe("sha256")
      expect(matchDigest(digests, `  ${ABC.sha256}  `)).toBe("sha256")
      expect(matchDigest(digests, grouped)).toBe("sha256")
   })

   it("accepts base64 in either alphabet, padded or not", async() => {
      const digests = await digestsOf("abc")
      const padded = formatDigest(digests.sha256, "base64")

      expect(matchDigest(digests, padded)).toBe("sha256")
      expect(matchDigest(digests, padded.replace(/=+$/u, ""))).toBe("sha256")
      expect(matchDigest(digests, padded.replace(/\+/gu, "-").replace(/\//gu, "_"))).toBe("sha256")
   })

   it("returns null for a checksum of something else", async() => {
      const digests = await digestsOf("abc")

      expect(matchDigest(digests, EMPTY_SHA256)).toBeNull()
      expect(matchDigest(digests, "deadbeef")).toBeNull()
   })

   /// An empty field is not a failed comparison, and reporting it as one
   /// would put "no match" under a box nobody has filled in yet.
   it("returns null for an empty or blank expectation", async() => {
      const digests = await digestsOf("abc")

      expect(matchDigest(digests, "")).toBeNull()
      expect(matchDigest(digests, "   ")).toBeNull()
   })
})
