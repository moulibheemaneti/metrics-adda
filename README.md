# Metrics Adda

> One-line description of what this project does.

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
├── i18n/locales/        # Translation message files
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
