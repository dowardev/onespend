// SPDX-FileCopyrightText: 2026 DowarDev
// SPDX-License-Identifier: AGPL-3.0-only
import { test, expect, type Page } from '@playwright/test';

const SPANISH_HINTS = [
  'Sesión', 'Registrarse', 'Cargos', 'Historial', 'Proveedores', 'Cuentas',
  'Sincronización', 'Finanzas', 'Día', 'Semana', 'Mes', 'Año', 'Ingresos',
  'Costo de Vida', 'Utilidad', 'Ahorro', 'Resultado', 'Gastos', 'Hoy',
  'Fecha', 'Frecuencia', 'Notas', 'Cuenta', 'Cargo', 'Ingreso', 'Producto',
  'desarrollo', 'Agregar', 'Buscar', 'Sin ', 'Comparativa',
  'Configuración', 'Personalización', 'Organizá', 'Requisitos', 'Próximamente',
  'Cancelar', 'Aplicar', 'Editar', 'Guardar', 'Eliminar', 'Cerrar',
  'Navegador + instalable', 'Instalador',
  // F8 additions
  'Pausar', 'Reanudar', 'Pausado', 'Activo',
  'Seleccionar', 'Archivos seleccionados', 'Archivos existentes',
  'Sin nombre', 'Cálculo:', 'elemento fallido', 'elementos fallidos',
];

const KEY_PATH_RE = /\b(?:sync|i18n|recurring|menu|home|auth|settings|privacy|downloads|common|budget|suppliers|statistics|views|components|accounts|admin|info)\.[a-z][a-z0-9_]*(?:\.[a-z0-9_]+){1,}/i;

async function setEnglishLocale(page: Page): Promise<void> {
  await page.goto('/', { timeout: 120000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(300);
  const menuButton = page.locator('ion-menu-button').first();
  if (await menuButton.isVisible().catch(() => false)) {
    await menuButton.click();
  }
  await page.waitForTimeout(500);
  const langSelect = page.locator('ion-select').filter({ hasText: /Español|English/ }).first();
  if (await langSelect.isVisible().catch(() => false)) {
    await langSelect.click();
    await page.waitForTimeout(500);
    const enRadio = page.locator('ion-radio:has-text("English")').first();
    if (await enRadio.isVisible().catch(() => false)) {
      await enRadio.click();
      await page.waitForTimeout(1000);
    }
  }
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(500);
}

test('spot-check: no Spanish in English mode for problematic pages', async ({ page }) => {
  test.setTimeout(300000);
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
  const pages = [
    { route: '/statistics/performance/config', label: 'PerformanceConfig' },
    { route: '/downloads', label: 'Downloads' },
    // F8: also spot-check the new hardcoded locations
    { route: '/sync/dlq', label: 'DLQ' },
    { route: '/recurring', label: 'Recurring' },
    { route: '/accounts', label: 'Accounts' },
  ];
  await setEnglishLocale(page);
  const failures: string[] = [];
  for (const p of pages) {
    const resp = await page.goto(p.route, { waitUntil: 'domcontentloaded', timeout: 120000 });
    if (!resp || resp.status() >= 400) {
      console.log(`${p.label}: HTTP ${resp?.status()}`);
      continue;
    }
    await page.waitForTimeout(3000);
    const text = (await page.locator('body').innerText()) || '';
    const spanish = SPANISH_HINTS.filter((h) => text.includes(h));
    const rawKeys = Array.from(new Set(text.match(/[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){2,}/gi) ?? []))
      .filter((s) => KEY_PATH_RE.test(s));
    if (spanish.length > 0) failures.push(`[${p.label}] Spanish: ${spanish.join(', ')}`);
    if (rawKeys.length > 0) failures.push(`[${p.label}] Raw keys: ${rawKeys.join(', ')}`);
  }
  // F8: hard assertion. A hardcoded Spanish string in English mode
  // is a regression.
  expect(failures, failures.join('\n')).toHaveLength(0);
});
