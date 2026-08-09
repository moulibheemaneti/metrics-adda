# Contributing

Thanks for taking the time to contribute! This guide covers everything you need
to get set up and land a change.

By participating in this project, you agree to abide by our
[Code of Conduct](CODE_OF_CONDUCT.md).

---

## Prerequisites

- [Bun](https://bun.sh) `>= 1.3.14`

## Local Setup

```bash
# Fork and clone the repo
git clone https://github.com/<your-username>/metrics-adda.git
cd metrics-adda

# Install dependencies (also sets up the commitguard git hooks automatically)
bun install

# Start the development server
bun dev
```

The app runs at `http://localhost:3000`.

---

## Branching

We follow the strategy documented in [`BRANCHING.md`](BRANCHING.md). In short:

- Branch off `main` — it is the only long-lived branch
- Name branches `type/short-description` (e.g. `feat/user-auth`, `fix/login-redirect`)
- Open pull requests against `main`; never push to it directly

---

## Commit Messages

Commit messages **must** follow [Conventional Commits](https://www.conventionalcommits.org/).
This is enforced by commitguard on every commit.

```
type(optional-scope): short summary

[optional body]
```

Common types: `feat`, `fix`, `chore`, `refactor`, `docs`, `perf`, `test`.

Examples:

```
feat(auth): add password reset flow
fix: prevent duplicate form submission
docs: update setup instructions
```

---

## Code Style

Linting and typechecking run automatically on every commit via commitguard
(see `commitguard.yaml`). To run them yourself:

```bash
bun lint       # Stylelint + ESLint
bun lint:fix   # auto-fix where possible
bun typecheck  # vue-tsc
```

- **ESLint** enforces TypeScript and Vue rules, and all formatting — there is
  no Prettier in this project
- **Stylelint** enforces SCSS rules, including BEM class naming
- No `console.log` or `debugger` statements in committed code
- No hardcoded secrets or API keys — use environment variables (see `.env.example`)

---

## Tests

```bash
bun run test
```

Vitest runs three projects: `unit` (plain Node), `nuxt` (real Nuxt runtime) and
`scss` (sass-true). Put a new test in the one that matches what it needs — see
the Testing section of the [README](../README.md).

---

## Opening a Pull Request

1. Make sure `bun lint`, `bun typecheck` and `bun run test` pass, and the app
   builds (`bun run build`).
2. Push your branch and open a PR against `main`.
3. Fill out the [pull request template](pull_request_template.md) completely.
4. Link any related issues.
5. A maintainer (see [CODEOWNERS](CODEOWNERS)) will be requested for review automatically.

Keep PRs focused — one logical change per PR is easier to review and merge.

---

## Reporting Bugs & Requesting Features

Use the issue templates:

- 🐛 [Bug report](ISSUE_TEMPLATE/bug_report.md)
- ✨ [Feature request](ISSUE_TEMPLATE/feature_request.md)
- 🧹 [Chore](ISSUE_TEMPLATE/chore.md)

For security issues, please **do not** open a public issue — see our
[Security Policy](SECURITY.md).

---

Thanks again for contributing! 🎉
