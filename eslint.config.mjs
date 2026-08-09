// @ts-check
/**
 * ESLint Flat Config — Nuxt 4 + Bun + TypeScript + SCSS
 * Composition API · Arrow functions · No Prettier
 *
 * How it works:
 *  - `withNuxt` wraps the auto-generated .nuxt/eslint.config.mjs (project-aware)
 *  - We append custom flat config blocks for TS, Vue, style, and ignores
 *  - Stylistic rules replace Prettier (formatting enforced by ESLint itself)
 *
 * Requires in nuxt.config.ts:
 *   modules: ['@nuxt/eslint']
 *   eslint: { config: { stylistic: true } }
 */

import withNuxt from "./.nuxt/eslint.config.mjs"

export default withNuxt(

   // ─── 1. GLOBAL IGNORES ───────────────────────────────────────────────────
   {
      ignores: [
         "**/node_modules/**",
         "**/.nuxt/**",
         "**/.output/**",
         "**/dist/**",
         "**/public/**",
         "**/*.min.js",
         "bun.lockb",
      ],
   },

   // ─── 2. TYPESCRIPT — all .ts files ───────────────────────────────────────
   {
      files: ["**/*.ts"],
      rules: {
         // Disallow `any` — use `unknown` instead and narrow types explicitly
         "@typescript-eslint/no-explicit-any": "error",

         // Require explicit return types on functions (catches silent `undefined`)
         "@typescript-eslint/explicit-function-return-type": ["warn", {
            allowExpressions: true, // const fn = () => {} is fine
            allowTypedFunctionExpressions: true,
         }],

         // Prevent unused variables — prefix with _ to intentionally skip
         "@typescript-eslint/no-unused-vars": ["error", {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
         }],

         // Prefer `interface` over `type` for object shapes (easier to extend)
         "@typescript-eslint/consistent-type-definitions": ["error", "interface"],

         // Always use `import type` for type-only imports (tree-shaking friendly)
         "@typescript-eslint/consistent-type-imports": ["error", {
            prefer: "type-imports",
            fixStyle: "inline-type-imports",
         }],

         // No non-null assertions `!` — handle nulls explicitly
         "@typescript-eslint/no-non-null-assertion": "warn",
      },
   },

   // ─── 3. VUE — .vue files (Composition API + arrow functions) ─────────────
   {
      files: ["**/*.vue"],
      rules: {
         "vue/html-indent": "off",

         "vue/max-attributes-per-line": "off",

         "vue/first-attribute-linebreak": "off",

         "vue/html-closing-bracket-newline": "off",

         // Enforce <script setup> — the Composition API standard in Nuxt 4
         "vue/component-api-style": ["error", ["script-setup"]],

         // Component names must be multi-word (e.g. UserCard, not Card)
         // Exceptions: pages and layouts follow Nuxt file conventions
         "vue/multi-word-component-names": ["error", {
            ignores: ["index", "default", "error", "[...slug]"],
         }],

         // Props must have types defined
         "vue/require-prop-types": "error",

         // Enforce v-bind shorthand: `:prop` not `v-bind:prop`
         "vue/v-bind-style": "error",

         // Enforce v-on shorthand: `@click` not `v-on:click`
         "vue/v-on-style": "error",

         // Self-close tags with no content: <MyComp /> not <MyComp></MyComp>
         "vue/html-self-closing": ["error", {
            html: { void: "always", normal: "always", component: "always" },
            svg: "always",
            math: "always",
         }],

         // No unused component registrations or variables in <template>
         "vue/no-unused-vars": "error",

         // Consistent order: <script> → <template> → <style> (Nuxt convention)
         "vue/block-order": ["error", {
            order: ["template", "script", "style"],
         }],

         // Enforce defineProps/defineEmits order consistency
         "vue/define-macros-order": ["error", {
            order: ["defineOptions", "defineProps", "defineEmits", "defineSlots"],
         }],
      },
   },

   // ─── 4. GENERAL JS/TS — arrow functions + code style ─────────────────────
   {
      files: ["**/*.{ts,js,mjs,vue}"],
      rules: {
         // ── Arrow functions (your project standard) ──────────────────────────
         // Enforce arrow functions for callbacks and expressions
         "prefer-arrow-callback": "error",

         // Arrow function body: use braces only when needed
         "arrow-body-style": ["error", "as-needed"],

         // ── Variables ────────────────────────────────────────────────────────
         // No `var` — use `const` or `let`
         "no-var": "error",

         // Use `const` when variable is never reassigned
         "prefer-const": "error",

         // ── Imports ──────────────────────────────────────────────────────────
         // No duplicate imports from the same module
         "no-duplicate-imports": "error",

         // ── Code quality ─────────────────────────────────────────────────────
         // No `console.log` left in production — use a logger instead
         "no-console": ["warn", { allow: ["warn", "error", "info"] }],

         // No `debugger` statements
         "no-debugger": "error",

         // Require `===` and `!==` (no loose equality)
         "eqeqeq": ["error", "always", { null: "ignore" }],

         // Prefer template literals over string concatenation
         "prefer-template": "error",

         // Use object destructuring where possible
         "prefer-destructuring": ["warn", {
            array: false, // array destructuring can be confusing, skip
            object: true,
         }],
      },
   },

   // ─── 5. STYLISTIC — formatting (replaces Prettier) ───────────────────────
   // These rules are powered by @stylistic/eslint-plugin (auto-enabled by
   // @nuxt/eslint when `eslint.config.stylistic: true` is set in nuxt.config.ts)
   {
      files: ["**/*.{ts,js,mjs,vue}"],
      rules: {
         "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
         "@stylistic/semi": ["error", "never"], // no semicolons
         "@stylistic/indent": ["error", 3], // 3-space indent
         "@stylistic/comma-dangle": ["error", "always-multiline"],
         "@stylistic/arrow-parens": ["error", "always"], // (x) => not x =>
         "@stylistic/object-curly-spacing": ["error", "always"],
         "@stylistic/space-before-function-paren": ["error", "never"],
         // "@stylistic/max-len": ["warn", { code: 100, ignoreUrls: true, ignoreStrings: true }],
      },
   },

   // ─── 6a. OG IMAGE COMPONENTS — names are dictated by nuxt-og-image ────────
   // Files must be named <Name>.<renderer>.vue (e.g. Home.satori.vue), which
   // the multi-word rule flags. The module owns this convention, so relax it.
   {
      files: ["**/components/OgImage/**/*.vue"],
      rules: {
         "vue/multi-word-component-names": "off",
      },
   },

   // ─── 6. NUXT OVERRIDES — relax certain rules for Nuxt-specific files ─────
   {
      files: [
         "nuxt.config.ts",
         "app.config.ts",
         "**/server/**/*.ts",
         "**/composables/**/*.ts",
         "**/plugins/**/*.ts",
      ],
      rules: {
         // Server routes and config files often need `any` for flexibility
         "@typescript-eslint/no-explicit-any": "warn",

         // Nuxt auto-imports mean explicit return types are less critical here
         "@typescript-eslint/explicit-function-return-type": "off",
      },
   },

)

// ─── nuxt.config.ts reminder ─────────────────────────────────────────────────
//
// Make sure your nuxt.config.ts has:
//
// export default defineNuxtConfig({
//   modules: ['@nuxt/eslint'],
//   eslint: {
//     config: {
//       stylistic: true,   // enables @stylistic rules (section 5 above)
//     },
//   },
// })
