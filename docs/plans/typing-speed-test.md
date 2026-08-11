# Typing speed test

## Context

The site had five browser-only utilities and no typing tool. A typing speed
test is a high-intent, high-volume search, and it fits the site's framing
exactly: it is pure client-side work, it needs no account, and nothing a
visitor types has any reason to leave their machine.

Shape agreed up front: a **bank of common English words** shuffled into an
endless stream, a **timed run** at one of four lengths, and a **personal best
per length** kept on the device. The clock starts on the first keystroke, not
on page load.

Shipped alongside it, and the reason the branch exists: the stat tiles wrapped
their parenthetical qualifiers mid-phrase — "Reading time (379 wpm)" broke as
`Reading time (379` / `wpm)`, and "Characters (no spaces)" as `Characters (no`
/ `spaces)`. Both now put the qualifier on its own line.

---

## Decisions

### The qualifier is a separate node, not a substring

`speedLabel()` concatenated the words-per-minute figure onto the label and
handed the result to one `<span>`. Inside a `minmax(150px, 1fr)` grid track
that wraps wherever the track runs out, which is never where the phrase wants
to break.

The label now carries an optional `note`, rendered into a `.stat__note` child
with `display: block`. That forces the break at the qualifier rather than
inside it, and it generalises: `charactersNoSpaces` uses the same mechanism,
so the copy string `"Characters (no spaces)"` split into `characters` plus a
new `noSpaces`.

The alternative — `text-wrap: balance`, or a non-breaking space — was rejected
because both only *discourage* a bad break. Neither guarantees the parenthesis
survives, and both fail differently at different track widths.

### Words, not quotes

The stream is 200 common English words, lowercase, no punctuation. Quotes read
better but make runs incomparable: each draw has its own difficulty, so two
scores from the same typist can differ by more than their actual improvement.
Capitals and punctuation measure shift-key reach, which varies by keyboard
layout — a score would stop meaning the same thing on two machines.

Words are drawn as **shuffled bags** rather than independent random picks. At
this bank size, independent picks repeat a word every few draws, and a visible
repeat is the thing that makes a stream look generated. A bag uses all 200
before reusing any. The one place a repeat can still surface is the seam
between two bags, which `buildStream` checks for and swaps past.

### The clock is read, never counted

`elapsedMs` is always `Date.now() - startedAt`. The 100ms interval decides only
how often the display recomputes. Counting ticks — `ticks * 100` — would drift
under load and would award a slower clock in a throttled background tab, which
is exactly the case where nobody is typing.

The run is *scored* over the nominal duration rather than over the millisecond
the timer happened to fire at. Those differ by one tick normally, and by
however long a tab sat backgrounded at worst; dividing by that longer figure
would punish someone for switching away after they had already stopped typing.

### Space banks a word even when it is wrong

Blocking the space bar until a word is right turns a typing test into a
spelling exercise, and strands anyone who cannot see what they got wrong. The
error is recorded instead — it costs accuracy, which is the correct penalty.

The space itself counts as a keystroke, and as a *correct* one only when the
word it terminated was right. Otherwise a run of wrong words would still be
collecting free correct characters.

### Backspace stops at the word boundary

The input element only ever holds the word in progress, so at offset zero there
is nothing left to delete and the boundary enforces itself — no key handler
required. Reopening a submitted word would mean un-scoring it, and the score is
what the tool exists to report.

### A real input, not a document key listener

The field is `visually-hidden` rather than absent. A hidden `<input>` still
raises a soft keyboard on a phone; a `keydown` listener on `document` never
would, which would leave the tool unusable on more than half its traffic. It
also gets IME and `@paste.prevent` for free — pasting would otherwise produce
a fabricated score.

### The stream is dealt in `onMounted`

Random words rendered on the server cannot match the client's, which is a
hydration mismatch. `restart()` is therefore never called during setup — the
same deferral `useReadingSpeeds` uses for its storage read.

### Run state is plain refs; the personal best is `useState`

`useTypingBest` uses `useState`, per the house rule, because a stored best is a
visitor setting that should outlive the page. `useTypingTest` deliberately does
not: a half-finished run should *not* survive a navigation. Its refs are
created inside the composable rather than at module scope, so there is still
nothing that can leak between requests on the server.

Storage follows `useReadingSpeeds` otherwise: `ma-`-prefixed scalar keys, one
per length, "no best yet" as the absence of the key, and an implausible stored
figure discarded rather than clamped — pinning a stored `9000` to `400` would
preserve a score nobody typed.

Bests are kept per length because a 15-second burst and a 120-second grind are
not the same achievement.

### The caret is measured, and `v-memo` is what makes that affordable

The caret is an absolutely-positioned bar translated to the right edge of the
last character typed. It lives *inside* the scrolling strip, so the strip's
transform moves the caret and the words together — parked outside it, the caret
would be left behind on every line advance.

Measuring after each keystroke is only cheap because `v-memo` keys each word on
what was typed into it: submitted words memo out permanently and only the
active word re-renders. Without it a 120-second run would diff a couple of
thousand character spans ten times a second. Measurement also reruns on resize
and on `document.fonts.ready`, since a late webfont reflows every glyph box.

The viewport shows three lines and keeps the active line second, so there is
always a line of context above and one of lookahead below.

### Accessibility

The word stage is a visual rendering of text the reader is typing, not content
in its own right, so it is `aria-hidden` and the input below carries the label.
The HUD is hidden for the same reason plus a stronger one: it repaints ten
times a second, and a live region there would talk continuously.

A single `aria-live="polite"` region announces transitions only — started,
finished, and the final score with its units spelled out, because a voice reads
"68 wpm" as "sixty-eight w p m".

The length selector is native radios in a `<fieldset>`, matching
`ThemeToggle.vue` — arrow-key navigation and the right announcement come free,
where a hand-rolled `role="radiogroup"` would have to rebuild both.

### Motion

Every animation is CSS on `var(--duration)` / `var(--ease)`, so the global
`prefers-reduced-motion` rule in `base/_reset.scss` disables them without any
per-component work: caret glide and blink, line advance, character colour, the
active length pill, and the staggered results tiles.

The one exception is the result's count-up, which interpolates *text* and so
cannot be expressed in CSS. It runs on `requestAnimationFrame` and checks
`matchMedia("(prefers-reduced-motion: reduce)")` itself, landing straight on
the final figure when motion is not wanted.

### No paused state

A typing test that can be stopped and resumed is not measuring a sustained
pace. Losing focus mid-run softens the stage and shows a prompt, but the clock
keeps going.

---

## Registration

Per the contract in `utils/tools.ts`: a registry entry, a copy block, and a
page file. The tool joins the existing `text` group rather than getting one of
its own — `toolsByGroup` has no runtime consumers, so a new group would only
have meant editing its exhaustiveness test.

The privacy policy needed correcting as well. It claimed the theme was the only
thing kept in local storage, which had already stopped being true when the
word counter's speed settings landed. It now lists all three.
