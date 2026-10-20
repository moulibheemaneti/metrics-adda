# Decibel meter

## Context

A request for a tool that measures live audio in decibels, with the Youlean
Loudness Meter as the reference. Youlean meters *loudness*: LUFS for
recordings, the scale streaming services normalise to. Asked which of the two
was meant, the answer was plainer: the decibels of the live sound, from the
microphone, and nothing more — no file upload, no loudness targets.

So this is a sound level meter, in the sense of IEC 61672: A-weighted, Fast
time-weighted, reporting the level now, the quietest and loudest moments and
the energy average. What it takes from Youlean is the display: one large
figure, a bar, and a scrolling history of the last minute.

It is the site's first tool to use a device, and the first that cannot be
exact. Both facts shaped more of it than the arithmetic did.

A second pass narrowed the reference to one page: Youlean's online loudness
and sound meter, the live microphone one. Beyond what was already here it
has a weighting switch (A, C or none), momentary and short-term LUFS, a
frequency spectrum and a NIOSH noise-dose panel. Of those four, the
spectrum was chosen, and the look stays this site's rather than Youlean's.

---

## Decisions

### A seventh nav group, `"audio"`

None of the six groups holds a microphone tool. Asked to choose between a new
group with the budget raised to seven, filing it under `"health"`, or making
room by folding BMI into `"calculators"`, the answer was a new group. The
budget in `test/unit/tools.test.ts` moved from six to seven with the reasoning
beside it, rather than being loosened to let the route through.

The cost was measured, not assumed. The header's top row needs 769px of track
where it needed 650, so it now scrolls horizontally below about 1,260px wide,
where before it held down to about 1,140px. `docs/roadmap.md` records this
under the group-cap notes: the next group is the eighth, and the single-tool
rule is the cheaper fix.

### An AudioWorklet, not an AnalyserNode

An analyser hands over only its most recent window when asked. Whatever
arrives between two polls is never measured, and a backgrounded tab polls
about once a second — the average would be a sample of the room rather than
a measure of it. The worklet sees every sample on the audio thread whatever
the page is doing, and posts a reading every 100 ms.

It is bundled by Vite's `?worker&url`, which emits it as a standalone script
and hands back its URL, in dev and in the production build alike. That was
proved with a spike before anything else was written: `audioWorklet.addModule`
needs a URL, and a worklet that failed to load would have made the rest
pointless.

### The measuring is one class, run in two places

`SoundLevelMeter` in `app/utils/decibel.ts` is everything that touches a
sample: the A-weighting filter, the Fast detector, the per-reading extremes
and energy. The worklet is a dozen lines around it. The unit tests run the
same class in plain Node against synthetic tones, because a worklet has no
test runner of its own — and a tone of known amplitude has a level that can
be worked out on paper, so the assertions are exact rather than plausible.

### A-weighting by bilinear transform, pre-warped

Six analogue poles pair off into three biquads, normalised to exactly 0 dB at
1 kHz. Pre-warping keeps the 12.2 kHz poles where they belong: without it
they land near 10.3 kHz at 48 kHz and the top octave reads over a decibel
quiet. The result is within 0.05 dB of the IEC curve to 1 kHz and within a
decibel to 12.5 kHz at 44.1 and 48 kHz. Above that it rolls off early —
about 3 dB low at 16 kHz — which is inside IEC 61672's class 1 allowance and
far inside the error of any phone microphone.

A pole at or past Nyquist is dropped rather than transformed, because `tan`
goes negative there and the filter would be unstable. A context opened on a
Bluetooth headset can run at 16 kHz, and the test sweeps 8 kHz to 192 kHz.

### Every processing stage off

`echoCancellation`, `noiseSuppression` and `autoGainControl` are all
requested false. Browsers tune microphone input for calls: gain control lifts
a quiet room and pulls a loud one down, and noise suppression removes exactly
the steady background a noise measurement is for.

### The default calibration is Android's published figure

