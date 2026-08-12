# BMI calculator — a basic mode and a professional mode

## Context

`/bmi-calculator` did one division. `app/utils/bmi.ts` took kilograms and
metres, returned `kg / m²`, bucketed it into the four WHO adult bands and
computed the weight range that reaches the healthy one. Honest, and also the
whole tool — while its own FAQ admitted the two biggest holes out loud: BMI
*"cannot tell muscle from fat"*, and the WHO cut-offs were drawn from European
populations.

The goal: keep that page exactly as it is for the casual visitor, and add a
second mode that takes the parameters a clinician or a trainer would ask for.

**Nothing else belongs in BMI itself.** The formula is fixed; adding terms
produces a number that is not BMI. What a professional does instead is compute
*other indices alongside it*, and those need three things BMI does not use:
age and sex (every regression below is fitted separately on each), tape
measurements (where fat sits predicts risk better than how much you weigh),
and an activity level (turns resting rate into a daily calorie figure). Only
the first is required; the rest are optional and their readings appear when
they are supplied.

Shape confirmed up front: a **Basic/Advanced toggle on the existing route**,
not a second page, and a **population selector** offering WHO general, WHO
Asian and the Indian 2009 consensus cut-offs.

---

## Decisions

### The maths splits three ways

`bmi.ts`'s header scoped it to *"body mass index, its categories, and the
weight range that reaches the healthy one"*. Ten fitted regressions do not fit
under that sentence, and mixing them in would make the cheap, honest division
look like the estimates around it.

- **`app/utils/bands.ts`** (new) — `Band<Id>`, `bandFor`, `bandPosition`,
  `bandWidths`. Generalised out of `bmi.ts`, which invented the shape.
- **`app/utils/bmi.ts`** — unchanged in behaviour, ~25 lines shorter, plus the
  population band sets and the three BMI variants (`bmiPrime`,
  `ponderalIndex`, `newBmi`).
- **`app/utils/body.ts`** (new) — everything needing age, sex or a tape.

The `bands.ts` extraction paid for itself immediately: seven band tables now
share one boundary rule, and `test/unit/bmi.test.ts` passing **completely
untouched** is what proves the refactor was behaviour-preserving. That was
committed as its own checkpoint before any new maths existed.

`bandFor` returns `Id | null` where `bmiCategory` returns a non-nullable
`BmiCategory`; the `?? "obese"` fallback stays in `bmi.ts` so the old
signature survives. Every *new* category function returns `Cat | null`, which
is what lets a row vanish rather than mislabel.

### Population is a band set, not an offset

```ts
export const BMI_BAND_SETS: Record<BmiPopulation, BmiBand[]>
//  who    18.5 / 25   / 30    — WHO adult
//  asian  18.5 / 23   / 27.5  — WHO 2004 Asian action points
//  india  18.0 / 23   / 25    — 2009 Asian-Indian consensus
```

`bmiCategory(bmi, population = "who")` and `healthyWeightRange(metres,
population = "who")` take it as an **optional trailing argument**, so every
existing call site and assertion stayed green without an edit.

This reverses a written decision in `bmi.ts`'s header — that the Asian action
points were *"deliberately not adjusted"* because a calculator silently using
different thresholds from every chart a reader can check would be worse. That
reasoning is why the control is explicit and labelled rather than a default:
**basic mode is `who` and nothing else**, and the advanced readout always
names the standard in force. `activePopulation` pins basic to `who` regardless
of what the selector was left on, so switching back can never leave a
non-standard threshold quietly applied. The header comment was rewritten
rather than left contradicting the code.

### Advanced is additive, and the split is by input

Advanced renders `BodyCompositionPanel` *below* the unchanged BMI output
rather than replacing it. Nobody wants a body-fat estimate *instead of* their
BMI. It also removes the shared-state problem outright: height, weight and the
unit system are typed once in the parent and passed down as props, so flipping
modes cannot lose what someone entered.

The organising rule is that **advanced is defined by its inputs, not its
maths** — "the readings that need age, sex, or a tape measure". Adding or
dropping one is three edits: a function in `body.ts` (plus a band array if it
categorises), a label in `COPY.body`, and an entry in the panel's row builder.

There is deliberately **no aggregator** (`bodyReport(input)`). A single object
argument would make every reading depend on every field, destroying the
property the feature rests on: a reading whose input is missing must not
exist. `body.ts` stays a flat bag of independently testable pure functions.

### A missing reading disappears, and says what would bring it back

`row()` returns `ResultRow[]` — empty for a `null` value — and the groups
spread and filter. TypeScript narrows that without a cast.

