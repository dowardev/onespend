<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

Android usage and build instructions

This document explains how to run the Android app on a device and how to create
production builds (APK and AAB) from the terminal. Android Studio is **not
required** for any of these steps — Gradle and Capacitor do all the work.

Prerequisites
- JDK 21 (required by Gradle 8.14.3 / AGP 8.13; newer JDKs are not supported)
  - Linux: `export JAVA_HOME=/usr/lib/jvm/java-21-openjdk` (or your install path)
  - The project pins the version via `front/mise.toml` (`java = "21"`)
- Android SDK with platform 36 and build-tools
  - Set `ANDROID_HOME` (example: `$HOME/Android/Sdk`)
- Node.js + pnpm for the web build and Capacitor sync

Environment variables
- `JAVA_HOME` must point to a JDK 21 installation.
- `ANDROID_HOME` must point to the Android SDK root.
- `CAPACITOR_LIVE_RELOAD_URL` (optional, dev only) — overrides the `server.url`
  in `capacitor.config.ts` so the app loads from your dev server instead of the
  bundled web assets. Example: `http://192.168.1.10:8100`.

Build the debug APK
- Build the web assets and sync them into the Android project:
  pnpm run build
  npx cap sync android
- Compile the debug APK:
  cd android && ./gradlew assembleDebug
- Output: android/app/build/outputs/apk/debug/app-debug.apk

Install on a device without Android Studio
- List connected devices:
  adb devices
- Install the APK directly (device serial from `adb devices`):
  adb -s <serial> install -r android/app/build/outputs/apk/debug/app-debug.apk
- Launch the app:
  adb -s <serial> shell am start -n com.dowardev.onespend/.MainActivity

Run on a device with live reload (development loop)
- `cap run` uses native-run under the hood, which needs `ANDROID_HOME`
  exported (the `android/local.properties` file is not enough for it).
- List available targets:
  npx cap run android --list
- Run with live reload (web changes hot-apply on the device):
  npx cap run android --target <id> --live-reload --forwardPorts 8100:8100
- The `--target` flag selects the device/emulator; there is no `--device` flag
  in Capacitor 8.

Production builds (signed)
- Generate a keystore once (keep it safe, it cannot be recovered):
  keytool -genkey -v -keystore onespend-release.keystore \
    -alias onespend -keyalg RSA -keysize 2048 -validity 10000
- Configure the signing in android/app/build.gradle, e.g.:

  android {
      signingConfigs {
          release {
              storeFile file('onespend-release.keystore')
              storePassword System.getenv("KEYSTORE_PASSWORD")
              keyAlias "onespend"
              keyPassword System.getenv("KEY_PASSWORD")
          }
      }
      buildTypes {
          release {
              signingConfig signingConfigs.release
              minifyEnabled false
              proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
          }
      }
  }

  (Reading passwords from environment variables keeps them out of the repo.)
- Build the signed release APK:
  pnpm run build
  npx cap sync android
  cd android && ./gradlew assembleRelease
- Output: android/app/build/outputs/apk/release/app-release.apk

Build an Android App Bundle (AAB, required by Google Play)
- Same setup as the release APK, then:
  cd android && ./gradlew bundleRelease
- Output: android/app/build/outputs/bundle/release/app-release.aab

Notes
- An unsigned release build produces an APK/AAB that is neither installable
  nor publishable — signing is mandatory for distribution.
- Debug builds are signed automatically with the debug keystore.
- Google Play requires the AAB format; install the APK on devices directly.

Troubleshooting
- `ERR_SDK_NOT_FOUND` from native-run: export `ANDROID_HOME` before running
  `npx cap run android`.
- Gradle fails with a JDK version error: make sure `JAVA_HOME` points to
  JDK 21 (Java 26 from the system PATH is not supported by Gradle 8.14.3/AGP 8.13).
- The app keeps loading the bundled assets instead of your dev server: set
  `CAPACITOR_LIVE_RELOAD_URL` and re-run `npx cap sync android`.

This file was created to document how to run and build the Android application
for this project.