# Word counter — adjustable reading and speaking speed

## Context

The word counter derived its two time estimates from hardcoded constants:
`READING_WORDS_PER_MINUTE = 238` (average adult silent reading) and
`SPEAKING_WORDS_PER_MINUTE = 150` (presentation pace). Both are population
averages, so they are wrong for any particular person, and there was no way to
correct them.

The goal: let a visitor set their own pace without the controls cluttering the
tool for everyone else. Shape confirmed up front — a **gear icon** opens a
settings surface with **two sliders**, plus a **checkbox, ticked by default,
that pins both speeds to the recommended figures**. **Save** commits and
collapses it; closing any other way reverts. The choice persists across
reloads, and a stat tile shows its words-per-minute **only once it differs from
the default**, so a surprising number is always explained.

---

## Decisions

### The settings expand in place, not in a dialog

The gear toggles a section between the Clear/Copy row and the stat tiles. The
tiles stay on screen and **track the sliders live**, so the estimate moves as
you drag; nothing is written to storage until Save.

This was first built as a modal `<dialog>` + `showModal()`, copying
`SiteMenu.vue`, and that was the wrong call. The argument for it was real but
narrow — the browser supplies Escape, the focus trap and focus-return, and a
modal makes the page behind inert, which keeps the `aria-live` stat grid quiet
while a slider is dragged. The argument against is decisive: watching the
estimate change *is* the point of a speed slider, and a modal dims the tiles
behind a scrim on a desktop and covers them outright on a phone. Optimising
for a quiet live region while giving up the feedback that makes the control
legible is a bad trade, and the announcement noise has its own fix that costs
nothing (below).

SEO played no part in either direction. The closed dialog and both sliders were
present in the server-rendered HTML; settings controls are not indexable
content in either layout.

The Popover API was rejected outright and would be again: `popover="auto"`
renders in the top layer, so anchoring it to the gear needs CSS anchor
positioning (not portable yet) or hand-written JS positioning — more machinery
than the inline panel, not less.

Cost of the inline panel, all of it in `TextStatsPanel.vue`: `@keydown.esc`
to cancel, a `nextTick` focus onto the checkbox when the panel renders, and a
`.focus()` back onto the gear when it closes. Roughly thirty lines.

### The live region goes quiet while the panel is open

`aria-live` on the stat grid drops to `off` whenever the settings are open. A
range input already announces its own value on every step, and eight tiles
re-announcing over the top of that would bury it.

That leaves a gap at the moment of saving: the tiles already moved as the
sliders did, so the grid has nothing to announce when it starts listening
again. A `.visually-hidden` polite region — the pattern
`PasswordGeneratorPanel.vue` already uses for a generated password — carries
the two final estimates instead.

### Durations are compact on screen and spelled out for a voice

`formatDuration` prints `1m 31s`, not `1 min 31 sec`. The stat tile is one
grid track wide, and the spaced form wrapped onto a second line, leaving the
two timing tiles taller than the six counts beside them. Measured after the
change: all eight tiles are 85px.

`formatDurationSpoken` prints `1 minute 31 seconds` and exists for one caller
— the live region above. A screen reader turns `1m 31s` into "one m three one
s", so the single string on the page whose only job is to be spoken must not
use the compact form. The tiles keep it: they carry a visible text label
("Reading time") that supplies the context a voice needs.

### The gear is a text glyph, not an SVG

There is no SVG or icon component anywhere in `app/` — every icon is a Unicode
glyph inside `<span aria-hidden="true">`: `⧉` (`CopyButton`), `✕` (`SiteMenu`),
`⇅` (`UnitConverter`), `◐ ☀ ☾` (`ThemeToggle`). `⚙` (U+2699) follows suit; it
has text presentation by default, so it stays monochrome and inherits
`currentcolor` in both themes. The existing `.button--icon` modifier already
gives a square 44px button.

### Two storage keys, and none for the checkbox

`useReadingSpeeds` mirrors `useTheme` beat for beat: `ma-`-prefixed exported
key constants, `useState()` rather than a module ref so values do not leak
between SSR requests, validation of whatever comes back out of storage, and
**the default stored as the *absence* of the key** — so returning to the
recommended pace re-inherits any later change to that recommendation instead of
pinning the visitor to today's figure.

Two scalar keys rather than one JSON blob: no parse step that can throw, and
each speed can independently be default. That is also why **the checkbox has no
key of its own** — "recommended" *is* both keys being absent, so it is derived,
and the two can never fall out of step.

A stored value outside its slider's range is **discarded, not clamped**: a
stored `5000` is far likelier to be a bad write than a considered choice, and
quietly pinning it to 800 would hide that rather than recover from it.

### `analyseText` takes an optional second argument

```ts
export function analyseText(input: string, speeds: TextSpeeds = DEFAULT_SPEEDS): TextStats
```

Optional rather than required — unlike `generatePassword`, which takes its
options outright — because the two timings are the only part of the result that
depends on it, and a caller after nothing but counts should not have to know
the words-per-minute figures exist. `TextStats` and `EMPTY_STATS` are unchanged,
which is what keeps the existing shape assertion in `test/unit/text.test.ts`
green.

