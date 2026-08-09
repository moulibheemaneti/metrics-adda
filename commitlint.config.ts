import type { UserConfig } from "@commitlint/types"

const config: UserConfig = {
   extends: ["@commitlint/config-conventional"],
   rules: {
      // type must be one of these
      "type-enum": [
         2,
         "always",
         [
            "feat", // new feature
            "fix", // bug fix
            "chore", // tooling, deps, config (no production code change)
            "docs", // documentation only
            "style", // formatting, missing semicolons (no logic change)
            "refactor", // code restructure (no feature/fix)
            "perf", // performance improvement
            "test", // adding or fixing tests
            "build", // build system or external dependencies
            "ci", // CI/CD config
            "revert", // revert a previous commit
         ],
      ],
      "type-case": [2, "always", "lower-case"],
      "type-empty": [2, "never"],
      "subject-empty": [2, "never"],
      "subject-full-stop": [2, "never", "."],
      "subject-case": [2, "always", "lower-case"],
      "header-max-length": [2, "always", 100],
   },
}

export default config
