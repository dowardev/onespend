// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Chromium flags shared by the Playwright config and the global setup.
 *
 * A container (the CI runner image) starts as root and has a small /dev/shm:
 * chromium refuses to run as root without `--no-sandbox` and crashes with a
 * full /dev/shm without `--disable-dev-shm-usage`. The global setup launches
 * its own browser (outside `use.launchOptions`), so both places need the same
 * flags.
 */
export const E2E_CHROMIUM_ARGS: readonly string[] = [
  '--no-sandbox',
  '--disable-dev-shm-usage',
];
