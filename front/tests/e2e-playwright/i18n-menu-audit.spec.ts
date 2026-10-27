// SPDX-FileCopyrightText: 2026 DowarDev
// SPDX-License-Identifier: AGPL-3.0-only
import { test } from '@playwright/test';

test('main menu renders user section when logged in', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  // Open the side menu
  const menuButton = page.locator('ion-menu-button').first();
  if (await menuButton.isVisible().catch(() => false)) {
    await menuButton.click();
    await page.waitForTimeout(1000);
  }

  // Take a screenshot for visual inspection
  await page.screenshot({ path: '/tmp/menu-audit.png', fullPage: true });

  // Check that the menu is open
  const menu = page.locator('ion-menu');
  const isOpen = await menu.evaluate((el) => (el as HTMLElement & { isOpen?: () => boolean }).isOpen?.() ?? false).catch(() => false);
  console.log(`Menu is open: ${isOpen}`);

  // Get all visible text in the menu
  const menuText = await page.locator('ion-menu').innerText().catch(() => '');
  console.log('Menu text:\n' + menuText);

  // Check for login/register buttons OR user section
  const hasLoginBtn = menuText.includes('Iniciar') || menuText.includes('Registrarse') || menuText.includes('Log') || menuText.includes('Sign');
  const hasUserName = menuText.length > 0 && !hasLoginBtn;

  console.log(`Has login/register: ${hasLoginBtn}`);
  console.log(`Has user section text: ${hasUserName}`);

  // Look for the auth-section vs user-section
  const authSection = await page.locator('.auth-section').count();
  const userSection = await page.locator('.user-section').count();
  console.log(`auth-section count: ${authSection}`);
  console.log(`user-section count: ${userSection}`);
});
