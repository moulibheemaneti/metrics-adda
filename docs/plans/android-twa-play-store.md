# Metrics Adda on Google Play — Trusted Web Activity

## Context

The site is a fully prerendered Nuxt app with no server, no accounts and no
database, and it has been an installable, CI-verified PWA since the PWA work
landed. Getting it onto Play therefore did not need a second codebase — it
needed packaging.

A **Trusted Web Activity** is a thin Android shell that renders
`https://www.metricsadda.com` in full Chrome with no address bar. It is not a
WebView and not a copy: the app loads the deployed site, so **content changes
ship through the normal Vercel deploy and need no Play release**. Only changes
to the shell itself — icons, name, package id, target SDK, shortcuts — need a
new bundle.

Capacitor was the alternative and was rejected. It would bundle
`.output/public` into the APK, which means every content change becomes a Play
release with a review queue in front of it, and a WebView wrapper draws more
scrutiny under Play's minimum-functionality policy than Google's own
TWA path does.

## What is built

| Piece | Where | Commit |
| --- | --- | --- |
| Bubblewrap manifest, target-SDK patch | `android/`, `scripts/android/` | `30acf13` |
| Asset links + `pwa:verify` gate | `public/.well-known/`, `scripts/pwa/verify.sh` | `60e5ca5` |
| Store icon, feature graphic, screenshots | `play-assets/`, `scripts/play/` | `50d2116` |
| Signed-bundle CI workflow | `.github/workflows/android.yml` | `b6120d9` |

## What is not built, and why

The generated Gradle project is **not** in the repo. `bubblewrap init` is
interactive, so it cannot be produced by CI or by an agent — it has to be run
once on a machine with the Android SDK, and its output committed. Until then
the CI workflow fails on its first step by design, with a pointer to
`android/README.md`.

`assetlinks.json` ships with an empty fingerprint list for a reason given in
step 6 below: the fingerprint that matters does not exist until Play has seen
a bundle.

---

## Release runbook

Ordered because several steps genuinely cannot move: the fingerprint depends
on the upload, and the upload depends on the keystore.

### 1. Generate the upload keystore

```bash
keytool -genkeypair -v -keystore android/upload.jks \
  -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

Back it up somewhere durable and out of the repo. `*.jks` is gitignored.
Losing this costs you the ability to update the app — Play App Signing
protects users from a lost *upload* key, but you still have to prove identity
to Google to reset it.

### 2. Generate the Gradle project

```bash
npm install -g @bubblewrap/cli@1.10.0
cd android
bubblewrap init --manifest https://www.metricsadda.com/manifest.webmanifest
```

`init` asks a series of questions and then **overwrites `twa-manifest.json`
with its own answers**. Restore the reviewed one and regenerate from it:

```bash
git checkout android/twa-manifest.json
bubblewrap update --skipVersionUpgrade
```

Then commit the generated project.

### 3. First local build

```bash
cd android
bubblewrap update --skipVersionUpgrade
../scripts/android/target-sdk.sh
bubblewrap build --skipPwaValidation
```

This is the first real test of the API 36 requirement. `target-sdk.sh` forces
it and fails loudly if Bubblewrap's template has moved; if Gradle then refuses
the level, the template needs a newer AGP and that is the thing to fix before
anything else.

### 4. Sanity-check the APK on a device

```bash
adb install -r android/app-release-signed.apk
```

Expect an address bar at this point — asset links are not set up yet. What you
are checking is that the app launches, the tools work, and the icon and splash
look right.

### 5. Upload to internal testing

Upload `android/app-release-bundle.aab` to the **internal testing** track. This
is what enrols the app in Play App Signing.

### 6. Fill in the asset links

Play Console → *Test and release → Setup → App signing* now shows two SHA-256
fingerprints. Put **both** into
`public/.well-known/assetlinks.json` → `sha256_cert_fingerprints`:

- the **app signing key** — what Play re-signs every install with, so this is
  what real users verify against
- the **upload key** — what your local builds are signed with. Omit it and
  every side-loaded test build keeps its address bar while production is fine,
  which is a confusing afternoon.

`bubblewrap fingerprint generateAssetLinks` writes the file for you. Then
deploy the site — this file goes out with the website, not with the app.

### 7. Verify the asset links properly

Google's verifier, not the visual check:

```
https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://www.metricsadda.com&relation=delegate_permission/common.handle_all_urls
```

Then reinstall the APK. **No address bar means it worked.** Also confirm
`bun run pwa:verify` now reports two well-formed fingerprints rather than
`pending`.

### 8. Complete the Play Console listing

See the checklist below.

### 9. Closed testing, if it applies

If this personal developer account was created after **13 November 2023**,
production access requires **12 testers opted in for 14 continuous days**. The
clock starts once the release is approved and the twelfth tester has opted in.
This is a calendar constraint with no engineering shortcut, so start it the
day the internal build works.

### 10. Promote to production

---

## Play Console checklist

### Data safety — read this one carefully

The obvious answer is "collects nothing", and it is wrong.

The tools themselves collect nothing: everything computes in the browser and
nothing typed is transmitted, which is what the privacy policy says and what
the store listing should say. **But the deployed site loads Vercel Analytics
and Speed Insights** — `nuxt.config.ts` gates them on the `VERCEL` environment
variable, which is set on the production deploy. A TWA renders the live site,
so the app inherits them.

So the honest answers are:

| Question | Answer |
| --- | --- |
| Does the app collect or share user data? | **Yes** |
| Data type | App activity → *App interactions*; plus *Diagnostics* for Speed Insights |
| Collected or shared? | Collected |
| Processed ephemerally? | No |
| Linked to identity? | No |
| Required or optional? | Required |
| Purpose | Analytics |
| Ads / advertising ID | **No** — `<AdSlot />` is commented out in `app/layouts/default.vue` |

If AdSense is ever re-enabled on the site, the app inherits it on the next
launch with no Play release involved, and Play will not notice — **the "contains
ads" declaration and the advertising-ID entry in this form must be updated
before the ads go live**, not after.

### Ads

**No** for v1. See above for the condition that changes it.

### Content rating

Utility with no user-generated content, no social features, no purchases —
expect **Everyone**. Answer the questionnaire honestly; it is short.

### Target audience

Not directed at children. Keep the app out of the Families programme: it has
no age gate and the privacy policy has a "Children" section rather than a
COPPA-compliant flow.

### Privacy policy URL

`https://www.metricsadda.com/privacy-policy` — already live.

