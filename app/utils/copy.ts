/// --------------------------------------------------
/// utils/copy.ts
/// --------------------------------------------------
/// Every user-facing string on the site, in one place.
///
/// The site is single-locale English, so there is no translation layer:
/// components read these constants directly instead of calling a `t()`
/// helper. Keeping the copy here rather than inline in templates preserves
/// the one property that matters — all wording is reviewable and editable
/// from a single file — while making a mistyped key a type error rather
/// than a raw key rendered to the page.
///
/// Auto-imported by Nuxt. Tests import it relatively (see test/unit).
/// --------------------------------------------------

import type { Weekday } from "./age"
import type { Base64Alphabet, Base64Fault } from "./base64"
import type { BmiCategory, BmiPopulation } from "./bmi"
import type {
   ActivityLevel,
   BodyFatCategory,
   IdealWeightFormula,
   Sex,
   WhrCategory,
   WhtrCategory,
} from "./body"
import type { LoremUnit } from "./lorem"
import type { PercentageMode, PercentageReadout } from "./percentage"
import type { CaseId } from "./textCase"
// Type-only, and `tools.ts` imports `ToolKey` back from here. The cycle is
// erased at compile time, which is what keeps each module's names defined
// where they belong rather than in a third file that exists only to break it.
import type { ToolGroup } from "./tools"
import type { DimensionId } from "./units"

/** One key per tool. Drives the registry, the copy blocks and the SEO map. */
export type ToolKey
   = | "weightConverter"
     | "heightConverter"
     | "temperatureConverter"
     | "speedConverter"
     | "volumeConverter"
     | "areaConverter"
     | "timeConverter"
     | "dataStorageConverter"
     | "percentageCalculator"
     | "ageCalculator"
     | "wordCounter"
     | "caseConverter"
     | "base64Encoder"
     | "bmiCalculator"
     | "typingTest"
     | "loremIpsumGenerator"
     | "uuidGenerator"
     | "passwordGenerator"

/** Pages that carry their own search metadata. */
export type PageKey = ToolKey | "home" | "privacy" | "about" | "contact"

export interface SeoCopy {
   /** Rendered as <title>. Budget: SEO_TITLE_MAX. */
   title: string
   /** Rendered as <meta name="description">. Budget: SEO_DESCRIPTION_MAX. */
   description: string
}

export interface ToolCopy {
   /** Short label for nav and cards. */
   name: string
   /** One line under the name on the hub card, and on the OG card. */
   tagline: string
   /** The page's <h1>. */
   heading: string
   /** The paragraph under the heading. */
   lede: string
}

export interface UnitCopy {
   name: string
   symbol: string
}

export interface FaqEntry {
   question: string
   answer: string
}

/**
 * One section of the privacy policy.
 *
 * `links` is optional because only a section that cites outside sources
 * carries any — today none does. It stays on the type rather than being
 * removed with the advertising section it belonged to, so restoring that
 * section is a copy change and not a type change.
 */
export interface PolicySection {
   heading: string
   body: string[]
   links?: { label: string, href: string }[]
}

/**
 * One section of the contact page.
 *
 * `link` is the escape hatch for the one thing a plain string cannot carry:
 * a paragraph with an internal link inside it. The sentence is split around
 * the anchor rather than marked up, so the copy stays plain text and the
 * template stays free of `v-html`.
 */
export interface ContactSection {
   heading: string
   /** Paragraphs rendered as-is, before `link`. */
   body: string[]
   link?: {
      /** Sentence up to the anchor. Keep the trailing space. */
      before: string
      /** The anchor's own text. */
      label: string
      /** Internal route, passed straight to `NuxtLink`. */
      to: string
      /** The rest of the sentence, starting with its punctuation. */
      after: string
   }
}

/**
 * Per-page search metadata.
 *
 * Every entry is length-checked against the SERP budgets in `utils/seo.ts`
 * by `test/unit/seo.test.ts` — a title over 60 characters or a description
 * over 155 fails the suite rather than getting silently clipped by Google.
 *
 * Tool titles are kept well under the limit because nuxt-seo-utils appends
 * " | Metrics Adda" (15 characters) at render time; the budget applies to
 * the authored string, but Google measures what actually ships.
 */
export const SEO: Record<PageKey, SeoCopy> = {
   home: {
      title: "Metrics Adda — Unit Converters & Text Tools",
      description:
         "Free converters for weight, height, temperature, speed, volume, area, time and data, plus text tools, a BMI calculator and password and UUID generators.",
   },
   privacy: {
      title: "Privacy Policy",
      description:
         "How Metrics Adda handles your data: the tools run entirely in your browser and send nothing to a server. No ads, and no tracking cookies.",
   },
   about: {
      title: "About Metrics Adda",
      description:
         "Who runs Metrics Adda and why it exists: a small set of everyday converters and text tools that run entirely in your browser, with no accounts.",
   },
   contact: {
      title: "Contact",
      description:
         "Get in touch with Metrics Adda about a wrong conversion, a tool you would like to see, or anything to do with privacy on the site.",
   },
   weightConverter: {
      title: "Weight Converter: kg, lb, oz, g & stone",
      description:
         "Convert weight between kilograms, pounds, ounces, grams, stone and tonnes. Type a value and read every unit at once — instant, free and accurate.",
   },
   heightConverter: {
      title: "Height Converter: cm to feet & inches",
      description:
         "Convert height between centimetres, metres, feet and inches. Enter feet and inches directly, or a value in cm, and read the result instantly.",
   },
   temperatureConverter: {
      title: "Temperature Converter: °C, °F & K",
      description:
         "Convert temperature between Celsius, Fahrenheit and kelvin. Type a value and read every scale at once — free, instant and accurate to the degree.",
   },
   speedConverter: {
      title: "Speed Converter: km/h, mph, m/s & knots",
      description:
         "Convert speed between kilometres per hour, miles per hour, metres per second and knots. Type a value and read every unit at once — free and instant.",
   },
   volumeConverter: {
      title: "Volume Converter: litres, gallons, cups & ml",
      description:
         "Convert volume between litres, millilitres, US and imperial gallons, pints, cups and fluid ounces. Type a value and read every unit at once.",
   },
   areaConverter: {
      title: "Area Converter: m², sq ft, acres & hectares",
      description:
         "Convert area between square metres, square feet, acres, hectares and square miles. Type a value and read every unit at once — free and instant.",
   },
   timeConverter: {
      title: "Time Converter: seconds, minutes, hours & days",
      description:
         "Convert time between milliseconds, seconds, minutes, hours, days, weeks and years. Type a value and read every unit at once — free and instant.",
   },
   dataStorageConverter: {
      title: "Data Storage Converter: KB, MB, GB & TB",
      description:
         "Convert data storage between bytes, KB, MB, GB, TB and their binary counterparts KiB, MiB, GiB and TiB. See why a 1 TB drive shows as 931 GB.",
   },
   percentageCalculator: {
      title: "Percentage Calculator: Percent Of, Change & Increase",
      description:
         "Work out a percentage of a number, what percent one number is of another, and the increase or decrease between two values. Free, in your browser.",
   },
   ageCalculator: {
      title: "Age Calculator: Your Age in Years, Months and Days",
      description:
         "Work out an age from a date of birth, in years, months and days — plus total weeks and days, the weekday you were born on, and your next birthday.",
   },
   wordCounter: {
      title: "Word & Character Counter",
      description:
         "Count words, characters, sentences, paragraphs and lines as you type, with reading and speaking time. Works with any language. Nothing is uploaded.",
   },
   caseConverter: {
      title: "Case Converter: Upper, Lower, Title & camelCase",
      description:
         "Convert text to UPPER CASE, lower case, Title Case, Sentence case, camelCase, snake_case or kebab-case. Instant, free and runs in your browser.",
   },
   base64Encoder: {
      title: "Base64 Encoder and Decoder: Text to Base64",
      description:
         "Encode text to base64 or decode it back, with full Unicode support and the URL-safe alphabet. Runs in your browser — nothing you paste is uploaded.",
   },
   typingTest: {
      title: "Typing Speed Test: Words Per Minute",
      description:
         "Test your typing speed in 15, 30, 60 or 120 seconds. See your words per minute, accuracy and personal best. Free, no sign-up, runs in your browser.",
   },
   bmiCalculator: {
      /// The title is unchanged deliberately. Advanced mode is client
      /// state, so a title promising body-fat analysis would describe
      /// markup that is not in the server-rendered HTML — and retitling a
      /// page that already ranks is a real risk taken for no gain. The
      /// description earns its change: the two new FAQ answers put genuine
      /// body-fat text into the SSR output.
      title: "BMI Calculator: Body Mass Index in kg or lb",
      description:
         "Work out your BMI from height and weight in metric or imperial units, then switch to advanced for body fat, lean mass and daily energy needs.",
   },
   loremIpsumGenerator: {
      title: "Lorem Ipsum Generator: Placeholder Text",
      description:
         "Generate lorem ipsum placeholder text by the paragraph, sentence or word. Start with the classic opening line or skip it, then copy it in one click.",
   },
   uuidGenerator: {
      title: "UUID Generator: Random v4 UUIDs",
      description:
         "Generate random version 4 UUIDs, up to 100 at a time. Choose uppercase, hyphens or braces, and copy the lot. Generated in your browser, never on a server.",
   },
   passwordGenerator: {
      title: "Strong Random Password Generator",
      description:
         "Generate strong random passwords with letters, digits and symbols. Set the length, see the entropy, and copy in one click. Generated in your browser.",
   },
}

