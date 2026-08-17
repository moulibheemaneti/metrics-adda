# `.well-known`

One file, and it is not part of the website. `assetlinks.json` is read by
Android, not by anything the site renders.

## What it proves

The Play Store app (`android/`) is a Trusted Web Activity — an Android shell
that renders this site in full Chrome. Before Chrome will drop the browser
chrome, it fetches
`https://www.metricsadda.com/.well-known/assetlinks.json` and looks for the
app's package name alongside the SHA-256 fingerprint of the certificate the
installed APK was signed with. Match, and the app looks like an app. No match,
and it still launches — **with an address bar across the top**.

That address bar is the whole symptom. It reads as a styling bug and it is
actually a failed ownership check, so it is worth knowing the cause before
seeing it.

## Why the fingerprint list is empty

It cannot be filled in yet. The fingerprint that matters belongs to the **Play
App Signing** key, which Google generates and only reveals *after* the first
AAB has been uploaded. So the ordering is fixed: upload first, read the
fingerprints out of Play Console, then populate this file and redeploy.

Two fingerprints go in, not one:

| Key | Where it comes from | Why it is needed |
| --- | --- | --- |
| App signing key | Play Console → Test and release → Setup → App signing | What Play re-signs every install with. This is the one real users verify against. |
| Upload key | Same page | What locally built and side-loaded APKs are signed with. Without it your own test builds show an address bar and you debug a problem that is not there. |

`bubblewrap fingerprint generateAssetLinks` writes the populated file for you.

An empty list is deliberately preferred to a placeholder: a fake 64-hex string
is indistinguishable from a real one to both a reader and the CI check, so it
would quietly deploy a file asserting something untrue.

## Kept in step

`package_name` here must equal `packageId` in `android/twa-manifest.json`, and
`scripts/pwa/verify.sh` asserts both the shape of this file and that exact
value against the build output. It is checked in CI because this file is the
one piece of the app that can break *after* release — it is deployed with the
website, not with the app, so a change here silently affects every installed
user with no Android release involved.
