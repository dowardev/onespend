// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { CapacitorConfig } from '@capacitor/cli';

const liveReloadUrl = process.env.CAPACITOR_LIVE_RELOAD_URL;

const config: CapacitorConfig = {
  appId: 'com.dowardev.onespend',
  appName: 'OneSpend',
  webDir: 'dist',
  ...(liveReloadUrl
    ? { server: { url: liveReloadUrl, cleartext: true } }
    : {})
};

export default config;
