# F-Droid distribution

This directory documents how OneSpend is published on
[F-Droid](https://f-droid.org) and how that differs from other stores.

Status: the app is in the index since v0.79.0. The 0.81.0 (versionCode 8100)
build block is merged upstream in
[fdroiddata](https://gitlab.com/fdroid/fdroiddata) `master` — commit `c883782`
("bot: Update OneSpend to 8100"), added by F-Droid's `checkupdates` bot when
the `v0.81.0` tag was published. The 0.79.0 and 0.80.0 build blocks are
unchanged upstream.

The buildserver still has to publish the 0.81.0 APK: until
`https://f-droid.org/repo/com.dowardev.onespend_8100.apk` answers `200`, the
version is not in the index yet.

## How F-Droid publishing works

F-Droid does not accept uploaded APKs to publish. Instead:

1. A build recipe (metadata YAML) is submitted as a merge request to
   [fdroiddata](https://gitlab.com/fdroid/fdroiddata).
2. F-Droid's buildserver compiles the APK from the source commit declared in
   the recipe, in a clean environment.
3. Whether the published APK keeps our signature depends on the reproducible
   build check described below.

### Consequences

- No proprietary dependencies or trackers are allowed in the build.
- Updates come from new Git tags on the upstream repository; the
  `checkupdates` bot commits the new build block straight into the upstream
  `master`, so no merge request from us is needed.
- F-Droid is a separate distribution channel. It only becomes update-compatible
  with AppGallery / Google Play when the reproducible build check passes and
  F-Droid publishes our own signed APK.

## Reproducible build

The recipe declares both `Binaries` (our published APK) and
`AllowedAPKSigningKeys` (our release key fingerprint):

```yaml
Binaries: https://gitlab.com/dowardev/onespend/-/releases/v%v/downloads/onespend-%v.apk
AllowedAPKSigningKeys: c6d2961a958ea23a36925ea818e0605b28c9f8e60f84f0432c7e68ee595fccce
```

`%v` is substituted with the version name by F-Droid.

- If F-Droid's build matches the APK we published, F-Droid distributes **our**
  signed APK — same key as the other channels, so users can switch between them.
- If it does not match, F-Droid investigates. Our APK is never distributed
  without that check, because `AllowedAPKSigningKeys` restricts which signature
  may be accepted.

Because of this, **every release must also publish its signed APK**, with a file
name that the `Binaries` URL pattern resolves (see the release checklist below).
The APK is built with JDK 21, matching the F-Droid buildserver toolchain.

## Build verification (proprietary-dependency check)

Verified for LBDS-198:

- Capacitor plugins: `@capacitor/app`, `@capacitor/haptics`,
  `@capacitor/keyboard`, `@capacitor/status-bar` — all official, open source.
- Gradle dependencies: only AndroidX libraries and Capacitor core; no Google
  Play Services, no Firebase, no Crashlytics, no advertising ID. The leftover
  `com.google.gms:google-services` classpath was removed from
  `front/android/build.gradle` — it was never applied (no `google-services.json`
  in the repo) and only pulled a Google component unnecessarily.
- Web bundle: built locally and copied into the Android project at build time by
  `npx cap sync android` (the `dist/` output is not committed); no remote code
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

`fdroid/com.dowardev.onespend.yml` in this repo mirrors
`metadata/com.dowardev.onespend.yml` in
[fdroiddata](https://gitlab.com/fdroid/fdroiddata) `master`. The upstream copy
is the source of truth; update this mirror whenever the upstream metadata
changes.

If a merge request ever has to be opened by hand, branch from the current
upstream `master`, not from the fork's own `master`: a branch cut from an older
fork state makes the merge request show the whole metadata file as newly added
instead of the real diff, and it can silently drop the build configuration of
an already published version.

Current build block:

| Field | Value |
| ----- | ----- |
| `versionName` | `0.81.0` (`"version"` in `front/package.json`) |
| `versionCode` | `8100` (`"versionCode"` in `front/package.json`) |
| `commit` | `810eee6ba0cfd1187f96388413502e1f51dc4661` — full SHA, never a tag |

The recipe pins the **full commit hash** on purpose: a tag can be moved, a hash
cannot, and the buildserver needs an immutable revision.

## Autoupdate

Autoupdate is enabled and reads both values from `front/package.json`:

```yaml
AutoUpdateMode: Version
UpdateCheckMode: Tags ^v[\d.]+$
UpdateCheckData: front/package.json|"versionCode":\s*(\d+)|.|"version":\s*"([\d.]+)"
```

`UpdateCheckData` is required because `checkupdates` cannot evaluate the semver
formula in `build.gradle`: it only extracts values with regexes. That is why
`versionCode` is stored explicitly in `front/package.json` instead of being
derived. `build.gradle` still falls back to the formula
(`major * 100000 + minor * 100 + patch`) when the field is absent.

The tag pattern excludes `-rc` tags, which would otherwise collide on
versionCode.

## Release checklist (every release)

1. Bump **both** `"version"` and `"versionCode"` in `front/package.json`. They
   must stay consistent with each other:
   ```
   versionCode = major * 100000 + minor * 100 + patch
   0.76.4 → (0*100000)+(76*100)+4 = 7604
   1.0.0  → (1*100000)+(0*100)+0  = 100000
   ```
2. Add `changelogs/<versionCode>.txt` in both `en-US` and `es` (max 500 chars).
3. Add the release entry to the root `CHANGELOG.md`.
4. Commit, then tag and push — clean semver, no `-rc` suffix:
   ```bash
   git tag vX.Y.Z
   git push origin main vX.Y.Z
   ```
5. Build the signed release APK (see Build steps) and publish it as a GitLab
   release asset named `onespend-X.Y.Z.apk`, so the `Binaries` URL resolves:
   ```bash
   glab release create vX.Y.Z --repo dowardev/onespend \
     "/path/to/app-release.apk#onespend-X.Y.Z.apk"
   ```
   Verify the download works before moving on.
6. F-Droid's `checkupdates` bot reacts to the tag: it commits the new build
   block directly into `fdroid/fdroiddata` `master` (commit
   "bot: Update OneSpend to `<versionCode>`") and bumps `CurrentVersion` /
   `CurrentVersionCode`. **We do not open a merge request**: the bot races
   us, and a hand-made one that is cut from a master that already carries the
   new block ends up with a duplicate build block, which fails the schema
   validation with `non-unique elements`. If the bot ever does not pick the
   version up, open the merge request by hand, but branch from the current
   upstream `master` (not from a fork's own `master`, which lags behind) so
   the diff shows only the new build block, and pin the **full commit hash**
   instead of the tag.
7. Wait for the buildserver. It compiles the recipe, runs the reproducible
   build check against our signed APK and only then publishes the version to
   the index. This takes **3 to 4 days** in practice: 0.79.0 took 4 days and
   0.80.0 took 3 days between the metadata commit and the APK appearing.
   Verify with:
   ```bash
   curl -sI https://f-droid.org/repo/com.dowardev.onespend_<versionCode>.apk | head -1
   ```
   A `404` means "not published yet", not "failed". The package page
   (https://f-droid.org/packages/com.dowardev.onespend/) shows the published
   version as *suggested* once the build lands.
8. Mirror the new metadata block into `fdroid/com.dowardev.onespend.yml` in
   this repo, so the mirror keeps matching the upstream metadata.

## Store metadata

Store metadata lives in the standard Triple-T / Fastlane layout, one directory
per locale, with the icon inside each locale:

```
front/android/fastlane/metadata/android/
├── en-US/
│   ├── title.txt, short_description.txt, full_description.txt
│   ├── changelogs/<versionCode>.txt
│   └── images/icon.png, images/phoneScreenshots/*.png
└── es/   (same)
```

- `short_description.txt` must stay under 80 characters and have no trailing dot.
- `full_description.txt` must not duplicate a name or summary line.
- The old layout with an `<applicationId>/` level in between is not detected.

## Signing model comparison

| Channel     | Signed with        | Update-compatible |
| ----------- | ------------------ | ----------------- |
| AppGallery  | Release keystore   | Yes               |
| Google Play | Release keystore   | Yes               |
| F-Droid     | Release keystore   | Yes, when the reproducible build check passes |

The Downloads page entry lives in
`front/src/views/info/DownloadsPage.vue` and must be enabled (badge +
download link) only after the first F-Droid release is live.

## What you never do

- Never open a merge request to `fdroiddata` for a version you already
  tagged: the `checkupdates` bot commits the build block on its own, and a
  duplicate block fails the schema validation.
- Never move a tag that a recipe already pins — submit a new version instead.
- Never commit a keystore or its passwords.
- Never enable the Downloads page F-Droid entry until the app is live in the
  F-Droid index.
- Never edit the version in `build.gradle`; `front/package.json` is the single
  source of truth for both `versionName` and `versionCode`.

## Where the pieces live

| Piece | Path |
| ----- | ---- |
| This guide | `fdroid/README.md` |
| Recipe (mirror of the submission) | `fdroid/com.dowardev.onespend.yml` |
| Store metadata | `front/android/fastlane/metadata/android/{en-US,es}/` |
| Downloads page entry | `front/src/views/info/DownloadsPage.vue` |
| Version source of truth | `front/package.json` (`version` + `versionCode`) |
