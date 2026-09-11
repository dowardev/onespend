// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { test, expect, type Page } from '@playwright/test'

const VIEWPORTS = [
  { name: 'phone', width: 360, height: 720 },
  { name: 'tablet', width: 768, height: 720 },
  { name: 'desktop', width: 1280, height: 720 },
]

const ROUTES = [
  '/budget',
  '/suppliers',
  '/recurring',
  '/statistics/performance',
  '/admin/maintenance',
  '/admin/personalization',
  '/sync',
]

async function setupAuth(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('@dowardev/sso-client:token', 'test-sso-token')
  })
}

async function mockExternalCalls(page: Page) {
  // Port-agnostic on purpose: matching on "not the dev server" pinned these specs
  // to 5173, a port another project uses on some machines. Mock the API/SSO calls
  // by path instead, so the suite runs on any port.
  await page.route(
    (url) => url.pathname.startsWith('/api/') || url.pathname.includes('user-auth'),
    async (route) => {
    const url = route.request().url()
    if (url.includes('/user-auth')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: '1', name: 'Test User', user: 'testuser', email: 'test@test.com', roles: [] }),
      })
    } else if (url.includes('/api/sync/')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, results: { created: {}, updated: {}, deleted: {}, skipped: {}, conflicts: {} }, serverTime: Date.now() }) })
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    }
  })
}

for (const vp of VIEWPORTS) {
  for (const route of ROUTES) {
    test(`${vp.name} (${vp.width}px) — ${route} has no horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await setupAuth(page)
      await mockExternalCalls(page)

      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 45000 })
      // wait for Vue app to mount and the global dev db to exist (same pattern as conflict-resolution.spec.ts)
      await page.waitForFunction(() => {
        const w = window as Record<string, unknown>
        return typeof w.__devDb !== 'undefined'
      }, { timeout: 15000 })

      const overflow = await page.evaluate(() => {
        const doc = document.documentElement
        return {
          scrollWidth: doc.scrollWidth,
          innerWidth: window.innerWidth,
          overflowing: doc.scrollWidth > window.innerWidth + 1,
        }
      })

      expect(overflow.overflowing, `horizontal overflow at ${vp.width}px: scrollWidth=${overflow.scrollWidth}, innerWidth=${overflow.innerWidth}`).toBe(false)
    })
  }
}