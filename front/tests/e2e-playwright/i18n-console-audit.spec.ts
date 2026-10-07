// SPDX-FileCopyrightText: 2026 DowarDev
// SPDX-License-Identifier: AGPL-3.0-only
import { test, expect } from '@playwright/test';

test('no i18n console errors on main pages', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (text.includes('vue-i18n') || text.includes('i18n') || text.includes('Invalid arguments') || text.includes('t is not a function')) {
        errors.push(text);
      }
    }
  });
  page.on('pageerror', (err) => {
    if (err.message.includes('vue-i18n') || err.message.includes('Invalid arguments') || err.message.includes('t is not a function')) {
      errors.push(`PAGE ERROR: ${err.message}`);
    }
  });

  const routes = ['/', '/budget', '/recurring', '/statistics/cashflow', '/statistics/performance', '/accounts', '/sync', '/downloads'];
  for (const route of routes) {
    const resp = await page.goto(route, { waitUntil: 'domcontentloaded' });
    if (!resp || resp.status() >= 400) continue;
    await page.waitForTimeout(2000);
  }

  if (errors.length > 0) {
    console.log('\n=== i18n console errors ===\n' + errors.join('\n---\n') + '\n==========================\n');
  } else {
    console.log('\n=== No i18n console errors ===\n');
  }
  expect(errors, errors.join('\n')).toHaveLength(0);
});