A browser microphone is not calibrated, and no default can be right
everywhere. The one published anchor between a consumer microphone's digital
level and real sound pressure is Android's compatibility definition, which
asks that unprocessed voice capture read -22.35 dBFS for a 90 dB SPL tone at
1 kHz. The scale starts there, and a calibration of ±30 dB, in whole
decibels, is kept on the device under `ma-decibel-calibration`. Laptops apply
their own input gain and will usually read high; the note under the button
says readings are estimates before anyone presses it.

Levels stay in dBFS everywhere but the last step, where the calibration is
added. Moving the slider re-scales the number, the bar, the figures and the
whole graph at once, history included, without a stored reading changing.

### The loudest channel, not the mix

Each input channel is filtered separately and the loudest taken per block.
Interfaces routinely deliver a microphone as two channels with one silent,
which a mix would read 6 dB low, and a laptop's two microphones partly cancel
at high frequencies when summed.

### Settling, and where the Fast weighting starts

The first 250 ms are discarded: a filter starting from rest rings, and many
microphones click as they open. Neither is the room, and either would become
the session's maximum.

The Fast detector is seeded from the average of the second half of that
window, not from the first block. That was found in the browser: a 100 Hz
tone opened 3 dB low, because a 128-sample block is a third of one cycle of
a 100 Hz hum and its mean square depends on where in the wave it falls. The
unit test that now covers it sweeps the phase.

### The average is energy, and the hearing notice waits for it

The average is Leq — sound energy averaged, then converted back — because
averaging decibels would let a quiet stretch cancel a loud one. The FAQ's
example, 10 s at 90 dB and 50 s at 50 dB averaging 82 dB rather than 57, is
asserted by a unit test through the real code.

That arithmetic has a consequence the first draft missed: one clap in the
first second takes the average past 85 dB. So the hearing notice reads the
average rather than the moment, and only after ten seconds of sound. It
cites NIOSH's recommended limit — 85 dB(A) over eight hours, halving every
3 dB — and escalates at 100 dB, where that limit is fifteen minutes.

### Silence is not a quiet room

A reading below -115 dBFS is a muted or disconnected input: real microphones
hiss at around -90 dBFS. Silent readings are left out of the figures, the
number shows a dash, and after two seconds the page says the microphone is
sending silence and what to check. A sample at 99% of full scale marks the
session as clipped, with a notice that the loudest readings are capped.

### The microphone must never outlive the page

Stop, a failed start, a page change mid-run and an unplugged device all
release the tracks — which is what turns the browser's recording indicator
off — and close the context. A start is several awaits long, and the
permission prompt can sit open indefinitely, so every await checks a
generation counter and a superseded start stops the stream it was granted.
The Nuxt tests cover each path, and one was mutation-checked: removing the
cleanup on unmount fails the test written for it.

### Display

The number holds each value for 250 ms, about a hand-held meter's refresh
rate; the bar and graph move with every reading. The hold watcher is `sync`,
because a tab brought back from the background can be handed a second of
queued readings at once and a batched watcher would only see the last.

The bar is indigo on its own lighter step, turning amber at 85 dB and red at
100 — never colour alone, since the number and the comparison line say the
same. The graph is a fixed 20 to 120 dB, so it never rescales under someone
watching it, and a pointer or a sideways drag reads any moment off it.
The graph and bar are hidden from assistive technology; the three figures are
the same minute in words. The number is plain text rather than a live region,
which would talk without pause, and a polite region announces the start and
the end of a run with the average and the loudest moment spelled out.

### The spectrum: octave bands from the browser's analyser

Ten octave bands, 31.5 Hz to 16 kHz — the bands of a ten-band graphic
equaliser. Ten bars stay wide enough to read and to tap on a phone, where
a third-octave display would squeeze 31 into the same width.

The FFT is the browser's own AnalyserNode rather than code in the worklet.
The spectrum is a picture, not something averaged over the session, so the
analyser handing over only its latest window does not matter here the way
it would for the meter — and its FFT is native. It sits in line ahead of the
worklet rather than beside it: an analyser passes audio through untouched,
and being in the chain that reaches the destination keeps every browser
pulling audio into it. It runs at 8,192 points, a 171 ms window at 48 kHz
with four bins in the lowest band.

