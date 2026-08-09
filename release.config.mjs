// release.config.mjs
// Automated versioning + CHANGELOG.md generation from conventional commits
//
// How it works (like a robot reading your git log):
//   feat: ...     →  bumps MINOR version  (1.0.0 → 1.1.0)
//   fix: ...      →  bumps PATCH version  (1.0.0 → 1.0.1)
//   BREAKING CHANGE in footer → bumps MAJOR version (1.0.0 → 2.0.0)
//   chore/docs/style/refactor/perf/test → no version bump, but added to changelog

/** @type {import('semantic-release').GlobalConfig} */
export default {
   branches: [
      "main", // production releases from main only — no pre-release channel
   ],

   plugins: [
      // 1. Analyse commits to determine next version
      [
         "@semantic-release/commit-analyzer",
         {
            preset: "conventionalcommits",
            releaseRules: [
               { type: "feat", release: "minor" },
               { type: "fix", release: "patch" },
               { type: "perf", release: "patch" },
               { type: "revert", release: "patch" },
               { type: "refactor", release: "patch" }, // refactor bumps patch (optional — remove if unwanted)
               { type: "chore", release: false }, // no release
               { type: "docs", release: false },
               { type: "style", release: false },
               { type: "test", release: false },
               { type: "build", release: false },
               { type: "ci", release: false },
            ],
         },
      ],

      // 2. Generate release notes from commits
      [
         "@semantic-release/release-notes-generator",
         {
            preset: "conventionalcommits",
            presetConfig: {
               types: [
                  { type: "feat", section: "✨ Features" },
                  { type: "fix", section: "🐛 Bug Fixes" },
                  { type: "perf", section: "⚡ Performance" },
                  { type: "refactor", section: "♻️  Refactors" },
                  { type: "revert", section: "⏪ Reverts" },
                  { type: "docs", section: "📚 Documentation", hidden: false },
                  { type: "chore", section: "🔧 Chores", hidden: true },
                  { type: "style", section: "💄 Styles", hidden: true },
                  { type: "test", section: "✅ Tests", hidden: true },
                  { type: "ci", section: "👷 CI", hidden: true },
               ],
            },
         },
      ],

      // 3. Write/update CHANGELOG.md
      [
         "@semantic-release/changelog",
         {
            changelogFile: "CHANGELOG.md",
            changelogTitle: "# Changelog\n\nAll notable changes to this project will be documented here.\nFormat based on [Keep a Changelog](https://keepachangelog.com/).",
         },
      ],

      // 4. Bump version in package.json
      "@semantic-release/npm",

      // 5. Commit CHANGELOG.md + package.json back to repo
      [
         "@semantic-release/git",
         {
            assets: ["CHANGELOG.md", "package.json"],
            message: "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
         },
      ],

      // 6. Create GitHub release with release notes
      "@semantic-release/github",
   ],
}
