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

```bash
cd front
pnpm install
pnpm run build
npx cap sync android
cd android
./gradlew assembleRelease
```

## Recipe draft

The metadata YAML below is the base for the merge request to fdroiddata.
Fields like `CurrentVersion` are maintained by the F-Droid update bot once the
app is accepted.

```yaml
Categories:
  - Money
License: AGPL-3.0-only
AuthorName: DowarDev
WebSite: https://onespend.dowar.xyz
SourceCode: https://gitlab.com/dowardev/onespend
IssueTracker: https://gitlab.com/dowardev/onespend/-/issues

RepoType: git
Repo: https://gitlab.com/dowardev/onespend.git

Builds:
  - versionName: <x.y.z>
    versionCode: <n>
    commit: <release tag>
    subdir: front/android/app
    sudo:
      - apt-get update
      - apt-get install -y npm
          - npm install --global pnpm@latest-10
    output: build/outputs/apk/release/app-release-unsigned.apk
    build:
      - cd ../..
      - pnpm install
      - pnpm run build
      - npx cap sync android
      - cd android
      - gradle assembleRelease
```

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
