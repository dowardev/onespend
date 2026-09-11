// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

// Build for the native (Capacitor) app.
//
// The web build and the native app must use DIFFERENT SSO clients: the server
// validates `redirect_url` by exact match and a client stores a single value, so
// the web client (which registers the https callback) cannot authorise the
// native one (which registers a custom scheme like
// `com.dowardev.onespend://auth/callback`). Shipping the web client id in a
// native build fails at sign-in with a redirect_uri mismatch, and nothing in the
// UI explains why.
//
// The id therefore comes from the environment instead of being hardcoded here.
// Set `SSO_CLIENT_ID_NATIVE` next to the other SSO settings (see
// `.env.production.example`) and a fresh clone only has to change that value.
// The variable deliberately has no `VITE_` prefix: it is read at build time and
// never needs to reach the browser bundle.
import { build, loadEnv } from 'vite'

const mode = 'production'
const env = loadEnv(mode, process.cwd(), '')
const nativeClientId = env.SSO_CLIENT_ID_NATIVE

if (!nativeClientId) {
  console.warn(
    '[build:native] SSO_CLIENT_ID_NATIVE is not set — falling back to VITE_SSO_CLIENT_ID, ' +
      'which is the WEB client. The resulting build will fail native sign-in with a ' +
      'redirect_uri mismatch. Add SSO_CLIENT_ID_NATIVE to your .env.production.',
  )
}

process.env.VITE_SSO_CLIENT_ID = nativeClientId || env.VITE_SSO_CLIENT_ID || ''

await build({ mode })
