# F-Droid distribution

This directory documents how OneSpend is published on
[F-Droid](https://f-droid.org) and how that differs from other stores.

## How F-Droid publishing works

F-Droid does not accept uploaded APKs. Instead:

1. A build recipe (metadata YAML) is submitted via merge request to the
   [fdroiddata](https://gitlab.com/fdroid/fdroiddata) repository.
2. F-Droid's servers build the APK from the source tag declared in the recipe,
   in a clean environment.
3. The APK is signed with **F-Droid's own signing key**, not the release
   keystore used for AppGallery / Google Play.

### Consequences

- F-Droid builds **cannot be installed as updates** over AppGallery or Play
  installs (different signing keys). They are separate installation channels.
- No proprietary dependencies or trackers are allowed in the build.
- Updates are picked up from new Git tags on the upstream repository.

## Build verification (proprietary-dependency check)

Verified for LBDS-198:

- Capacitor plugins: `@capacitor/app`, `@capacitor/haptics`,
  `@capacitor/keyboard`, `@capacitor/status-bar` — all official, open source.
- Gradle dependencies: only AndroidX libraries and Capacitor core; no Google
  Play Services, no Firebase, no Crashlytics, no advertising ID. The leftover
  `com.google.gms:google-services` classpath was removed from
  `front/android/build.gradle` — it was never applied (no `google-services.json`
  in the repo) and only pulled a Google component unnecessarily.
- Web bundle: built locally (`pnpm run build`) and copied into the
  Android project at build time by `npx cap sync android` (the dist/
  output is not committed to the repository); no remote code
  injection configured.

## Build steps

The F-Droid build mirrors the validated local release build, with the public
backend/SSO endpoints injected as exported variables (there is no
`.env.production` file on the build server, and `build:native` reads
`process.env` first for exactly this reason):

```bash
cd front
export VITE_API_URL=<public api url>
export VITE_SSO_URL=<public sso api url>
export VITE_SSO_FRONTEND_URL=<public sso frontend url>
export SSO_CLIENT_ID_NATIVE=<public native client id>
pnpm install
pnpm run build:native
npx cap sync android
cd android
./gradlew assembleRelease
```

> `pnpm run build` (plain web build) is NOT enough for the native app: it
> would bake the WEB SSO client id and native sign-in would fail with a
> `redirect_uri` mismatch. Always use `build:native` (see `front/ANDROID.md`).

## Recipe file

The file `fdroid/com.dowardev.onespend.yml` in this repo IS the submission:
copy it to `metadata/com.dowardev.onespend.yml` in a fork of
[fdroiddata](https://gitlab.com/fdroid/fdroiddata), replacing the
`__PUBLIC_*__` placeholders with the real public values, and open the MR.
It already carries the real values for the current release:

| Field | Value | Source |
| ----- | ----- | ------ |
| `versionName` | `0.76.3` | `"version"` in `front/package.json` |
| `versionCode` | `7603` | formula `major*100000 + minor*100 + patch` |
| `commit` | `v0.76.3` | exact tag name (already pushed) |
| `CurrentVersion` / `CurrentVersionCode` | `0.76.3` / `7603` | bumped by hand per release (see below) |

Updates are **manual** (`AutoUpdateMode: None` / `UpdateCheckMode: None`).
Auto-update is impossible here: `versionCode` is *computed* from semver
(`major*100000 + minor*100 + patch`), so no manifest field or tag regex
yields it, and the fdroiddata schema forbids combining `Tags` with
`UpdateCheckIgnore`. For each release, open a minimal MR to fdroiddata
bumping only `CurrentVersion` / `CurrentVersionCode`.

## Upstream metadata checklist (required before the MR)

- [x] `title.txt`, `short_description.txt` (< 80 chars, no trailing dot),
      `full_description.txt` in `en-US` and `es`
- [x] `images/icon.png` (512x512)
- [x] 7 `phoneScreenshots` per locale
- [x] `changelogs/<versionCode>.txt` per locale (max 500 chars) — one file
      per release, e.g. `en-US/changelogs/7603.txt`
- [x] Public repo with FOSS license file (`AGPL-3.0-only`)
- [x] No proprietary deps (no GMS/Firebase/Crashlytics — verified LBDS-198)
- [x] Tagged release commit (`v0.76.3` pushed)

## Signing model comparison

| Channel     | Signed with        | Update-compatible |
| ----------- | ------------------ | ----------------- |
| AppGallery  | Release keystore   | Yes               |
| Google Play | Release keystore   | Yes               |
| F-Droid     | F-Droid server key | Only within F-Droid |

The Downloads page entry lives in
`front/src/views/info/DownloadsPage.vue` and must be enabled (badge +
download link) only after the first F-Droid release is live.

## Publishing flow

### Versioning contract (no exceptions)

| Relationship | Rule |
| ------------ | ---- |
| Git tag ↔ versionName | Identical: `vX.Y.Z` ↔ `X.Y.Z` |
| versionCode | Derived integer, strictly increasing, never reused |
| One versionCode | One per tag/release |

The only source of truth for the version is `"version"` in
`front/package.json`. The Android build reads it automatically:
`front/android/app/build.gradle` derives both `versionName` (the string) and
`versionCode` (the integer) from it. You never edit the version in Gradle.

```
versionCode formula: major * 100000 + minor * 100 + patch
0.76.1 → (0*100000)+(76*100)+1 = 76001
1.0.0  → (1*100000)+(0*100)+0  = 100000
```

> Strip release-candidate suffixes for F-Droid: `1.0.0-rc.1` and `1.0.0`
> produce the same versionCode because the `-rc` part is ignored. Use clean
> semver when tagging a release for F-Droid.

### First publish

1. Set the version in `front/package.json` (clean semver, no `-rc`).
2. Commit.
3. Tag and push:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
4. Fork [`fdroiddata`](https://gitlab.com/fdroid/fdroiddata) and create
   `metadata/com.dowardev.onespend.yml` with the recipe above filled in:
   - `versionName` = version in package.json
   - `versionCode` = derived integer from the formula
   - `commit` = the exact tag name created in step 3
5. Open a merge request to `fdroiddata` describing the app and why it is
   suitable (fully open source, no trackers).
6. Wait for review. The first review can take weeks; fix feedback in the same
   MR. F-Droid then builds the tag, signs with its own key, and publishes.

### Updates (after the app is accepted)

1. Bump `"version"` in `front/package.json`.
2. Commit and tag: `git tag vX.Y.Z && git push origin vX.Y.Z`.
3. With auto-update enabled the F-Droid bots pick up the new tag
   automatically; otherwise open a minimal MR to `fdroiddata` changing only
   `CurrentVersion` / `CurrentVersionCode`.
4. F-Droid rebuilds and publishes (days, not weeks).

### What you never do

- Never upload an APK anywhere; F-Droid always builds from source.
- Never sign anything with your keystore for F-Droid; they sign with their key.
- Never enable the Downloads page F-Droid entry until the app is live in the
  F-Droid index.

### Where the pieces live

| Piece | Path |
| ----- | ---- |
| This guide / recipe draft | `fdroid/README.md` |
| Store metadata | `front/android/fastlane/metadata/android/com.dowardev.onespend/` |
| Downloads page entry | `front/src/views/info/DownloadsPage.vue` |
| Version source of truth | `front/package.json` |