Both speeds are clamped before dividing. A zero or negative speed would
otherwise produce `Infinity` seconds, which `formatDuration` prints as
`"0s"` — the exact opposite of what it means.

### Draft state

The sliders edit a local `draft`; nothing reaches `setSpeeds` until Save. That
*is* the whole of "closing without saving reverts" — Escape, Cancel and pressing
the gear again all simply collapse, and the draft is reseeded from the committed
speeds on the next open. A `preview` computed returns the draft while the panel
is open and the committed speeds while it is closed, which is what makes the
tiles track the sliders and snap back on cancel with no extra bookkeeping.

There is deliberately no click-outside-to-close. With a live preview, a stray
click landing on the page would silently discard a half-made adjustment; Save
and Cancel are both on screen and unambiguous.

While the box is ticked the sliders display the recommended figures but `draft`
keeps whatever was dragged to, so unticking hands the value back rather than
making someone find it again. A disabled input fires no `input` event, so
nothing overwrites it meanwhile. Across saves it is forgotten: tick + Save
commits the defaults, so the next open reseeds from 238/150. The composable
deliberately stores no shadow copy of a discarded value.

One edge case, accepted rather than coded around: unticking the box, leaving
both sliders at exactly 238/150 and saving is indistinguishable from ticking
it — because it *is* indistinguishable in every observable way.

---

## Files touched

| File | Change |
|---|---|
| `app/utils/text.ts` | Slider bounds, `TextSpeeds`, `DEFAULT_SPEEDS`, `clampSpeed`, optional `speeds` argument |
| `app/composables/useReadingSpeeds.ts` | New — mirrors `useTheme.ts` |
| `app/components/TextStatsPanel.vue` | Gear trigger, inline panel, draft + preview state, conditional wpm labels, scoped SCSS |
| `app/utils/copy.ts` | `common.save` / `common.cancel`, seven `stats.*` keys, reworded reading-time FAQ answer |
| `app/assets/scss/components/_field.scss` | `.slider:disabled`, `.field--disabled .field__label` |
| `app/utils/format.ts` | `formatDuration` goes compact; new `formatDurationSpoken` |
| `test/unit/format.test.ts` | Compact assertions, plus a `formatDurationSpoken` block |
| `test/unit/text.test.ts` | Custom-speed and `clampSpeed` cases |
| `test/nuxt/reading-speeds.nuxt.test.ts` | New — 18 cases |

Two details worth not undoing:

- The stat tiles are keyed on a stable `item.key`, not on `item.label`. Labels
  are dynamic now, and keying on one would tear down and rebuild the `<li>`
  inside a live region — a full re-announcement rather than a text update.
- The FAQ **question** is unchanged; only the answer was reworded. The question
  is stable in search results and `useToolPage` emits it as `FAQPage`
  structured data.
- The settings block overrides the slider track colour to `--line-strong`.
  The shared track in `_field.scss` is `--surface-sunken`, which is this
  block's own background, so the track disappeared into it. `--surface` would
  have fixed the light theme only — in dark, `--surface` (`#0b0f1a`) against
  `--surface-sunken` (`#080c14`) is almost no contrast at all. The override is
  scoped to this block rather than changed globally, so the password
  generator's slider is untouched.

---

## Verification

`bun run test` (180 passing), `bun run typecheck`, `bun run lint` — all clean.

Escape *is* covered in the suite now. Under the dialog it was not testable:
happy-dom does not simulate the browser's own dialog key handling, so
`trigger("keydown.esc")` would have passed by doing nothing at all. The inline
panel handles Escape in component code, so the test exercises the real path.

Driven end to end in Chromium against the production build:

- Dragging a slider moves the tile live — `1m 31s` to `51s` — while
  `localStorage` stays `null`
- Save stores `420` / `110`; both survive a reload and read back as
  `Reading time (420 wpm)` and `Speaking time (110 wpm)`
- Dragging on to 700 previews `31s`, then Escape collapses the panel and
  snaps the tile back to the committed `51s` with storage untouched
- Re-ticking the box and saving clears **both** keys rather than writing
  `"238"` / `"150"`
- Focus lands on the checkbox when the panel opens and returns to the gear when
  it closes
- Light, dark and a 400px viewport all render correctly

Note when running a preview build by hand: kill any earlier
`.output/server/index.mjs` first. A stale server keeps port 3000 and silently
serves the previous build, which looks exactly like the new code not working.

### Known behaviour, left alone deliberately

- `localStorage` access in `sync()` is unguarded, matching `useTheme.ts`. It
  only runs from `onMounted`, so SSR never reaches it; a browser with site data
  blocked would throw. That is pre-existing repo-wide behaviour and was not
  changed here in isolation.
- A visitor with a stored custom speed sees the two tiles correct themselves one
  frame after hydration. `<ClientOnly>` is the wrong fix: the grid is the
  tool's indexable content, and the tiles' footprint does not change, so there
  is no layout shift to budget for.
