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
closes; closing any other way reverts. The choice persists across reloads, and
a stat tile shows its words-per-minute **only once it differs from the
default**, so a surprising number is always explained.

---

## Decisions

### The settings surface is a modal `<dialog>`

`app/components/SiteMenu.vue` already ships this pattern here, SSR included,
and its own comment gives the reasoning: `<dialog>` + `showModal()` makes
Escape, the focus trap, the inert page behind, and focus returning to the
trigger **browser behaviour rather than hand-written code**. An inline
disclosure would have needed roughly 35 lines of keydown, outside-click and
focus-restore listeners plus their teardown.

The Popover API looks like the lighter option and is not. `popover="auto"`
renders in the top layer, so anchoring it to the gear needs CSS anchor
positioning (not portable yet) or hand-written JS positioning — more
machinery, not less.

The modal also settles an accessibility problem for free. The stat grid is
`aria-live="polite"`; `showModal()` makes everything outside the dialog inert
and therefore absent from the accessibility tree, so dragging a slider
announces nothing and Save announces the new figures exactly once. An inline
panel would have re-announced on every slider step.

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
`"0 sec"` — the exact opposite of what it means.

### Draft state

The sliders edit a local `draft`; nothing reaches `setSpeeds` until Save. That
*is* the whole of "closing without saving reverts" — Escape, a scrim click and
Cancel all simply close, and the draft is reseeded from the committed speeds on
the next open.

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
| `app/components/TextStatsPanel.vue` | Gear trigger, modal dialog, draft state, conditional wpm labels, scoped SCSS |
| `app/utils/copy.ts` | `common.save` / `common.cancel`, seven `stats.*` keys, reworded reading-time FAQ answer |
| `app/assets/scss/components/_field.scss` | `.slider:disabled`, `.field--disabled .field__label` |
| `test/unit/text.test.ts` | Custom-speed and `clampSpeed` cases |
| `test/nuxt/reading-speeds.nuxt.test.ts` | New — 13 cases |

Two details worth not undoing:

- The stat tiles are keyed on a stable `item.key`, not on `item.label`. Labels
  are dynamic now, and keying on one would tear down and rebuild the `<li>`
  inside a live region — a full re-announcement rather than a text update.
- The FAQ **question** is unchanged; only the answer was reworded. The question
  is stable in search results and `useToolPage` emits it as `FAQPage`
  structured data.

---

## Verification

`bun run test` (175 passing), `bun run typecheck`, `bun run lint` — all clean.

Escape is deliberately untested in the suite: happy-dom does not simulate the
browser's own dialog key handling, so `trigger("keydown.esc")` would pass by
doing nothing at all. Cancel and the scrim cover the same revert path through
code the component actually owns, and Escape was verified in a real browser
instead.

Driven end to end in Chromium against the production build:

- Save stores `420` / `110`; both survive a reload and read back as
  `Reading time (420 wpm)` and `Speaking time (110 wpm)`
- Escape after dragging a slider closes the dialog and leaves the stored value
  untouched
- Re-ticking the box and saving clears **both** keys rather than writing
  `"238"` / `"150"`
- Focus lands on the checkbox when the dialog opens and returns to the gear
  when it closes
- Dark theme and a 640px viewport both render correctly

### Known behaviour, left alone deliberately

- `localStorage` access in `sync()` is unguarded, matching `useTheme.ts`. It
  only runs from `onMounted`, so SSR never reaches it; a browser with site data
  blocked would throw. That is pre-existing repo-wide behaviour and was not
  changed here in isolation.
- A visitor with a stored custom speed sees the two tiles correct themselves one
  frame after hydration. `<ClientOnly>` is the wrong fix: the grid is the
  tool's indexable content, and the tiles' footprint does not change, so there
  is no layout shift to budget for.
