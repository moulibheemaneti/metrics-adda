import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { describe, it } from "vitest"
import * as sass from "sass"
import { runSass } from "sass-true"

const here = dirname(fileURLToPath(import.meta.url))

/// Compiled with `sass`, the pure-JS Dart Sass, and not by accident.
///
/// Left to itself sass-true reaches for `sass-embedded` first, and that is
/// what made this file fail about one full-suite run in four with
/// `Compiler caused error: Invalid protobuf: illegal tag: field no 0 wire
/// type 0` — a failed *file* reporting zero failed tests, which reads like
/// a real regression and is not one.
///
/// The fault is in the transport, not the stylesheet. `sass-embedded` runs
/// Dart Sass as a child process and speaks length-prefixed protobuf to it
/// over stdio; because `compile()` is synchronous, it blocks on that pipe
/// through a worker thread and `Atomics.wait`. That decode error is what
/// surfaces when the channel hands back a zero-filled buffer — the framing
/// and the stream have come apart. Measured: 6 of 6 full-suite runs pass
/// under `node`, while `bun --bun` — which is how `bun run test` and CI
/// run this — failed 2 of 4 on the same tree. So it is how that blocking
/// channel behaves on Bun, not anything in here, and not the SCSS.
///
/// `sass` is the same Dart Sass compiled to JavaScript rather than driven
/// over a pipe: no child process, no protobuf, nothing to desynchronise.
/// It costs about 200ms of import time on this one file, and both packages
/// are held at the same version, so this still compiles what the build
/// ships. Twelve consecutive full-suite runs pass under Bun.
///
/// Every *.test.scss in this folder is a sass-true suite. Each
/// `@include test()` becomes a Vitest test case, so failures surface with
/// per-assertion detail.
runSass({ describe, it, sass }, join(here, "functions.test.scss"))
