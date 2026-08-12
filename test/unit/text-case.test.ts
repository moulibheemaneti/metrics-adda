import { describe, expect, it } from "vitest"
// Relative, not aliased: `~` is a Nuxt convenience that exists only inside
// the Nuxt/Vite environment, and these tests run in plain Node.
import {
   CASES,
   convertCase,
   IDENTIFIER_CASES,
   splitWords,
   TEXT_CASES,
} from "../../app/utils/textCase"

describe("splitWords", () => {
   it("splits on separators of every kind", () => {
      expect(splitWords("hello world")).toEqual(["hello", "world"])
      expect(splitWords("snake_case_here")).toEqual(["snake", "case", "here"])
      expect(splitWords("kebab-case-here")).toEqual(["kebab", "case", "here"])
      expect(splitWords("dots.and,commas")).toEqual(["dots", "and", "commas"])
   })

   it("splits camel and Pascal boundaries", () => {
      expect(splitWords("camelCaseInput")).toEqual(["camel", "Case", "Input"])
      expect(splitWords("PascalCaseInput")).toEqual(["Pascal", "Case", "Input"])
   })

   /// The acronym rule is the one worth pinning: a run of capitals ends one
   /// letter *before* the next lowercase, because that letter starts the
   /// following word.
   it("keeps an acronym whole without swallowing the next word", () => {
      expect(splitWords("XMLHttpRequest")).toEqual(["XML", "Http", "Request"])
      expect(splitWords("parseHTTPResponse")).toEqual(["parse", "HTTP", "Response"])
      expect(splitWords("ID")).toEqual(["ID"])
   })

   it("treats digit runs as their own word", () => {
      expect(splitWords("utf8")).toEqual(["utf", "8"])
      expect(splitWords("getURLFor2Items")).toEqual(["get", "URL", "For", "2", "Items"])
   })

   it("returns nothing for input with no words in it", () => {
      expect(splitWords("")).toEqual([])
      expect(splitWords("   ---   ")).toEqual([])
   })
})

describe("convertCase — text cases", () => {
   const input = "hello world. this is a test!"

   it("upper-cases and lower-cases", () => {
      expect(convertCase(input, "upper")).toBe("HELLO WORLD. THIS IS A TEST!")
      expect(convertCase("HELLO", "lower")).toBe("hello")
   })

   it("capitalises every word in title case", () => {
      expect(convertCase(input, "title")).toBe("Hello World. This Is A Test!")
      // Short words are capitalised too — a deliberate choice, not an
      // oversight. See the note in utils/textCase.ts.
      expect(convertCase("the lord of the rings", "title")).toBe("The Lord Of The Rings")
   })

   it("lower-cases the rest of a shouted word in title case", () => {
      expect(convertCase("HELLO WORLD", "title")).toBe("Hello World")
   })

   /// Sentence case cannot use Intl.Segmenter: it only breaks a sentence
   /// before an uppercase letter, so lowercase input — the input this case
   /// exists to fix — comes back as a single segment.
   it("capitalises every sentence, not just the first", () => {
      expect(convertCase(input, "sentence")).toBe("Hello world. This is a test!")
      expect(convertCase("one. two! three?", "sentence")).toBe("One. Two! Three?")
   })

   it("starts a sentence at a line break", () => {
      expect(convertCase("line one\nline two", "sentence")).toBe("Line one\nLine two")
   })

   it("leaves a decimal point alone in sentence case", () => {
      expect(convertCase("it cost $3.50 today", "sentence")).toBe("It cost $3.50 today")
   })

   it("skips leading whitespace to find the first letter", () => {
      expect(convertCase("  hello. bye", "sentence")).toBe("  Hello. Bye")
   })

   it("alternates on letters only, so spacing does not consume a turn", () => {
      expect(convertCase("abcd", "alternating")).toBe("AbCd")
      // The space does not take a turn, so "c" continues the alternation
      // rather than restarting it.
      expect(convertCase("ab cd", "alternating")).toBe("Ab Cd")
   })

   it("preserves punctuation and layout", () => {
      const messy = "one two\n\nthree  four!"

      for (const id of TEXT_CASES) {
         // Same length in, same length out: nothing is added or dropped.
         expect(convertCase(messy, id)).toHaveLength(messy.length)
      }
   })
})

describe("convertCase — identifier cases", () => {
   const input = "hello world. this is a test!"

   it("builds each identifier case from the words", () => {
      expect(convertCase(input, "camel")).toBe("helloWorldThisIsATest")
      expect(convertCase(input, "pascal")).toBe("HelloWorldThisIsATest")
      expect(convertCase(input, "snake")).toBe("hello_world_this_is_a_test")
      expect(convertCase(input, "kebab")).toBe("hello-world-this-is-a-test")
      expect(convertCase(input, "constant")).toBe("HELLO_WORLD_THIS_IS_A_TEST")
   })

   it("re-cases an identifier that already has a case", () => {
      expect(convertCase("XMLHttpRequest", "snake")).toBe("xml_http_request")
      expect(convertCase("xml_http_request", "pascal")).toBe("XmlHttpRequest")
      expect(convertCase("xml-http-request", "camel")).toBe("xmlHttpRequest")
   })

   it("drops punctuation and layout, which is what makes it an identifier", () => {
      for (const id of IDENTIFIER_CASES) {
         expect(convertCase("one two\n\nthree  four!", id)).not.toMatch(/[\s.!]/u)
      }
   })

   it("survives input with no words in it", () => {
      for (const id of IDENTIFIER_CASES) {
         expect(convertCase("---", id)).toBe("")
      }
   })
})

describe("convertCase — every case", () => {
   it("returns empty for empty input", () => {
      for (const id of CASES) {
         expect(convertCase("", id)).toBe("")
      }
   })

   it("is idempotent — converting twice changes nothing further", () => {
      for (const id of CASES) {
         const once = convertCase("hello world. this is a test!", id)

         expect(convertCase(once, id)).toBe(once)
      }
   })

   it("lists every case in exactly one group", () => {
      expect([...TEXT_CASES, ...IDENTIFIER_CASES]).toEqual([...CASES])
      expect(new Set(CASES).size).toBe(CASES.length)
   })
})
