# Metrics Adda

> Fast, free unit converters and everyday text tools — no sign-up, nothing to install.

---

## Tools

Each tool is its own indexable page, with its own title, description, OG card
and structured data.

| Route | What it does |
| --- | --- |
| `/weight-converter` | kg, g, mg, tonnes, oz, lb, stone, US tons |
| `/height-converter` | cm and metres ⇄ feet and inches, plus all length units |
| `/temperature-converter` | Celsius, Fahrenheit, kelvin |
| `/speed-converter` | km/h, mph, m/s, ft/s, knots |
| `/volume-converter` | ml, litres, m³, and US **and** imperial gallons, pints, cups |
| `/area-converter` | mm², cm², m², hectares, km², in², ft², yd², acres, mi² |
| `/time-converter` | ms, seconds, minutes, hours, days, weeks, years |
| `/data-storage-converter` | bits, bytes, decimal KB–PB **and** binary KiB–PiB |
| `/percentage-calculator` | Percent of a number, percent change, increase and decrease |
| `/age-calculator` | Age in years, months and days, plus your next birthday |
| `/word-counter` | Words, characters, sentences, paragraphs, reading time |
| `/case-converter` | UPPER, lower, Title, Sentence, camelCase, snake_case + 4 more |
| `/typing-speed-test` | Timed WPM test with accuracy and a personal best |
| `/bmi-calculator` | Body mass index, its category, and the healthy weight range |
| `/lorem-ipsum-generator` | Placeholder text by the paragraph, sentence or word |
| `/uuid-generator` | Random v4 UUIDs, up to 100 at a time, in four formats |
| `/password-generator` | Strong random passwords with an entropy readout |

Adding a tool means three things: an entry in `app/utils/tools.ts`, a copy block
in `app/utils/copy.ts`, and a page in `app/pages/`. `test/unit/tools.test.ts`
fails if those drift apart.

All conversion, counting and generation runs client-side — nothing a visitor
types is sent anywhere.

---

## Design

Indigo on cool slate, with Sora for headings and Inter for everything else.
Both fonts are self-hosted from `public/fonts/` — see the README there.

Colours live as CSS custom properties in `app/assets/scss/base/_global.scss`,
with the dark counterpart of every one in `app/assets/scss/themes/_dark.scss`.
Two rules worth knowing before changing them:

- **The accent is two tokens, not one.** `--accent` is the ink (links, active
  nav, hairlines) and lifts in dark mode so it stays readable; `--accent-solid`
  is the fill (buttons, checked boxes) and deliberately holds still, so
  `--accent-contrast` keeps its 6.7:1. Using `--accent` as a fill will fail
  contrast in dark mode.
- **Indigo is load-bearing.** The password strength meter uses red / amber /
  green semantically. A brand colour from any of those families would make a
  meter state indistinguishable from ordinary chrome.

Theme preference is system / light / dark, stored in `localStorage` under
`ma-theme`, where "system" is the *absence* of the key and of the `data-theme`
attribute. An inline script in `nuxt.config.ts` applies a stored choice before
first paint; without it, dark-mode visitors get a white flash on every load.

Both themes are audited with axe-core at WCAG 2.1 AA on every route.

---

## Tech Stack

- **Framework** — [Nuxt 4](https://nuxt.com)
- **Runtime** — [Bun](https://bun.sh)
- **Language** — TypeScript
- **Styling** — SCSS
- **Linting** — ESLint + Stylelint
- **Testing** — Vitest (`unit`, `nuxt` and `scss` projects)
- **Deployment** — Vercel

---

## Prerequisites

- [Bun](https://bun.sh) `>= 1.3.14`

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/moulibheemaneti/metrics-adda.git
cd metrics-adda

# Install dependencies (also sets up the commitguard git hooks automatically)
bun install

# Start development server
bun dev
```

App runs at `http://localhost:3000`

---

## Available Scripts

| Command | Description |
|---|---|
| `bun dev` | Start development server |
| `bun run build` | Build for production |
| `bun preview` | Preview production build locally |
| `bun lint` | Run Stylelint + ESLint across the project |
| `bun lint:fix` | Run both linters and auto-fix issues |
| `bun typecheck` | Run TypeScript type check (`vue-tsc`) |
| `bun run test` | Run the full Vitest suite once |
| `bun test:watch` | Run Vitest in watch mode |
| `bun seo:verify` | Boot the production build and smoke-test every SEO surface |
| `bun seo:lighthouse` | Run Lighthouse CI against the production build |
| `bun clean` | Remove `.nuxt`, `.output` and `dist` |

---

## Project Structure

```
.
├── app/
│   ├── assets/scss/     # 7-1 SCSS architecture (abstracts, base, layout…)
│   ├── components/      # Vue components
│   ├── composables/     # Composition API composables
│   ├── layouts/         # Nuxt layouts
│   ├── pages/           # File-based routing
│   └── utils/           # Auto-imported utility functions
├── public/              # Publicly served static files
├── scripts/seo/         # SEO smoke test + Lighthouse CI runners
├── test/
│   ├── nuxt/            # Tests that need the Nuxt runtime
│   ├── scss/            # sass-true tests for SCSS functions
│   └── unit/            # Plain-Node unit tests
├── .github/             # GitHub templates, Actions, CODEOWNERS
├── nuxt.config.ts       # Nuxt configuration
└── eslint.config.mjs    # ESLint configuration
```

---

## Testing

Vitest runs three projects in one pass (see `vitest.config.ts`):

- **`unit`** — plain Node. Import modules relatively, not via `~`.
- **`nuxt`** — real Nuxt runtime, so auto-imports and composables resolve.
- **`scss`** — [sass-true](https://github.com/oddbird/true) suites for the
  SCSS functions in `app/assets/scss/abstracts/`.

```bash
bun run test
```

---

## Git Workflow

See [`.github/BRANCHING.md`](.github/BRANCHING.md) for the full branching strategy.

**Quick summary:**
- `main` is the only long-lived branch — branch off it, and never push to it directly
- Use `type/short-description` branch names (e.g. `feat/user-auth`)
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)
- Open a PR to `main`

---

## Code Style

Enforced on every commit by [commitguard](https://github.com/moulibheemaneti/commitguard)
(see `commitguard.yaml`):

- **ESLint** — TypeScript and Vue rules, and formatting via `@stylistic`
  (there is no Prettier in this project)
- **Stylelint** — SCSS rules, including BEM class naming
- **`bun typecheck`** — runs before every commit
- **Conventional commits** — validated on the commit message

---

## Releases

Versioning and `CHANGELOG.md` are automated by
[semantic-release](https://semantic-release.gitbook.io/) (`release.config.mjs`),
driven by the commit history. `main` is the only release branch — every push to
it is evaluated, and `feat:` / `fix:` commits since the last tag decide the
version bump. There is no pre-release channel.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

> ⚠️ Never commit `.env` — it is gitignored.

---

## Deployment

This project is deployed on **Vercel**. Every push to `main` triggers a production deploy automatically.

---

## License

[MIT](LICENSE)
