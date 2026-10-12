# F-Droid distribution

This directory documents how OneSpend is published on
[F-Droid](https://f-droid.org) and how that differs from other stores.

Status: submitted as merge request
[`!48564`](https://gitlab.com/fdroid/fdroiddata/-/merge_requests/48564) to
[fdroiddata](https://gitlab.com/fdroid/fdroiddata). The app is not in the index
yet; the Downloads page entry stays on "Próximamente" until it is.

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
- Updates come from new Git tags on the upstream repository; a bot opens a
  merge request with the new build block.
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
`metadata/com.dowardev.onespend.yml` in the fork. Keep both in sync while the
app is under review; afterwards the fdroiddata copy is the source of truth.

Current build block:

| Field | Value |
| ----- | ----- |
| `versionName` | `0.79.0` (`"version"` in `front/package.json`) |
| `versionCode` | `7900` (`"versionCode"` in `front/package.json`) |
| `commit` | `f43930894c0bac0ac303843d78f41d28c3014af5` — full SHA, never a tag |

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
6. F-Droid's bot opens a merge request adding the new build block. Replace the
   tag with the **full commit hash** if it used one, and confirm the pipelines.

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
