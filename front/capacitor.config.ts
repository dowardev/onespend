// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dowardev.abogaz',
  appName: 'OneSpend',
  webDir: 'dist',
  server: {
    url: 'http://10.58.84.29:8100',
    cleartext: true
  }
};

export default config;