const TOOL_COPY: Record<ToolKey, ToolCopy> = {
   weightConverter: {
      name: "Weight Converter",
      tagline: "kg, lb, oz, g, stone and tonnes",
      heading: "Weight converter",
      lede: "Convert between metric and imperial weights. Type a value and every other unit updates as you go.",
   },
   heightConverter: {
      name: "Height Converter",
      tagline: "cm, m, feet and inches",
      heading: "Height converter",
      lede: "Convert a height between centimetres and feet and inches — enter it either way round.",
   },
   temperatureConverter: {
      name: "Temperature Converter",
      tagline: "Celsius, Fahrenheit and kelvin",
      heading: "Temperature converter",
      lede: "Convert between Celsius, Fahrenheit and kelvin. Type a value and read every scale at once.",
   },
   speedConverter: {
      name: "Speed Converter",
      tagline: "km/h, mph, m/s, ft/s and knots",
      heading: "Speed converter",
      lede: "Convert between metric, imperial and nautical speeds. Type a value and every other unit updates as you go.",
   },
   volumeConverter: {
      name: "Volume Converter",
      tagline: "Litres, millilitres, gallons, pints and cups",
      heading: "Volume converter",
      lede: "Convert between metric, US and imperial volumes. US and imperial units are listed separately, because a pint is not the same size in both.",
   },
   areaConverter: {
      name: "Area Converter",
      tagline: "m², sq ft, acres, hectares and sq miles",
      heading: "Area converter",
      lede: "Convert between metric and imperial areas, from square millimetres to square miles. Type a value and every other unit updates as you go.",
   },
   timeConverter: {
      name: "Time Converter",
      tagline: "Milliseconds, seconds, minutes, hours and days",
      heading: "Time converter",
      lede: "Convert between milliseconds, seconds, minutes, hours, days, weeks and years. Type a value and read every unit at once.",
   },
   dataStorageConverter: {
      name: "Data Storage Converter",
      tagline: "Bytes, KB, MB, GB, TB and KiB, MiB, GiB, TiB",
      heading: "Data storage converter",
      lede: "Convert between decimal and binary storage units. They are listed separately because a kilobyte is 1,000 bytes and a kibibyte is 1,024.",
   },
   percentageCalculator: {
      name: "Percentage Calculator",
      tagline: "Percent of, percent change, increase and decrease",
      heading: "Percentage calculator",
      lede: "Four percentage questions in one panel: what a percentage of a number comes to, what percentage one number is of another, the change between two values, and a value with a percentage added or taken off. Pick the question and the two numbers stay where they are.",
   },
   ageCalculator: {
      name: "Age Calculator",
      tagline: "Years, months, days and your next birthday",
      heading: "Age calculator",
      lede: "Enter a date of birth and read the age in years, months and days — along with the same span counted in weeks and days, the weekday it started on, and how long until the next birthday. Measure to today, or to any other date.",
   },
   wordCounter: {
      name: "Word Counter",
      tagline: "Words, characters, sentences and reading time",
      heading: "Word and character counter",
      lede: "Paste or type your text to count words, characters, sentences, paragraphs and lines. Your text never leaves your browser.",
   },
   caseConverter: {
      name: "Case Converter",
      tagline: "UPPER, lower, Title, camelCase and snake_case",
      heading: "Case converter",
      lede: "Paste text and read it back in ten cases at once. Copy any one of them with a single click.",
   },
   base64Encoder: {
      name: "Base64 Encoder",
      tagline: "Encode and decode base64, Unicode included",
      heading: "Base64 encoder and decoder",
      lede: "Paste text to encode it as base64, or paste base64 to read it back. Text is encoded as UTF-8, so accents and emoji survive the trip — and the URL-safe alphabet is one checkbox away.",
   },
   bmiCalculator: {
      name: "BMI Calculator",
      tagline: "Body mass index, body fat and daily energy",
      heading: "BMI calculator",
      lede: "Enter your height and weight in metric or imperial units. You get your BMI, the category it falls in, and the weight range that would put you in the healthy band. Switch to advanced for body fat, lean mass and the calories your body burns.",
   },
   typingTest: {
      name: "Typing Speed Test",
      tagline: "Words per minute, accuracy and your best",
      heading: "Typing speed test",
      lede: "Type the words as they appear and see your speed in words per minute. Pick a length, a topic and a difficulty, mix in numbers and punctuation if you want them, and the clock starts with your first keystroke.",
   },
   loremIpsumGenerator: {
      name: "Lorem Ipsum Generator",
      tagline: "Placeholder text by paragraph, sentence or word",
      heading: "Lorem ipsum generator",
      lede: "Generate placeholder text for a layout or a mockup. Pick paragraphs, sentences or words, choose how many, and copy the result in one click.",
   },
   uuidGenerator: {
      name: "UUID Generator",
      tagline: "Random version 4 UUIDs, up to 100 at once",
      heading: "UUID generator",
      lede: "Generate random version 4 UUIDs. Choose how many you need and how they are formatted. They are produced by your browser's cryptographic random number generator and never sent anywhere.",
   },
   passwordGenerator: {
      name: "Password Generator",
      tagline: "Strong random passwords, generated locally",
      heading: "Password generator",
      lede: "Generate a strong random password. Everything happens in your browser — nothing is sent to a server or stored anywhere.",
   },
}

