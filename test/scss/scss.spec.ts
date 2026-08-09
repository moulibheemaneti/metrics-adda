import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { describe, it } from "vitest"
import { runSass } from "sass-true"

const here = dirname(fileURLToPath(import.meta.url))

// Every *.test.scss in this folder is a sass-true suite. Each `@include test()`
// becomes a Vitest test case, so failures surface with per-assertion detail.
runSass({ describe, it }, join(here, "functions.test.scss"))
