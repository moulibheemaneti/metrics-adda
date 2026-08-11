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

import type { DimensionId } from "./units"

/** One key per tool. Drives the registry, the copy blocks and the SEO map. */
export type ToolKey
   = | "weightConverter"
     | "heightConverter"
     | "temperatureConverter"
     | "wordCounter"
     | "typingTest"
     | "passwordGenerator"

/** Pages that carry their own search metadata. */
export type PageKey = ToolKey | "home" | "privacy"

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
         "Free, fast unit converters for weight, height and temperature, plus a word counter, a typing speed test and a password generator. No sign-up needed.",
   },
   privacy: {
      title: "Privacy Policy",
      description:
         "How Metrics Adda handles your data: the tools run entirely in your browser and send nothing to a server. Cookies are used only for advertising.",
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
   wordCounter: {
      title: "Word & Character Counter",
      description:
         "Count words, characters, sentences, paragraphs and lines as you type, with reading and speaking time. Works with any language. Nothing is uploaded.",
   },
   typingTest: {
      title: "Typing Speed Test: Words Per Minute",
      description:
         "Test your typing speed in 15, 30, 60 or 120 seconds. See your words per minute, accuracy and personal best. Free, no sign-up, runs in your browser.",
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
   wordCounter: {
      name: "Word Counter",
      tagline: "Words, characters, sentences and reading time",
      heading: "Word and character counter",
      lede: "Paste or type your text to count words, characters, sentences, paragraphs and lines. Your text never leaves your browser.",
   },
   typingTest: {
      name: "Typing Speed Test",
      tagline: "Words per minute, accuracy and your best",
      heading: "Typing speed test",
      lede: "Type the words as they appear and see your speed in words per minute. Pick a length, a topic and a difficulty, mix in numbers and punctuation if you want them, and the clock starts with your first keystroke.",
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
   },
   theme: {
      legend: "Colour theme",
      system: "System",
      light: "Light",
      dark: "Dark",
   },
   footer: {
      contact: "Contact",
      privacy: "Privacy",
      /// Names the footer's link group for screen readers — a second <nav>
      /// on the page is ambiguous without one.
      navLabel: "Footer",
      rights: "All rights reserved.",
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
      eyebrow: "Six tools, no sign-up",
      // The headline is split so one phrase can carry the brand gradient
      // while the rest stays solid — see `.hero__accent`.
      headingLead: "Everyday converters that are",
      headingAccent: "instant and exact",
      heading: "Everyday converters that are instant and exact",
      tagline: "Weight, height and temperature converters, a word counter, a typing speed test and a password generator. Nothing to install, and nothing you type ever leaves your browser.",
      toolsHeading: "All tools",
   },
   /// The privacy policy. Kept here with the rest of the copy rather than
   /// in the page component so the wording is reviewable in one place —
   /// and because AdSense approval depends on what this actually says, the
   /// disclosures about advertising cookies below are not decorative.
   privacy: {
      heading: "Privacy policy",
      lede: "Metrics Adda is a set of small browser tools. The short version: what you type into them stays on your device, and the only data anyone collects here is what advertising and traffic measurement need.",
      updated: "Last updated 10 August 2026",
      sections: [
         {
            heading: "What the tools do with your input",
            body: [
               "Nothing leaves your browser. Every converter, the word counter, the typing speed test and the password generator run entirely in client-side JavaScript. The values you type are never sent to a server, never written to a database, and never logged — the pages keep working with the network disconnected.",
               "What you type is never stored between visits. Three preferences are, all of them in your browser's own local storage: your light or dark theme choice, so the site does not flash the wrong colours on your next visit; the reading and speaking speeds you set on the word counter; and your best score on the typing speed test. None of them leaves your device, and clearing your site data removes them.",
            ],
         },
         {
            heading: "Advertising cookies",
            body: [
               "This site shows ads served by Google AdSense. Google and its partners use cookies and similar technologies to serve and measure those ads, including on the basis of your previous visits to this and other websites.",
               "Google's use of advertising cookies enables it and its partners to serve ads to you based on your visit to this site and other sites on the internet. You can opt out of personalised advertising at any time in Google's Ads Settings, and you can opt out of third-party vendors' use of cookies for personalised advertising at aboutads.info.",
               "Visitors in the European Economic Area and the United Kingdom are shown a consent message before any personalised advertising cookie is set, and can change that choice at any time.",
            ],
            links: [
               { label: "Google Ads Settings", href: "https://www.google.com/settings/ads" },
               { label: "How Google uses data from sites that use its services", href: "https://policies.google.com/technologies/partner-sites" },
               { label: "aboutads.info opt-out", href: "https://www.aboutads.info/choices/" },
            ],
         },
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
      ],
      contactHeading: "Questions",
      contactBody: "Anything about this policy, or about the site generally:",
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
   faq: FAQ_COPY,
}