const UNIT_COPY: Record<DimensionId, Record<string, UnitCopy>> = {
   mass: {
      mg: { name: "Milligram", symbol: "mg" },
      g: { name: "Gram", symbol: "g" },
      kg: { name: "Kilogram", symbol: "kg" },
      t: { name: "Tonne", symbol: "t" },
      oz: { name: "Ounce", symbol: "oz" },
      lb: { name: "Pound", symbol: "lb" },
      st: { name: "Stone", symbol: "st" },
      ton: { name: "US ton", symbol: "ton" },
   },
   length: {
      mm: { name: "Millimetre", symbol: "mm" },
      cm: { name: "Centimetre", symbol: "cm" },
      m: { name: "Metre", symbol: "m" },
      km: { name: "Kilometre", symbol: "km" },
      in: { name: "Inch", symbol: "in" },
      ft: { name: "Foot", symbol: "ft" },
      yd: { name: "Yard", symbol: "yd" },
      mi: { name: "Mile", symbol: "mi" },
   },
   temperature: {
      c: { name: "Celsius", symbol: "°C" },
      f: { name: "Fahrenheit", symbol: "°F" },
      k: { name: "Kelvin", symbol: "K" },
   },
   speed: {
      mps: { name: "Metre per second", symbol: "m/s" },
      kmh: { name: "Kilometre per hour", symbol: "km/h" },
      mph: { name: "Mile per hour", symbol: "mph" },
      fps: { name: "Foot per second", symbol: "ft/s" },
      kn: { name: "Knot", symbol: "kn" },
   },
   // Every US and imperial name is qualified. Left bare, "Pint" and "Pint"
   // would sit in the same dropdown twice and read as a duplicate rather
   // than as the two different sizes they are.
   volume: {
      "ml": { name: "Millilitre", symbol: "ml" },
      "l": { name: "Litre", symbol: "l" },
      "m3": { name: "Cubic metre", symbol: "m³" },
      // Qualifier first, matching "US ton" in the mass block. The panel
      // renders a unit as "name (symbol)", so a trailing "(US)" would come
      // out as "Fluid ounce (US) (fl oz)".
      "us-tsp": { name: "US teaspoon", symbol: "tsp" },
      "us-tbsp": { name: "US tablespoon", symbol: "tbsp" },
      "us-floz": { name: "US fluid ounce", symbol: "fl oz" },
      "us-cup": { name: "US cup", symbol: "cup" },
      "us-pt": { name: "US pint", symbol: "pt" },
      "us-qt": { name: "US quart", symbol: "qt" },
      "us-gal": { name: "US gallon", symbol: "gal" },
      "imp-floz": { name: "Imperial fluid ounce", symbol: "fl oz" },
      "imp-pt": { name: "Imperial pint", symbol: "pt" },
      "imp-gal": { name: "Imperial gallon", symbol: "gal" },
   },
   area: {
      mm2: { name: "Square millimetre", symbol: "mm²" },
      cm2: { name: "Square centimetre", symbol: "cm²" },
      m2: { name: "Square metre", symbol: "m²" },
      ha: { name: "Hectare", symbol: "ha" },
      km2: { name: "Square kilometre", symbol: "km²" },
      in2: { name: "Square inch", symbol: "in²" },
      ft2: { name: "Square foot", symbol: "ft²" },
      yd2: { name: "Square yard", symbol: "yd²" },
      acre: { name: "Acre", symbol: "ac" },
      mi2: { name: "Square mile", symbol: "mi²" },
   },
   time: {
      ms: { name: "Millisecond", symbol: "ms" },
      s: { name: "Second", symbol: "s" },
      min: { name: "Minute", symbol: "min" },
      h: { name: "Hour", symbol: "h" },
      d: { name: "Day", symbol: "d" },
      wk: { name: "Week", symbol: "wk" },
      yr: { name: "Year", symbol: "yr" },
   },
   data: {
      bit: { name: "Bit", symbol: "b" },
      byte: { name: "Byte", symbol: "B" },
      kb: { name: "Kilobyte", symbol: "kB" },
      mb: { name: "Megabyte", symbol: "MB" },
      gb: { name: "Gigabyte", symbol: "GB" },
      tb: { name: "Terabyte", symbol: "TB" },
      pb: { name: "Petabyte", symbol: "PB" },
      kib: { name: "Kibibyte", symbol: "KiB" },
      mib: { name: "Mebibyte", symbol: "MiB" },
      gib: { name: "Gibibyte", symbol: "GiB" },
      tib: { name: "Tebibyte", symbol: "TiB" },
      pib: { name: "Pebibyte", symbol: "PiB" },
   },
}

/**
 * Headings for the dimensions whose units are grouped, keyed by the
 * `group` on each `UnitDefinition`. Only data storage groups today, so
 * this is deliberately partial rather than a full `Record<DimensionId, …>`
 * of mostly-empty objects.
 */
const UNIT_GROUP_COPY: Partial<Record<DimensionId, Record<string, string>>> = {
   data: {
      base: "Bits and bytes",
      decimal: "Decimal — powers of 1,000",
      binary: "Binary — powers of 1,024",
   },
}

/// Answers to the questions people actually search alongside these tools.
/// Rendered on the page and emitted as FAQPage structured data, so they
/// have to read as genuine answers rather than keyword filler.

