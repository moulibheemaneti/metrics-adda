/** @type {import("stylelint").Config} */
export default {
   extends: [
      "stylelint-config-standard",
      "stylelint-config-standard-scss",
   ],

   plugins: [
      "@stylistic/stylelint-plugin",
   ],

   rules: {

      // Too strict — forces empty lines before every @include, @use, @mixin etc.
      // Makes tightly grouped SCSS harder to read
      "at-rule-empty-line-before": null,

      // Forces empty line before // comments — annoying for inline notes
      "scss/double-slash-comment-empty-line-before": null,

      // Forces empty line before $variable declarations — kills readable variable blocks
      "scss/dollar-variable-empty-line-before": null,

      // Forces empty lines between every rule block — too rigid for component SCSS
      "rule-empty-line-before": null,

      // ─── HEX COLORS — enforce full 6-digit (not shorthand 3-digit) ──────────
      // "short" allows #fff, "long" requires #ffffff — we want long for clarity
      "color-hex-length": "long",

      // ─── STRING QUOTES — enforce double quotes in SCSS
      // e.g. content: "hello" not content: 'hello'
      // Note: string-quotes was removed in Stylelint v16, now lives in @stylistic/stylelint-plugin
      "@stylistic/string-quotes": "double",

      // ─── SELECTORS ──────────────────────────────────────────────────────────
      // Enforce BEM-style or hyphenated lowercase class names
      // Pattern: .block, .block__element, .block--modifier
      "selector-class-pattern": [
         "^([a-z][a-z0-9]*)(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$",
         { message: "Class names must follow BEM convention (block__element--modifier)" },
      ],

      // No ID selectors in SCSS — IDs are for JS hooks, not styling
      "selector-max-id": 0,

      // Limit nesting depth — deeply nested SCSS is hard to read and debug
      // Like Russian dolls: 3 levels max
      "max-nesting-depth": 3,

      // ─── SCSS VARIABLES ─────────────────────────────────────────────────────
      // Variables must be hyphenated lowercase: $primary-color not $primaryColor
      "scss/dollar-variable-pattern": "^[a-z][a-z0-9-]*$",

      // ─── SCSS FUNCTIONS & MIXINS ─────────────────────────────────────────────
      // Mixin names must be hyphenated lowercase: @mixin flex-center not @mixin flexCenter
      "scss/at-mixin-pattern": "^[a-z][a-z0-9-]*$",

      // No @extend with plain selectors — only extend placeholders (%placeholder)
      // @extend .some-class causes bloated CSS output
      "scss/at-extend-no-missing-placeholder": true,

      // ─── UNITS ──────────────────────────────────────────────────────────────
      // Use 0 instead of 0px, 0rem, 0em etc. — unitless zero is universal
      "length-zero-no-unit": true,

      // ─── PROPERTIES ─────────────────────────────────────────────────────────
      // No duplicate properties in a rule block
      "declaration-block-no-duplicate-properties": true,

      // No shorthand overrides — e.g. margin then margin-top in same block
      "declaration-block-no-shorthand-property-overrides": true,

      // ─── COLORS ─────────────────────────────────────────────────────────────
      // No named colors (red, blue) — use hex or CSS custom properties instead
      "color-named": "never",

      // ─── COMMENTS ───────────────────────────────────────────────────────────
      // Prefer // comments in SCSS over /* */ (scss/no-invalid-css-comments)
      // CSS block comments are stripped differently by preprocessors
      "no-invalid-double-slash-comments": null, // allow // in SCSS

   },
}
