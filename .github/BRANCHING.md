# Branching Strategy

This project follows a **trunk-based** strategy: `main` is the only long-lived
branch, and every change reaches it through a short-lived branch and a PR.

## Branch Structure

```
main          → production-ready code. Never commit directly.
feat/*        → new features.        e.g. feat/user-authentication
fix/*         → bug fixes.           e.g. fix/login-redirect
chore/*       → tooling/config.      e.g. chore/update-dependencies
docs/*        → documentation only.  e.g. docs/update-readme
refactor/*    → code restructuring.  e.g. refactor/auth-composable
```

The prefixes mirror the commit types accepted by the `conventional` preset in
[`commitguard.yaml`](../commitguard.yaml), so the branch name and the
commits on it describe the same kind of change.

## Flow

```
feat/my-feature ──► main ──► release
```

1. Branch off `main`
2. Work on your branch
3. Open a PR → `main`
4. Merging to `main` triggers CI and, if the commits warrant it,
   a semantic-release version bump

## Rules

- `main` is protected — no direct pushes
- Branch names must follow the `type/short-description` pattern
- Delete branches after merging
- Keep branches short-lived — the longer a branch lives, the harder the merge
- Every merge to `main` is releasable; there is no staging branch to hide
  behind, so keep PRs small and green