### App access

No login. Tick "All functionality is available without special access".

---

## Store listing copy

Ready to paste. Character budgets are Play's; the counts were checked against
them.

**App name** (max 30)

```
Metrics Adda: Unit Converter
```

**Short description** (max 80)

```
Fast, free unit converters and everyday tools. Works offline, no sign-up.
```

**Full description** (max 4000)

```
Metrics Adda is a set of 18 small, fast tools for the conversions and checks you do all the time — and it keeps working when your signal does not.

Nothing you type is sent anywhere. Every tool runs on your device, so there is no account to make, nothing to upload, and no waiting on a server. Results update as you type; there is no submit button.

CONVERTERS
• Weight — kg, lb, oz, g, stone and tonnes
• Height — cm, m, feet and inches
• Temperature — Celsius, Fahrenheit and kelvin
• Speed — km/h, mph, m/s, ft/s and knots
• Volume — litres, millilitres, gallons, pints and cups
• Area — m², sq ft, acres, hectares and sq miles
• Time — milliseconds, seconds, minutes, hours and days
• Data storage — bytes, KB, MB, GB, TB and KiB, MiB, GiB, TiB

CALCULATORS
• Percentage — percent of, percent change, increase and decrease
• Age — years, months, days and your next birthday
• BMI — body mass index, body fat and daily energy

TEXT TOOLS
• Word counter — words, characters, sentences and reading time
• Case converter — UPPER, lower, Title, camelCase and snake_case
• Base64 encoder — encode and decode, Unicode included
• Typing speed test — words per minute, accuracy and your best

GENERATORS
• Password — strong random passwords, generated locally
• UUID — random version 4 UUIDs, up to 100 at once
• Lorem ipsum — placeholder text by paragraph, sentence or word

WHY YOU MIGHT LIKE IT
• Works offline once opened
• No sign-up and no account
• Light and dark themes, following your system setting
• Small and quick — it is a website in an app, not a 60 MB download

Metrics Adda is free to use.
```

### Graphics

Generated by `bun run play:assets` and `bun run play:screenshots` — see
`play-assets/README.md`.

| Play field | File |
| --- | --- |
| App icon | `play-assets/icon-512.png` |
| Feature graphic | `play-assets/feature-graphic-1024x500.png` |
| Phone screenshots | `play-assets/screenshots/phone-light/` (or `phone-dark`) |
| Tablet screenshots | `play-assets/screenshots/tablet-*/` |

---

## Deadlines

**Target API 36 from 31 August 2026.** New apps and updates submitted from
that date must target Android 16. An extension to 1 November 2026 can be
requested in Play Console. `scripts/android/target-sdk.sh` already forces 36,
but that has only been tested against synthetic Gradle files — step 3 above is
where it is proven.

**12 testers × 14 days**, if the account is a personal one created after
13 November 2023. Two weeks that cannot be compressed.

## Risks

- **Asset links are the fragile part.** They live on a domain deployed
  separately from the app, so they can break *after* release, silently, for
  every installed user, with no Android release involved. `bun run pwa:verify`
  asserts the file survives every build for exactly this reason.
- **`packageId` is permanent.** `com.moulibheemaneti.metricsadda` cannot
  change after publication without starting a new listing with no upgrade
  path.
- **Minimum functionality policy.** Lower risk for a TWA than a WebView
  wrapper, but not zero. The defence is that this is a genuinely useful
  offline tool set rather than a bookmark.
- **Yearly maintenance.** The target API level rises every August. An app with
  no code of its own still needs a rebuild and a resubmission each year.

## Maintenance

| When | What |
| --- | --- |
| Every August | Bump `TARGET_SDK` in `scripts/android/target-sdk.sh`, rebuild, resubmit |
| Shell changes only | New bundle via the Android workflow |
| Content changes | Nothing — the Vercel deploy is the release |
| Re-enabling ads | Update the Data safety form and ads declaration **first** |