A vanished row on its own is the confusing case, so each group renders a
positive prompt in its place ("Add your waist and neck measurements to
estimate body fat from your shape"). The two *rejection* reasons are
distinguished, because they are genuinely different problems: `waistUnderNeck`
is a mis-read tape the reader can fix, `implausible` is a body outside what
the regression was fitted on.

### Radios, not tabs

A `<fieldset>` of radios for the mode, matching the units toggle one element
up. Advanced is basic *plus* more, not a swapped panel, so `role="tablist"`
would misdescribe the relationship — and it would mean hand-writing roving
tabindex, `aria-selected` and `aria-controls` in a repo with no ARIA widget
patterns at all. Sex is radios (two options); population and activity are
`<select>` (three and five, with labels too long for a pill row) — the same
argument `TypingTestPanel.vue` writes into its own SCSS about its topic
select.

### Estimates are formatted as estimates

Per-metric, not one shared helper. `formatQuantity` caps *significant* digits,
which is right for a converted quantity and wrong for an estimate — it prints
8.5% and 39% from the same rule. `formatDecimal(value, places)` was added to
`format.ts` for the fixed-decimal case.

| Reading | Format |
|---|---|
| Body fat, lean mass, FFMI, indices | 1 decimal |
| Ratios (WHtR, WHR, BMI Prime) | 2 decimals — boundaries sit at 0.50 / 0.85 / 0.90 |
| BMR, TDEE | **rounded to the nearest 10** |

A method that varies 10% between people of identical size, printed as
`2,555.5625`, is a lie told in typography.

**No calorie deficit is computed.** A TDEE is a fact about a body; "eat 500
kcal less to lose 0.5 kg a week" is dietary advice, and it is the one thing on
this list that could plausibly harm someone.

### Sex is the one field with no seeded default

Everything else is seeded (age 30, the site's 175 cm / 70 kg) so the panel
reads as a worked example the moment it opens. Sex is not: there is no neutral
default and picking one silently is a judgement the tool should not make. That
leaves five rows missing on open, which looks broken — so the gap is explained
by copy (`sexPrompt`), and `sexNote` gives the honest reason the field exists
at all. Tape measurements stay blank too; that is the state that exercises the
hints.

### The mode is not persisted

The `ma-`-prefixed `localStorage` pattern exists and would work, but the mode
is a per-visit intent rather than a preference, and a returning visitor would
watch the entire lower half of the page appear a frame after hydration. Basic
is also what SSR renders, which is what keeps the indexable content stable.

### Title unchanged, description changed

Advanced mode is client state, so a title promising body-fat analysis would
describe markup that is not in the server-rendered HTML — and retitling a page
that already ranks is a real risk for no gain. The description change is
earned: the two new FAQ answers put genuine body-fat text into the SSR output.

`FAQ_COPY.bmiCalculator` went from four entries to six. The existing four
**questions** are byte-identical — `useToolPage` emits them as `FAQPage`
structured data and they are stable in search results. Only answer #4 was
reworded, because the population selector made its last sentence untrue.

---

## Files touched

| File | Change |
|---|---|
| `app/utils/bands.ts` | New — `Band<Id>`, `bandFor`, `bandPosition`, `bandWidths` |
| `app/utils/bmi.ts` | Refactored onto `bands.ts`; `BmiPopulation`, `BMI_BAND_SETS`, `healthyBmiRange`, `bmiPrime`, `ponderalIndex`, `newBmi`; header rewritten |
| `app/utils/body.ts` | New — body fat (Navy, Deurenberg), Boer lean mass, FFMI, WHtR, WHR, Mifflin/Katch BMR, TDEE, four ideal-weight formulas, and their band tables |
| `app/utils/format.ts` | `formatDecimal` |
| `app/components/BodyCompositionPanel.vue` | New — the advanced inputs and five result groups |
| `app/components/BmiCalculatorPanel.vue` | Mode fieldset, population select, `activePopulation`, renders the child panel |
| `app/assets/scss/components/_field.scss` | `.radio-dot` — see below |
| `app/utils/copy.ts` | `COPY.bmi` mode keys, the whole `COPY.body` block with five `satisfies Record<…>` clauses, two FAQ entries, reworded FAQ #4, new description and lede |
| `test/unit/bands.test.ts` | New |
| `test/unit/body.test.ts` | New — worked values and every null case |
| `test/unit/bmi.test.ts` | Population sets and the three indices appended; **existing blocks untouched** |
| `test/nuxt/tools.nuxt.test.ts` | New `BmiCalculatorPanel` block — the panel had no component test at all |

### The radio bug this uncovered

`app/assets/scss/base/_reset.scss` sets `appearance: none` on every `input`,
and nothing restored it for the BMI panel's radios. Measured in Chromium: all
of them rendered at **0×0**. The metric/imperial toggle has shipped since the
tool launched with no visible indication of which unit system is selected —
clicking the label worked, so it was never caught.

`.radio-dot` in `_field.scss` fixes it, drawing the control the way
`.checkbox__box` beside it already does and for exactly the same reason. A
standalone class rather than a `__element`, because the wrapper differs
between the two panels and only the control is shared. This was not in the
plan; it became in-scope the moment the mode switch — the primary control for
the whole feature — inherited the same invisibility.

---

## Verification

`bun run test` (411 passing), `bun run typecheck`, `bun run lint`,
`bun run seo:verify` (155 passed, 0 failed) — all clean.

Driven end to end in Chromium against the production build, at 175 cm / 70 kg
/ 30 / male / waist 85 / neck 38 / hip 95. Every figure matches the fixture in
`test/unit/body.test.ts`:

| Reading | On screen |
|---|---|
| Body fat (Navy) | 16.9%, Fitness |
| Body fat (Deurenberg) | 18.1% |
| Lean / fat mass | 56.0 kg / 14.0 kg |
| FFMI / normalised | 18.3 / 18.6 |
| WHtR / WHR | 0.49 Healthy / 0.89 Healthy |
| BMR (Katch-McArdle) / TDEE | 1,580 / 2,170 kcal/day |
| BMI Prime / ponderal / new BMI | 0.91 / 13.1 / 22.5 |

Also confirmed in the browser:

- Basic mode renders no advanced surface at all, and the server-rendered HTML
  still carries the 22.9 worked example and does *not* carry the advanced panel
- Switching population to `india` moves BMI Prime 0.91 → 0.99 while the BMI
  itself stays 22.9
- Waist 30 / neck 38 shows the tape notice and **`-450` appears nowhere on the
  page** — see below
- Age 12 suppresses the whole advanced readout with an explanation
- Imperial mode asks for circumferences in inches and lands on the same 16.9%
- Dark theme and a 400 px viewport: no horizontal overflow (measured 0 px)

### The trap worth not undoing

**`waist === neck` does not produce `NaN`.** `log10(0)` is `-Infinity`, the
denominator runs to `+Infinity`, and the Navy expression lands on **exactly
`-450`** — a finite number that a `Number.isFinite` guard passes straight
through to the screen. The guard has to be on the girth being positive.
`test/unit/body.test.ts` holds that line, and the component test asserts
`-450` never reaches the DOM.

Two more of the same family, all with real reproducing inputs in the tests:

- A 190 cm reader with a 70 cm waist and 40 cm neck yields **−1.1%** body fat.
  Nothing is malformed; the regression has left its fitted domain, which is
  what `BODY_FAT_MIN`/`MAX` exists for.
- `leanBodyMassBoer(10, 80, "female")` is **−7.9 kg**, and that propagates
  into FFMI and Katch-McArdle. One missing guard corrupts three readings.

### Known behaviour, left alone deliberately

- **Flipping the unit system reinterprets the digits already in the fields
  rather than converting them** — enter 70 in metric, switch to imperial, and
  it becomes 70 lb. Long-standing behaviour of this panel, not something
  advanced mode introduced, and fixing it is its own change. The component
  test asserts the imperial *path* agrees instead.
- **Body fat bands are ACE, which splits by sex and not by age.** The
  age-banded alternatives (Gallagher, Jackson–Pollock) need four age brackets
  per sex and forty hand-entered boundaries with no single canonical source.
  Adding it later is an `ageYears` argument and a second key level; nothing
  else changes.
- **WHR has two bands per sex, not three.** The middle boundary in the common
  low/moderate/high version is invented, and inventing a threshold in a health
  tool is the one economy not worth making.
- **Ideal-weight formulas are shown together and below the healthy range**,
  never alone. They disagree by 3.3 kg for the fixture person, and that spread
  is the point — a single one would read as a target it cannot support.

### Next, if this earns its keep

`BodyCompositionPanel` takes height and weight as props precisely so it can be
reused. `/body-fat-calculator` and `/tdee-calculator` are thin wrappers that
own their own height/weight fields and render the same panel — roughly 40
lines each, no refactor — and "TDEE calculator" is likely the highest-volume
query in this whole set. That is the roadmap-consistent play: the maths is
built once and monetised across routes. As it stands, ~600 lines of new util
code earn one client-side mode on one existing route, invisible to search.

Note when running a preview build by hand: kill any earlier
`.output/server/index.mjs` first. A stale server keeps port 3000 and silently
serves the previous build.