const FAQ_COPY: Record<ToolKey, FaqEntry[]> = {
   weightConverter: [
      {
         question: "How many pounds are in a kilogram?",
         answer: "One kilogram is 2.2046226 pounds. The relationship is exact in the other direction: a pound is defined as exactly 453.59237 grams.",
      },
      {
         question: "What is the difference between a US ton and a tonne?",
         answer: "A tonne (metric ton) is 1,000 kilograms, about 2,204.6 pounds. A US short ton is 2,000 pounds, about 907.2 kilograms. This tool uses the US short ton.",
      },
      {
         question: "How much is a stone in kilograms?",
         answer: "One stone is 14 pounds, or about 6.35 kilograms. It is still commonly used for body weight in the UK and Ireland.",
      },
   ],
   heightConverter: [
      {
         question: "What is 5 feet 11 inches in centimetres?",
         answer: "5 feet 11 inches is 180.34 cm. An inch is defined as exactly 2.54 cm, so the conversion is exact rather than approximate.",
      },
      {
         question: "How do I convert centimetres to feet and inches?",
         answer: "Divide the centimetres by 2.54 to get total inches, then divide by 12 for whole feet and keep the remainder as inches. This tool does both steps for you.",
      },
      {
         question: "Why does my height show as 6 ft 0 in rather than 5 ft 12 in?",
         answer: "Twelve inches is a foot, so the tool carries the rounded inches into the feet column. A reading of 5 ft 12 in would never be written that way.",
      },
   ],
   temperatureConverter: [
      {
         question: "How do I convert Celsius to Fahrenheit?",
         answer: "Multiply by 9/5 and add 32. Going the other way, subtract 32 then multiply by 5/9. Unlike weights, temperature scales have an offset as well as a ratio.",
      },
      {
         question: "At what temperature do Celsius and Fahrenheit meet?",
         answer: "At −40 degrees. It is the only point where the two scales read the same number, because their offsets and ratios cancel exactly there.",
      },
      {
         question: "What is absolute zero?",
         answer: "Absolute zero is 0 K, equal to −273.15 °C or −459.67 °F. It is the lowest temperature possible, so kelvin values are never negative.",
      },
   ],
   speedConverter: [
      {
         question: "How many miles per hour is 100 km/h?",
         answer: "100 km/h is 62.137119 mph. The conversion is exact rather than approximate: a mile is 63,360 inches, and an inch is defined as exactly 2.54 cm.",
      },
      {
         question: "What is a knot, and why is it not a mile per hour?",
         answer: "A knot is one nautical mile per hour. A nautical mile is exactly 1,852 metres — longer than a land mile — so one knot is about 1.151 mph.",
      },
      {
         question: "How do I convert metres per second to km/h?",
         answer: "Multiply by 3.6. A speed of one metre per second covers 3,600 metres in an hour, which is 3.6 kilometres. Divide by 3.6 to go back the other way.",
      },
   ],
   volumeConverter: [
      {
         question: "Is a US gallon the same as an imperial gallon?",
         answer: "No. A US gallon is 3.785 litres; an imperial gallon is exactly 4.54609 litres, about 20% larger. Both are listed separately here so neither is assumed.",
      },
      {
         question: "How many fluid ounces are in a pint?",
         answer: "A US pint is 16 US fluid ounces; an imperial pint is 20 imperial fluid ounces. The two pints differ by roughly a fifth, so the figures do not interchange.",
      },
      {
         question: "How many millilitres are in a cup?",
         answer: "A US cup is 236.59 ml. Recipes written elsewhere often mean a 250 ml metric cup instead, so it is worth checking which one a recipe assumes before scaling it.",
      },
   ],
   areaConverter: [
      {
         question: "How many square feet are in a square metre?",
         answer: "One square metre is 10.76391 square feet. The ratio is the length conversion squared: a metre is 3.2808399 feet, and 3.2808399 × 3.2808399 is 10.76391.",
      },
      {
         question: "How big is an acre?",
         answer: "An acre is 4,840 square yards, or 4,046.86 square metres. A hectare is 10,000 square metres, so one hectare is about 2.471 acres.",
      },
      {
         question: "Why can I not reuse a length conversion for an area?",
         answer: "Because area conversions are the length factor squared. A foot is 0.3048 metres, so a square foot is 0.3048², which is 0.09290304 square metres — not 0.3048.",
      },
   ],
   timeConverter: [
      {
         question: "Why is there no month?",
         answer: "Months run from 28 to 31 days, so a month has no fixed length. Converting one would mean averaging and then presenting the guess as exact, so this tool stops at weeks and years.",
      },
      {
         question: "How many seconds are in a day?",
         answer: "86,400 — sixty seconds in a minute, sixty minutes in an hour and twenty-four hours in a day. A week is seven of those, or 604,800 seconds.",
      },
      {
         question: "How long is the year used here?",
         answer: "365 days, which is 31,536,000 seconds. Leap years and the 365.2425-day calendar year are deliberately not applied, so the figure stays predictable.",
      },
   ],
   dataStorageConverter: [
      {
         question: "Why does my 1 TB drive show as 931 GB?",
         answer: "The drive really is 1 TB — a trillion bytes. Your operating system divides by 1,024 rather than 1,000 but still writes “GB”, and a trillion bytes is 931.32 GiB. Nothing is missing.",
      },
      {
         question: "What is the difference between KB and KiB?",
         answer: "A kilobyte is 1,000 bytes; a kibibyte is 1,024. The gap compounds at every step, so a terabyte and a tebibyte are about 10% apart rather than 2.4%.",
      },
      {
         question: "How many bits are in a byte?",
         answer: "Eight. Storage is quoted in bytes and network speed in bits, which is why a 100 Mbps connection downloads at about 12.5 MB/s rather than 100.",
      },
   ],
   caseConverter: [
      {
         question: "What is the difference between camelCase and PascalCase?",
         answer: "Both join the words with no separator. camelCase leaves the first word lowercase, as in myVariableName; PascalCase capitalises it too, as in MyVariableName.",
      },
      {
         question: "Why does Title Case capitalise short words like “of” and “the”?",
         answer: "Because style guides disagree about which words stay lowercase, and the answer changes with a word’s position in the title. Capitalising every word is at least predictable.",
      },
      {
         question: "Why did “dr. smith” become “Dr. Smith” in sentence case?",
         answer: "A full stop and a space look identical whether they end a sentence or an abbreviation, and telling them apart needs a dictionary. Decimals are safe: the stop in 3.50 is followed by a digit.",
      },
   ],
   percentageCalculator: [
      {
         question: "How do I work out a percentage of a number?",
         answer: "Multiply the number by the percentage and divide by 100. So 20% of 80 is 80 × 20 ÷ 100, which is 16. The first mode above does exactly that.",
      },
      {
         question: "How do I calculate a percentage increase?",
         answer: "Subtract the old value from the new one, divide by the old value, then multiply by 100. From 80 to 100 is (100 − 80) ÷ 80 × 100, which is a 25% increase.",
      },
      {
         question: "Why doesn't a 20% fall cancel a 20% rise?",
         answer: "Because the second percentage applies to a bigger number. 80 plus 20% is 96, and 96 minus 20% is 76.8 rather than 80. Undoing a 20% rise takes a fall of 16.67%.",
      },
      {
         question: "What is the difference between percent and percentage points?",
         answer: "A rate moving from 20% to 25% has risen five percentage points, but that is a percentage increase of 25%. Interest and unemployment figures are quoted in points to avoid the ambiguity.",
      },
   ],
   ageCalculator: [
      {
         question: "How do I calculate my age from my date of birth?",
         answer: "Count the whole years to your last birthday, then the whole months from there, then the days left over. Dividing the total days by 365 is close but drifts by a day per leap year.",
      },
      {
         question: "When is the birthday of someone born on 29 February?",
         answer: "There is no 29 February in three years out of four, so this tool turns their age over on the 28th. Some jurisdictions use 1 March instead; the two agree in leap years.",
      },
      {
         question: "How many days old am I?",
         answer: "The total days figure above counts every calendar day between the two dates, leap days included. A year averages 365.2425 days, so 10,000 days is a little over 27 years.",
      },
      {
         question: "Why is a month not always the same number of days?",
         answer: "Months run from 28 to 31 days, so this counts a month as the same date in the next month. From 31 January that lands on 28 or 29 February, because there is no 31st to land on.",
      },
   ],
   wordCounter: [
      {
         question: "Is my text uploaded anywhere?",
         answer: "No. The counting runs entirely in your browser. Nothing is sent to a server, stored, or logged — you can disconnect from the internet and it still works.",
      },
      {
         question: "How is the word count calculated?",
         answer: "Text is split using the Unicode segmentation rules, so it counts correctly in languages such as Chinese and Japanese that do not put spaces between words.",
      },
      {
         question: "How is reading time estimated?",
         answer: "Reading time assumes 238 words per minute, the average adult silent-reading speed, and speaking time a slower 150 words per minute. Both are adjustable — open the speed settings above the results to set your own pace, and it is remembered on this device.",
      },
   ],
   typingTest: [
      {
         question: "How is words per minute calculated?",
         answer: "Your correct characters are divided by five, then by the minutes elapsed. Five characters has counted as one word since typewriter-era standards, so that short words are not worth as much as long ones.",
      },
      {
         question: "What is a good typing speed?",
         answer: "Around 40 wpm is average for an adult. Sustained 65–80 wpm is a proficient touch typist, and above 100 wpm is genuinely fast. Accuracy matters more than raw speed — errors cost you more time than they save.",
      },
      {
         question: "What is the difference between wpm and raw wpm?",
         answer: "Raw wpm counts every character you typed; wpm counts only the correct ones. The gap between them is what your mistakes cost you, so closing it is usually worth more than typing faster.",
      },
      {
         question: "Can I practise on my own vocabulary?",
         answer: "Yes. Pick a topic — common English, programming, science and nature, business or everyday life — and a difficulty, which sets how long and how rare the words are. You can also mix in numbers and punctuation, and hard capitalises some words too.",
      },
      {
         question: "Is my typing recorded or uploaded?",
         answer: "No. The test runs entirely in your browser and nothing is sent to a server. Your settings and personal best are kept in your browser's own local storage on this device, and clearing your site data removes them.",
      },
   ],
   base64Encoder: [
      {
         question: "What is base64 used for?",
         answer: "It writes arbitrary bytes using 64 printable characters, so binary survives channels that only carry text — email attachments, data URIs, JSON fields. The encoded form is about a third larger.",
      },
      {
         question: "Is base64 a form of encryption?",
         answer: "No. It is an encoding, not a cipher: anyone can decode it without a key, and this page does it in one paste. Never use base64 to hide a password, a token or anything else secret.",
      },
      {
         question: "Why do accents and emoji break in other base64 tools?",
         answer: "Base64 encodes bytes, not characters, so text has to become UTF-8 first. Tools built on the browser's btoa alone fail above Latin-1 — btoa(\"café\") throws. This one encodes as UTF-8.",
      },
      {
         question: "What is URL-safe base64?",
         answer: "Plus and slash both have meaning inside a URL, so RFC 4648 defines an alternative using minus and underscore instead. JWTs use it, usually with the trailing equals padding removed.",
      },
   ],
   bmiCalculator: [
      {
         question: "How is BMI calculated?",
         answer: "Weight in kilograms divided by height in metres squared. Someone 1.75 m and 70 kg has a BMI of 22.9. Imperial entries are converted first, so both unit systems give the same figure.",
      },
      {
         question: "What do the categories mean?",
         answer: "Below 18.5 is underweight, 18.5 to 25 is the healthy band, 25 to 30 is overweight, and 30 or above is obese. These are the WHO figures for adults.",
      },
      {
         question: "Why does BMI call a muscular person overweight?",
         answer: "Because it uses only height and weight, and cannot tell muscle from fat. Muscle is denser, so athletes often read as overweight while carrying very little fat.",
      },
      /// The question is unchanged and must stay that way — `useToolPage`
      /// emits these as FAQPage structured data and the questions are
      /// stable in search results. Only the answer moved, because the
      /// population selector made its last sentence untrue.
      {
         question: "Does BMI work for everyone?",
         answer: "No. It does not apply to children or teenagers, who need age and sex percentiles, nor during pregnancy. The cut-offs also differ by population: basic mode uses the standard WHO adult figures, and advanced mode can switch to the lower Asian action points of 23 and 27.5, or the Indian consensus figures of 23 and 25.",
      },
      {
         question: "How is body fat percentage estimated?",
         answer: "Two ways, shown side by side. The US Navy method uses your height, waist and neck — plus hips for women — and is the better of the two because it measures where fat actually sits. The Deurenberg method needs no tape measure but is calculated from your BMI and age, so it inherits BMI's inability to tell muscle from fat. They will disagree, and that gap is informative.",
      },
      {
         question: "How accurate are these body fat and calorie figures?",
         answer: "They are estimates from formulas fitted on particular groups of people, not measurements of you. A tape-measure body fat estimate is typically within 3 to 5 percentage points of a DEXA scan, and where you place the tape is the largest source of error. Calorie needs vary by 10 percent or more between people of identical size.",
      },
   ],
   loremIpsumGenerator: [
      {
         question: "What is lorem ipsum?",
         answer: "Scrambled Latin, taken from a first-century BC text by Cicero, used as placeholder copy since the 1500s. It reads as text without being readable, so it shows how a layout looks without anyone stopping to read it.",
      },
      {
         question: "Why not just type “text text text”?",
         answer: "Repeated words give an unrealistic rhythm: the word lengths and line breaks are wrong, so the block looks nothing like real copy. Lorem ipsum has roughly the word-length distribution of English prose.",
      },
      {
         question: "Is the text the same every time?",
         answer: "No. Each press of Generate produces a different passage. The first one you see on loading the page is fixed, so the text is there before any script runs.",
      },
   ],
   uuidGenerator: [
      {
         question: "What is a version 4 UUID?",
         answer: "A 128-bit identifier with 122 of those bits taken at random; the other six mark the version and variant. Version 4 is the random one, as opposed to versions built from a timestamp or a MAC address.",
      },
      {
         question: "Can two of these ever collide?",
         answer: "In practice, no. There are 2^122 possible values, so you would need to generate about a billion a second for 85 years to reach a one-in-a-billion chance of a single repeat.",
      },
      {
         question: "Are these generated on a server?",
         answer: "No. They come from your browser's cryptographic random number generator, the same source used for encryption keys, and are never transmitted. That is also why the box is empty until the page finishes loading.",
      },
   ],
   passwordGenerator: [
      {
         question: "Are these passwords safe to use?",
         answer: "Yes. They come from your browser's cryptographic random number generator, the same source used for encryption keys — not from a predictable shortcut.",
      },
      {
         question: "Does the password ever leave my browser?",
         answer: "No. It is generated on your device and never sent anywhere. Nothing is stored, so reloading the page discards it completely.",
      },
      {
         question: "What does the entropy figure mean?",
         answer: "Entropy in bits measures how much guessing a brute-force attack faces. Each extra bit doubles that work. Aim for 60 bits or more, and 120+ for anything critical.",
      },
   ],
}

