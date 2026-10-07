// SPDX-FileCopyrightText: 2026 DowarDev
// SPDX-License-Identifier: AGPL-3.0-only
import { test, expect } from '@playwright/test';

test('downloads page icons render correctly', async ({ page }) => {
  test.setTimeout(60000);
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
  page.on('console', (msg) => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
  const resp = await page.goto('/downloads', { waitUntil: 'domcontentloaded' });
  console.log('Response status:', resp?.status());
  await page.waitForTimeout(3000);
  const url = page.url();
  console.log('Final URL:', url);
  const title = await page.title();
  console.log('Title:', title);

  // Click all accordion headers to expand them
  const headers = page.locator('ion-item[slot="header"]');
  const hcount = await headers.count();
  console.log(`Found ${hcount} accordion headers`);
  for (let i = 0; i < hcount; i++) {
    try { await headers.nth(i).click({ timeout: 1000 }); } catch {}
  }
  await page.waitForTimeout(1500);

  // Screenshot full page
  await page.screenshot({ path: '/tmp/downloads-icons.png', fullPage: true });

  // Check each brand icon has a non-empty <path d="...">
  const brandIcons = page.locator('svg.brand-icon');
  const count = await brandIcons.count();
  console.log(`Found ${count} brand icons`);
  for (let i = 0; i < count; i++) {
    const path = brandIcons.nth(i).locator('path');
    const d = await path.getAttribute('d').catch(() => '');
    const fill = await path.getAttribute('fill').catch(() => '');
    const label = await brandIcons.nth(i).getAttribute('aria-label').catch(() => '');
    console.log(`Icon ${i}: aria-label="${label}" fill="${fill}" d-len=${d?.length ?? 0}`);
    expect(d, `Icon ${i} (${label}) must have a <path d="...">`).toBeTruthy();
    expect(d!.length, `Icon ${i} (${label}) path must be non-trivial`).toBeGreaterThan(50);
  }
});