Its built-in smoothing is off, because it averages magnitudes and reads
noise about a decibel low. The page undoes the analyser's Blackman window
and 1/N scaling to get each band's share of the mean square, applies the
Fast weighting to the bands in energy, and redraws on animation frames
thinned to twenty a second — so a hidden tab does no FFT work at all.

The bars are A-weighted like the reading, so their energy adds up to it,
and the tallest is the pitch doing most to make the room loud. That is
tested rather than asserted: a chord through the emulated analyser and the
same chord through the meter agree within 0.25 dB. The loudest band is
named above the chart and held until another beats it by a decibel, or the
label would flicker between two close bands. The bars are hidden from
assistive technology and repeated as a list of ten levels in words.

The analyser mixes stereo input to mono, where the meter takes the loudest
channel, so on an interface with one silent channel the bands will sum to
6 dB under the reading. A rare setup, and the reading is the figure that
matters.

### Server-rendered context

The reference table — typical levels of eleven everyday sounds, rounded — and
the FAQ are in the prerendered HTML, so the page carries real content before
anyone presses Start. The row nearest the live reading is highlighted as it
moves.

---

## Files touched

| File | Change |
| --- | --- |
| `app/utils/decibel.ts` | New. Filter, meter, session arithmetic, calibration, references |
| `app/worklets/decibel-meter.ts` | New. The audio-thread processor |
| `app/composables/useDecibelMeter.ts` | New. Microphone, graph and run lifecycle |
| `app/composables/useDecibelCalibration.ts` | New. The stored calibration |
| `app/components/DecibelMeterPanel.vue` | New. The panel |
| `app/pages/decibel-meter.vue` | New. The page |
| `app/utils/tools.ts` | `"audio"` group and the registry entry |
| `app/utils/copy.ts` | Tool, SEO, FAQ, group and panel copy; privacy policy |
| `test/unit/decibel.test.ts` | New. The arithmetic, against IEC values and synthetic tones |
| `test/nuxt/decibel-meter.nuxt.test.ts` | New. The wiring, with a faked audio stack |
| `test/unit/tools.test.ts` | Group budget six to seven, with the reason |
| `README.md`, `docs/roadmap.md`, `nuxt.config.ts` | The tool, the nav cost, page counts |
| `app/pages/index.vue`, hub pages, `ToolGroupSection.vue` | Comments counting six groups now say seven |

The privacy policy gained a paragraph on the microphone and names the
calibration among the stored preferences; its date moved with it.

---

## Verification

- `bun lint`, `bun typecheck` and `bun run test` pass.
- `bun run build`, then `bun seo:verify` and `bun pwa:verify` pass, with
  `/decibel-meter` prerendered, in the sitemap, and its worklet precached so
  the meter works offline.
- In Chromium, with a WAV fed in as the microphone
  (`--use-file-for-fake-audio-capture`): a 1 kHz tone at -42.35 dBFS reads
  70 dB, the same amplitude at 100 Hz reads 51 dB — A-weighting's 19 dB — and
  a full-scale tone reads 109 dB with the clipping notice. No console errors
  or warnings, light and dark, and no horizontal overflow at 320, 390 and
  1280px.
- The spectrum, the same way: the 1 kHz tone names the 1 kHz band as loudest
  at 70 dB, and the 100 Hz tone the 125 Hz band at 51 dB — each matching the
  reading above it.
- axe-core at WCAG 2.1 AA finds nothing at 320, 390 and 1280px in either
  theme, idle, running, and with the hearing and clipping notices showing.

## Open questions

- **The default calibration is unverified on real hardware.** It rests on
  Android's published figure. A few readings from real phones and laptops
  against a meter would show whether the default wants moving, or wants to
  differ by platform.
- **Firefox and Safari were not run.** Both support AudioWorklet and the
  constraints used, but only Chromium was driven here. Safari's handling of
  an AudioContext created before the permission prompt resolves is the part
  most worth checking by hand.
- **Android app.** The Trusted Web Activity delegates the microphone
  permission to Chrome, so the shell should need no change — but the Play
  Console's data safety answers should be re-read now that a page can use
  the microphone, even though nothing it hears leaves the device.