export const COPY = {
   site: {
      name: "Metrics Adda",
      tagline: "Fast, free converters and text tools.",
   },
   nav: {
      home: "Home",
      label: "Tools",
      menu: "Menu",
      menuHeading: "Tools",
      close: "Close menu",
      /// The header nav's top level. A group holding a single tool is
      /// rendered as a direct link to that tool instead, so these two read
      /// as category names rather than as one-item folders — but they are
      /// all defined, because the moment a second health or security tool
      /// lands the nav promotes the group to a dropdown on its own.
      groups: {
         converters: "Converters",
         calculators: "Calculators",
         text: "Text",
         generators: "Generators",
         health: "Health",
         security: "Security",
      } satisfies Record<ToolGroup, string>,
   },
   theme: {
      legend: "Colour theme",
      system: "System",
      light: "Light",
      dark: "Dark",
   },
   footer: {
      about: "About",
      contact: "Contact",
      privacy: "Privacy",
      /// Names the footer's link group for screen readers — a second <nav>
      /// on the page is ambiguous without one.
      navLabel: "Footer",
      rights: "All rights reserved.",
   },
   /// The install button in the footer. Only ever rendered on a browser
   /// that has offered an install, so the copy can state it plainly rather
   /// than hedging about whether it will work.
   install: {
      action: "Install app",
      /// The reason to bother, in two words — the tools are identical
      /// either way, so offline is the whole of the pitch. Attached to the
      /// button with `aria-describedby` rather than folded into an
      /// `aria-label`: an accessible name that does not contain the visible
      /// text fails WCAG 2.5.3 (Label in Name), which axe-core gates on.
      hint: "Works offline",
   },
   /// The label above the ad unit. Google's programme policies require an
   /// ad to be distinguishable from the content around it.
   ads: {
      label: "Advertisement",
   },
   common: {
      copy: "Copy",
      copied: "Copied",
      copyFailed: "Press Ctrl+C to copy",
      swap: "Swap units",
      clear: "Clear",
      save: "Save",
      cancel: "Cancel",
      relatedHeading: "Other tools",
      faqHeading: "Common questions",
   },
   /// The error page. Kept deliberately free of the requested path: Nuxt's
   /// built-in page interpolates it into the <title>, which both looks
   /// broken and puts arbitrary text from the URL into the browser tab.
   error: {
      notFound: {
         code: "404",
         heading: "That page doesn't exist",
         lede: "The link may be out of date, or the address may have a typo in it. Every tool is listed below.",
      },
      unexpected: {
         code: "500",
         heading: "Something went wrong",
         lede: "That's on us, not on you. Try again in a moment, or pick a tool below.",
      },
      home: "Back to all tools",
      toolsHeading: "Jump to a tool",
   },
   home: {
      // `{count}` is filled in from `TOOLS.length` on the page, so the
      // number can never drift out of date when a tool is added.
      eyebrow: "{count} tools, no sign-up",
      // The headline is split so one phrase can carry the brand gradient
      // while the rest stays solid — see `.hero__accent`.
      headingLead: "Everyday tools that are",
      headingAccent: "instant and exact",
      heading: "Everyday tools that are instant and exact",
      tagline: "Converters for weight, height, temperature, speed, volume, area, time and data, plus a word counter, a case converter, a typing speed test, a BMI calculator, and generators for passwords, UUIDs and placeholder text. Nothing to install, and nothing you type ever leaves your browser.",
      toolsHeading: "All tools",
   },
   /// The privacy policy. Kept here with the rest of the copy rather than
   /// in the page component so the wording is reviewable in one place.
   ///
   /// The advertising-cookie disclosures are PARKED, not deleted — commented
   /// out below in step with `<AdSlot />` in `layouts/default.vue`. A policy
   /// that describes cookies the site does not set is not a harmless
   /// leftover: Play reads it against the Data safety and ads declarations,
   /// where this app is declared ad-free. Restore both together or neither.
   privacy: {
      heading: "Privacy policy",
      lede: "Metrics Adda is a set of small browser tools. The short version: what you type into them stays on your device, and the only data anyone collects here is anonymous traffic measurement.",
      updated: "Last updated 21 August 2026",
      sections: [
         {
            heading: "What the tools do with your input",
            body: [
               "Nothing leaves your browser. Every converter, the word counter, the typing speed test and the password generator run entirely in client-side JavaScript. The values you type are never sent to a server, never written to a database, and never logged — the pages keep working with the network disconnected.",
               "What you type is never stored between visits. Three preferences are, all of them in your browser's own local storage: your light or dark theme choice, so the site does not flash the wrong colours on your next visit; the reading and speaking speeds you set on the word counter; and your best score on the typing speed test. None of them leaves your device, and clearing your site data removes them.",
            ],
         },
         // PARKED with `<AdSlot />` — restore both together.
         //          {
         //             heading: "Advertising cookies",
         //             body: [
         //                "This site shows ads served by Google AdSense. Google and its partners use cookies and similar technologies to serve and measure those ads, including on the basis of your previous visits to this and other websites.",
         //                "Google's use of advertising cookies enables it and its partners to serve ads to you based on your visit to this site and other sites on the internet. You can opt out of personalised advertising at any time in Google's Ads Settings, and you can opt out of third-party vendors' use of cookies for personalised advertising at aboutads.info.",
         //                "Visitors in the European Economic Area and the United Kingdom are shown a consent message before any personalised advertising cookie is set, and can change that choice at any time.",
         //             ],
         //             links: [
         //                { label: "Google Ads Settings", href: "https://www.google.com/settings/ads" },
         //                { label: "How Google uses data from sites that use its services", href: "https://policies.google.com/technologies/partner-sites" },
         //                { label: "aboutads.info opt-out", href: "https://www.aboutads.info/choices/" },
         //             ],
         //          },
         {
            heading: "Traffic measurement",
            body: [
               "The site uses Vercel Analytics and Vercel Speed Insights to count page views and measure loading performance. Both are cookie-free and record no identifier that could be traced back to an individual — they report which pages were viewed and how quickly they rendered, nothing more.",
            ],
         },
         {
            heading: "Data we hold",
            body: [
               "None. There are no accounts on this site, no sign-up form, and no newsletter. If you email the address below, we hold that email in order to reply to it and for no other purpose.",
            ],
         },
         {
            heading: "Children",
            body: [
               "The site is a general-audience utility and is not directed at children under 13. We do not knowingly collect anything from them — and, as above, we do not knowingly collect anything from anyone.",
            ],
         },
         {
            heading: "Changes to this policy",
            body: [
               "If this policy changes in a way that affects what is collected, the date at the top of this page changes with it. There is no mailing list to notify, so that date is the record.",
            ],
         },
      ] as PolicySection[],
      contactHeading: "Questions",
      contactBody: "Anything about this policy, or about the site generally:",
   },
   /// The about page. Google's own pre-review checklist names an "About us"
   /// page as expected of a site carrying AdSense, and a site that is
   /// nothing but calculators is exactly the profile its reviewers read as
   /// low-value — so this page states who runs it and what it is for.
   ///
   /// `{count}` is filled in from `TOOLS.length` on the page, so the number
   /// cannot drift out of date when a tool is added.
   about: {
      heading: "About Metrics Adda",
      lede: "Metrics Adda is a small collection of everyday converters and text tools. Every one of them runs in your browser, loads in well under a second, and asks nothing of you before it works.",
      sections: [
         {
            heading: "Why it exists",
            body: [
               "Converting kilograms to pounds should take one page load. Most of the results you get for that search do not: they carry an interstitial before the answer, a cookie wall over it, and a form asking for an email address beside it. The arithmetic involved is trivial and none of that is necessary to do it.",
               "Metrics Adda is the version of those pages that skips all of it. There are {count} tools, each doing one thing, each reachable in a single click from the front page.",
            ],
         },
         {
            heading: "How the tools work",
            body: [
               "Everything is computed on your own device in client-side JavaScript. The values you type are never sent to a server, never written to a database and never logged — which is not a policy promise so much as an architectural fact: once a page has loaded, you can disconnect from the network and every tool still works.",
               "That also means there is nothing to sign up for. No accounts exist on this site, so there is no password to forget and no profile to delete.",
            ],
         },
         {
            heading: "Who makes it",
            body: [
               "Metrics Adda is built and maintained by Mouli Bheemaneti, an independent software developer. It is a personal project rather than a company, which is why there is one email address at the bottom of this page rather than a support desk — mail sent there reaches the person who wrote the code.",
            ],
         },
         {
            heading: "How it pays for itself",
            body: [
               "It does not, particularly. The site carries no advertising, sells nothing, and has no accounts to charge for. It is a personal project on cheap hosting, and a set of static pages costs very little to serve.",
               "If that ever changes and the site carries an ad, it will be one unit in one fixed position — never a pop-up or an interstitial — and the privacy policy will say so before it appears.",
            ],
         },
         {
            heading: "Accuracy",
            body: [
               "Conversion factors are the exact internationally defined ones wherever an exact definition exists — one inch is 25.4 millimetres by definition, not by approximation — and results are rounded only for display. The tools are covered by an automated test suite that runs on every change.",
               "They are still general-purpose utilities, though, and nothing here is offered as medical, engineering, legal or financial advice. If a result is going into something that matters, check it against a second source. If you find one that is wrong, please tell us — that is the most useful mail this site receives.",
            ],
         },
      ],
      contactHeading: "Get in touch",
      contactBody: "Corrections, requests for a tool, or anything else:",
   },
   /// The contact page. A `mailto:` in the footer is not what Google's
   /// checklist means by a "Contact us" page, and a reachable page is also
   /// the thing a reader looks for when a converter gives a wrong answer.
   contact: {
      heading: "Contact",
      lede: "One address, read by the person who builds the site. There is no ticket queue behind it and no auto-reply — just mail.",
      emailHeading: "Email",
      emailBody: "Write to:",
      responseNote: "Expect a reply within a few days. This is a personal project rather than a staffed product, so it is not instant, but every message is read.",
      sections: [
         {
            heading: "Especially worth writing about",
            body: [
               "A wrong result. Conversion factors and rounding are covered by tests, but a tool can still be wrong in a way no test anticipated. If you tell us what you entered, what you got and what you expected, it can usually be fixed the same week.",
               "A tool that is missing. The list grows based on what people ask for. If you converted something today by opening a search engine instead of this site, that is worth knowing.",
               "Something that does not work on your device or with your screen reader. Accessibility problems are treated as bugs, not as requests.",
            ],
         },
         {
            heading: "Privacy",
            body: [],
            link: {
               before: "Questions about what the site stores, or what it measures, are answered in full by the ",
               label: "privacy policy",
               to: "/privacy-policy",
               after: ". If something there is unclear or does not match what you are seeing, write and say so.",
            },
         },
      ] as ContactSection[],
   },
   converter: {
      fromLabel: "From",
      toLabel: "To",
      valueLabel: "Value",
      resultLabel: "Result",
      allUnitsHeading: "All units",
      unitColumn: "Unit",
      valueColumn: "Value",
      invalid: "Enter a number to convert.",
      feetLabel: "Feet",
      inchesLabel: "Inches",
      centimetresLabel: "Centimetres",
   },
   stats: {
      words: "Words",
      characters: "Characters",
      /// The qualifier is split out rather than being part of the label so
      /// the tile can break the line itself. Left inside the string it wrapped
      /// wherever the 150px grid track ran out — "Characters (no" above
      /// "spaces)" — which reads as a typo rather than as a qualifier.
      noSpaces: "(no spaces)",
      sentences: "Sentences",
      paragraphs: "Paragraphs",
      lines: "Lines",
      readingTime: "Reading time",
      speakingTime: "Speaking time",
      inputLabel: "Your text",
      placeholder: "Paste or type your text here…",
      /// The speed settings. No words-per-minute figures live in these
      /// strings: the template interpolates the constants themselves, the
      /// same way `password.lengthLabel` holds only the word.
      settingsLabel: "Speed settings",
      settingsHeading: "Reading and speaking speed",
      settingsHint: "Changes the two time estimates below. Saved on this device only.",
      readingSpeedLabel: "Reading speed",
      speakingSpeedLabel: "Speaking speed",
      useRecommended: "Use the recommended speeds",
      wordsPerMinute: "wpm",
   },
   base64: {
      directionLabel: "Direction",
      directions: {
         encode: "Encode to base64",
         decode: "Decode from base64",
      },
      /// Both fields are named for what they hold in the current
      /// direction. "Input" and "Output" would be accurate and would make
      /// the reader work out which end they are at.
      inputLabels: {
         encode: "Text",
         decode: "Base64",
      },
      outputLabels: {
         encode: "Base64",
         decode: "Text",
      },
      alphabetLegend: "Alphabet",
      alphabets: {
         standard: "Standard — + and /",
         urlSafe: "URL-safe — - and _",
      } satisfies Record<Base64Alphabet, string>,
      padding: "Include the = padding",
      /// Shown only while encoding. Decoding accepts either alphabet and
      /// any amount of padding without being told, so the controls would
      /// be inert there — and an inert control reads as a broken one.
      optionsNote: "Decoding accepts either alphabet, padded or not.",
      useResult: "Use the result as the input",
      empty: "Paste something to convert it.",
      /// Two failures with two different fixes, so two messages. Telling
      /// someone their valid base64 is "invalid" when it is simply a PNG
      /// sends them to check the wrong thing.
      faults: {
         notBase64: "That is not base64 — it has characters outside the alphabet, or it has been cut short.",
         notText: "That is valid base64, but the bytes inside it are not UTF-8 text. It is probably a file rather than a message.",
      } satisfies Record<Base64Fault, string>,
   },
   age: {
      birthLabel: "Date of birth",
      asOfLabel: "Age at this date",
      asOfHint: "Today by default. Change it to work out an age on any other date.",
      /// Singular and plural as separate strings rather than an "s"
      /// appended in the template — the template has no business knowing
      /// how English forms a plural, and the moment one unit is irregular
      /// the trick breaks silently.
      units: {
         year: "year",
         years: "years",
         month: "month",
         months: "months",
         day: "day",
         days: "days",
         week: "week",
         weeks: "weeks",
      },
      totalMonthsLabel: "Months",
      totalWeeksLabel: "Weeks",
      totalDaysLabel: "Days",
      bornOnLabel: "Born on a",
      nextBirthdayLabel: "Next birthday",
      /// The day itself, rather than "0 days" — which is technically true
      /// and the wrong thing to tell someone on their birthday.
      birthdayToday: "Today",
      turning: "Turning {age} on {date}",
      turningToday: "Turning {age} today",
      empty: "Enter a date of birth to see the age.",
      future: "That date of birth is after the date you are measuring to, so there is no age to report yet.",
      weekdays: {
         sunday: "Sunday",
         monday: "Monday",
         tuesday: "Tuesday",
         wednesday: "Wednesday",
         thursday: "Thursday",
         friday: "Friday",
         saturday: "Saturday",
      } satisfies Record<Weekday, string>,
      /// Dates are written out from these rather than through
      /// `Intl.DateTimeFormat`, so the wording stays in this file with
      /// every other user-facing string, and the order stays the British
      /// one the rest of the copy is written in.
      months: [
         "January",
         "February",
         "March",
         "April",
         "May",
         "June",
         "July",
         "August",
         "September",
         "October",
         "November",
         "December",
      ],
   },
   percentage: {
      modeLabel: "What do you want to work out?",
      modes: {
         of: "Percentage of a number",
         ratio: "One number as a percentage",
         change: "Change between two numbers",
         adjust: "Add or take off a percentage",
      } satisfies Record<PercentageMode, string>,
      /// Both fields are relabelled per mode rather than swapped out, so
      /// the two numbers stay put when the question changes — someone
      /// checking two of the four answers against the same pair does not
      /// have to retype them.
      firstLabels: {
         of: "Percentage",
         ratio: "This number",
         change: "From",
         adjust: "Number",
      } satisfies Record<PercentageMode, string>,
      secondLabels: {
         of: "Of this number",
         ratio: "Out of",
         change: "To",
         adjust: "Percentage",
      } satisfies Record<PercentageMode, string>,
      rows: {
         of: "Result",
         ratio: "Result",
         change: "Change",
         increased: "Increased",
         decreased: "Decreased",
      } satisfies Record<PercentageReadout["id"], string>,
      /// `{a}` and `{b}` are the two fields as typed, `{result}` the
      /// answer. Written as whole sentences because they are the part a
      /// reader checks their own working against — and the part a crawler
      /// reads as an answer rather than as a bare number.
      captions: {
         of: "{a}% of {b} is {result}.",
         ratio: "{a} is {result}% of {b}.",
         change: "From {a} to {b} is a change of {result}%.",
         increased: "{a} plus {b}% is {result}.",
         decreased: "{a} minus {b}% is {result}.",
      } satisfies Record<PercentageReadout["id"], string>,
      directions: {
         increase: "Increase",
         decrease: "Decrease",
         unchanged: "No change",
      },
      empty: "Enter both numbers to see the answer.",
      /// Two separate sentences rather than one "undefined" line, because
      /// the two zeroes fail for different reasons and a reader who hit
      /// one wants to know which.
      undefinedRatio: "Nothing is a percentage of zero — every answer would be as good as any other.",
      undefinedChange: "Change from zero has no percentage: any rise off a zero base is infinite, however small it looks.",
   },
   bmi: {
      /// Two versions of the same tool, named on screen rather than hidden
      /// behind a "show more" disclosure — a disclosure names only one
      /// state, and the point here is that there are two.
      modeLabel: "Calculator",
      basic: "Basic",
      advanced: "Advanced",
      systemLabel: "Units",
      metric: "Metric",
      imperial: "Imperial",
      heightLabel: "Height",
      weightLabel: "Weight",
      centimetres: "cm",
      kilograms: "kg",
      feet: "ft",
      inches: "in",
      pounds: "lb",
      resultLabel: "Your BMI",
      categoryLabel: "Category",
      rangeLabel: "Healthy weight for this height",
      empty: "Enter a height and a weight to see your BMI.",
      /// Shown under every result, not tucked behind a link. BMI is a
      /// population screening figure being read by one person about
      /// themselves, and that gap is the thing most worth saying.
      disclaimer: "BMI is a screening figure, not a diagnosis, and it cannot tell muscle from fat. Talk to a doctor about what it means for you.",
      categories: {
         underweight: "Underweight",
         /// "Healthy weight" rather than "Normal": the band is the same,
         /// but the word does not imply everything outside it is abnormal.
         normal: "Healthy weight",
         overweight: "Overweight",
         obese: "Obese",
      } satisfies Record<BmiCategory, string>,
   },
   /// The advanced calculator. A sibling block rather than more keys on
   /// `bmi`, mirroring the component split: `BmiCalculatorPanel` owns the
   /// division, `BodyCompositionPanel` owns the estimates. Unit symbols
   /// are deliberately not restated here — it reads `COPY.bmi.kilograms`
   /// and friends, so there is one spelling of "kg" on the site.
   body: {
      /// Not "Body composition" — that is one of the result groups below,
      /// and a section heading identical to a group inside it reads as a
      /// duplicate rather than a container.
      heading: "Beyond BMI",
      lede: "These need a little more about you. Everything still runs in your browser and nothing is sent anywhere.",

      sexLabel: "Sex",
      sexes: {
         female: "Female",
         male: "Male",
      } satisfies Record<Sex, string>,
      /// A field that will otherwise read as a demand. The honest reason
      /// is short and worth the two lines it takes.
      sexNote: "Each formula below was fitted separately on male and female groups, so it needs this to run. There is no third set of coefficients to offer.",
      sexPrompt: "Choose one to see body fat, lean mass and energy figures.",

      ageLabel: "Age",
      years: "years",
      adultsOnly: "These formulas were built for adults. Enter an age of 18 or over — body fat in children and teenagers is read from age and sex percentile charts instead, which this tool does not do.",

      populationLabel: "Reference population",
      populations: {
         who: "WHO — general",
         asian: "WHO — Asian",
         india: "India — 2009 consensus",
      } satisfies Record<BmiPopulation, string>,
      populationNote: "South Asian bodies carry more visceral fat and develop diabetes and heart disease at lower BMIs than the European groups the WHO figures were drawn from, so the same reading is read differently.",
      populationApplied: "Categories and the healthy range use",

      measurementsHeading: "Tape measurements",
      measurementsHint: "Optional. Measure against bare skin with the tape snug but not tight, and breathe out first.",
      waistLabel: "Waist",
      waistHint: "At the narrowest point, usually just above the navel.",
      neckLabel: "Neck",
      neckHint: "Just below the larynx, sloping slightly down at the front.",
      hipLabel: "Hips",
      hipHint: "At the widest point of the buttocks.",

      activityLabel: "Activity level",
      activities: {
         sedentary: "Sedentary — little or no exercise",
         light: "Light — exercise 1 to 3 days a week",
         moderate: "Moderate — exercise 3 to 5 days a week",
         active: "Active — exercise 6 to 7 days a week",
         veryActive: "Very active — hard exercise, or a physical job",
      } satisfies Record<ActivityLevel, string>,

      compositionHeading: "Body composition",
      shapeHeading: "Shape and risk",
      energyHeading: "Daily energy",
      indicesHeading: "Other indices",
      targetHeading: "Target weight",

      bodyFatNavyLabel: "Body fat",
      bodyFatNavyNote: "tape measurements",
      bodyFatDeurenbergLabel: "Body fat",
      bodyFatDeurenbergNote: "from BMI and age",
      leanMassLabel: "Lean body mass",
      fatMassLabel: "Fat mass",
      ffmiLabel: "Fat-free mass index",
      ffmiNormalisedLabel: "FFMI",
      ffmiNormalisedNote: "height-corrected",
      /// The payoff for the whole advanced mode, and the answer to a
      /// question the FAQ already raises.
      ffmiExplainer: "FFMI is the part BMI cannot see. It counts only lean mass, so a muscular reader whose BMI reads overweight will show a high FFMI and a low body fat percentage.",

      whtrLabel: "Waist to height",
      whtrNote: "healthy under 0.5",
      whrLabel: "Waist to hip",

      bmrLabel: "Resting energy",
      bmrMifflinNote: "Mifflin-St Jeor",
      bmrKatchNote: "Katch-McArdle, from lean mass",
      tdeeLabel: "Daily energy",
      kcalPerDay: "kcal/day",

      bmiPrimeLabel: "BMI Prime",
      bmiPrimeNote: "1.0 is the top of the healthy band",
      ponderalLabel: "Ponderal index",
      ponderalNote: "weight over height cubed",
      newBmiLabel: "New BMI",
      newBmiNote: "Trefethen's height correction",

      healthyRangeLabel: "Healthy BMI range",
      idealWeightHeading: "Ideal weight formulas",
      idealWeightNote: "Four published formulas, all written for drug dosing rather than health. They disagree by several kilograms for the same person, which is why they are shown together and below the range above.",
      idealWeights: {
         hamwi: "Hamwi (1964)",
         devine: "Devine (1974)",
         robinson: "Robinson (1983)",
         miller: "Miller (1983)",
      } satisfies Record<IdealWeightFormula, string>,
      formulaColumn: "Formula",
      weightColumn: "Weight",

      percent: "%",

      /// Every reason a figure can be missing, said out loud. A row that
      /// simply vanishes is the failure mode worth designing against.
      needsSex: "Choose a sex above to see these.",
      needsAge: "Enter an age to see these.",
      needsWaistNeck: "Add your waist and neck measurements to estimate body fat from your shape.",
      needsWaist: "Add your waist measurement to see waist-to-height ratio.",
      needsHip: "Add your hip measurement too — the female formula needs all three.",
      needsHipForWhr: "Add your hip measurement to see waist-to-hip ratio.",
      waistUnderNeck: "Your waist measurement needs to be larger than your neck. Check both — it is easy to read the wrong scale on a tape.",
      implausible: "Those measurements give a result outside the range this formula can speak to. Check the tape figures, and note that very lean or very large bodies fall outside what it was built on.",

      bodyFatCategories: {
         essential: "Essential fat",
         athlete: "Athletic",
         fitness: "Fitness",
         average: "Average",
         obese: "Obese",
      } satisfies Record<BodyFatCategory, string>,
      whtrCategories: {
         slim: "Slim",
         healthy: "Healthy",
         raised: "Raised",
         high: "High",
      } satisfies Record<WhtrCategory, string>,
      whrCategories: {
         healthy: "Healthy",
         raised: "Raised",
      } satisfies Record<WhrCategory, string>,

      /// Stronger than the BMI disclaimer above it, because these are
      /// regressions rather than a definition. In the card, not behind a
      /// link, for the same reason.
      disclaimer: "Every figure here is an estimate from a formula fitted on a particular group of people — not a measurement of you. Body fat from a tape measure is typically within 3 to 5 percentage points of a scan, and energy needs vary by 10 percent or more between people of the same size. None of this is medical advice or a diagnosis.",
   },
   /// Every case label is written *in* the case it names, so the list
   /// doubles as its own worked example and a reader can pick the one they
   /// want without reading a description of it.
   textCase: {
      inputLabel: "Your text",
      placeholder: "Paste or type your text here…",
      textHeading: "Text cases",
      identifierHeading: "Programming cases",
      /// Seeded into the box so the page renders a worked example rather
      /// than ten empty rows — the same reason the converters start at 1.
      sample: "the quick brown fox. jumps over the lazy dog!",
      names: {
         upper: "UPPER CASE",
         lower: "lower case",
         title: "Title Case",
         sentence: "Sentence case",
         alternating: "aLtErNaTiNg cAsE",
         camel: "camelCase",
         pascal: "PascalCase",
         snake: "snake_case",
         kebab: "kebab-case",
         constant: "CONSTANT_CASE",
      } satisfies Record<CaseId, string>,
   },
   /// The typing test. As with the speed settings above, no figures live in
   /// these strings — the template interpolates `TEST_DURATIONS` and the
   /// scores themselves.
   typing: {
      durationLegend: "Test length",
      topicLabel: "Words",
      topics: {
         common: "Common English",
         programming: "Programming",
         science: "Science & nature",
         business: "Business",
         everyday: "Everyday life",
      },
      difficultyLegend: "Difficulty",
      difficulties: {
         easy: "Easy",
         medium: "Medium",
         hard: "Hard",
      },
      mixLegend: "Mix in",
      numbers: "123",
      numbersName: "Numbers",
      punctuation: "!?",
      punctuationName: "Punctuation",
      seconds: "s",
      inputLabel: "Type the words shown above",
      start: "Start typing to begin",
      focusPrompt: "Click here or press any key to focus",
      restart: "Restart",
      tryAgain: "Try again",
      timeLeft: "Time left",
      wpm: "wpm",
      wpmLabel: "Words per minute",
      rawLabel: "Raw",
      accuracyLabel: "Accuracy",
      bestLabel: "Your best",
      newBest: "New personal best",
      noBest: "No best yet",
      resultsHeading: "Your result",
      /// Spoken-only strings. A screen reader renders "68 wpm" as "sixty-eight
      /// w p m", so anything that exists purely to be announced spells the
      /// unit out — the same reason `formatDurationSpoken` exists.
      startedAnnouncement: "Test started.",
      finishedAnnouncement: "Time up.",
      wordsPerMinuteSpoken: "words per minute",
      accuracySpoken: "accuracy",
   },
   lorem: {
      unitLabel: "Generate",
      units: {
         paragraphs: "Paragraphs",
         sentences: "Sentences",
         words: "Words",
      } satisfies Record<LoremUnit, string>,
      countLabel: "How many",
      startWithLorem: "Start with “Lorem ipsum dolor sit amet…”",
      generate: "Generate new text",
      outputLabel: "Placeholder text",
      wordCount: "Words",
   },
   uuid: {
      outputLabel: "Generated UUIDs",
      countLabel: "How many",
      generate: "Generate new UUIDs",
      formatLegend: "Format",
      hyphens: "Hyphens (8-4-4-4-12)",
      uppercase: "Uppercase",
      braces: "Braces {…}",
   },
   password: {
      outputLabel: "Generated password",
      lengthLabel: "Length",
      generate: "Generate new password",
      setsLegend: "Include",
      lowercase: "Lowercase (a–z)",
      uppercase: "Uppercase (A–Z)",
      digits: "Digits (0–9)",
      symbols: "Symbols (!@#$…)",
      excludeAmbiguous: "Exclude look-alike characters (0, O, 1, l, I)",
      entropyLabel: "Entropy",
      entropyUnit: "bits",
      strengthLabel: "Strength",
      weak: "Weak",
      fair: "Fair",
      strong: "Strong",
      excellent: "Excellent",
      noSets: "Select at least one character set.",
   },
   tools: TOOL_COPY,
   units: UNIT_COPY,
   unitGroups: UNIT_GROUP_COPY,
   faq: FAQ_COPY,
}
