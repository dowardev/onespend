// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { test, expect, type Page, type BrowserContext } from '@playwright/test';

// Spanish words / short phrases the app must NOT render in English mode.
// The list is checked both inside the main content AND inside the
// side menu so a hardcoded string in either location is caught. Keep
// the entries short enough to be a substring of the rendered text.
const SPANISH_HINTS = [
  'Sesión', 'Registrarse', 'Iniciar', 'Cargos', 'Historial', 'Proveedores', 'Cuentas',
  'Sincronización', 'Finanzas', 'Día', 'Semana', 'Mes', 'Año', 'Ingresos',
  'Costo de Vida', 'Utilidad', 'Ahorro', 'Resultado', 'Gastos', 'Hoy',
  'Fecha', 'Frecuencia', 'Notas', 'Cuenta', 'Cargo', 'Ingreso', 'Producto',
  'desarrollo', 'Agregar', 'Buscar', 'Total', 'Sin ', 'Comparativa',
  // Added by F8 pre-merge review
  'Pausar', 'Reanudar', 'Pausado', 'Activo',
  'Seleccionar', 'Seleccione',
  'Archivos seleccionados', 'Archivos existentes',
  'Sin nombre',
  'Cálculo:',
  'elemento fallido', 'elementos fallidos',
  'Ajustes', 'Conexiones', 'Configuración', 'Personalización',
  'Aplicación', 'Cancelar', 'Guardar', 'Eliminar', 'Editar', 'Volver', 'Cerrar',
  'Nombre', 'Descripción', 'Monto', 'Cantidad', 'Precio', 'Estado',
  'Recientes', 'Pendientes', 'Sincronizar', 'Reparar', 'Descargar',
];

// Lowercase subset for case-insensitive matching of words that may
// appear capitalised mid-sentence (e.g. "Cargos" at start, "cargos"
// mid-string).
const SPANISH_HINTS_CASE_INSENSITIVE = [
  'cargos', 'ingresos', 'gastos', 'cuentas', 'proveedores', 'sincronización',
  'sincronizar', 'historial', 'estadísticas', 'rendimiento', 'flujo',
  'presupuesto', 'categoría', 'frecuencia', 'seleccionar', 'aplicar',
  'reparar', 'pausar', 'reanudar', 'configuración', 'personalización',
];

// vue-i18n returns the dotted key when a translation is missing, so
// any 3+ dot path that looks like a key path is a regression signal.
// Allow simple 1-2 dot strings (e.g. version numbers) and numeric
// patterns.
const KEY_PATH_RE = /\b(?:sync|i18n|recurring|menu|home|auth|settings|privacy|downloads|common|budget|suppliers|statistics|accounts|admin|info|categorypickermodal|quickcategoryalert|sectionassignmodal|devmodebanner|cashflowchart|components|views)\.[a-z][a-z0-9_]*(?:\.[a-z0-9_]+){1,}/i;

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
    const englishRadio = page.locator('ion-radio:has-text("English")').first();
    if (await englishRadio.isVisible().catch(() => false)) {
      await englishRadio.click();
    }
    await page.waitForTimeout(300);
  }
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(500);
}

interface AuditResult {
  spanish: string[];
  rawKeys: string[];
  text: string;
}

/**
 * Audits one route in its own page.
 *
 * The audit walks 13 routes, and reusing a single page for all of them made
 * chromium run out of resources (net::ERR_INSUFFICIENT_RESOURCES) halfway
 * through the list. A fresh page per route keeps the renderer small; the
 * language override lives in configDb, so the new page still starts in the
 * locale the audit set up.
 */
async function auditRoute(context: BrowserContext, route: string): Promise<AuditResult> {
  const page = await context.newPage();
  try {
    return await auditPage(page, route);
  } finally {
    await page.close().catch(() => undefined);
  }
}

async function auditPage(page: Page, route: string): Promise<AuditResult> {
  await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(2000);
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(500);
  // F8: include the side menu text in the audit so hardcoded strings
  // in MainMenu also get caught. Open the menu, snapshot the text,
  // close it again.
  const menuButton = page.locator('ion-menu-button').first();
  if (await menuButton.isVisible().catch(() => false)) {
    await menuButton.click().catch(() => {});
    await page.waitForTimeout(500);
  }
  const text = (await page.locator('body').innerText()) || '';

  const lower = text.toLowerCase();
  const spanish = SPANISH_HINTS.filter((h) => text.includes(h));
  for (const hint of SPANISH_HINTS_CASE_INSENSITIVE) {
    if (lower.includes(hint.toLowerCase()) && !spanish.includes(hint)) spanish.push(hint);
  }
  const rawKeys = Array.from(new Set(text.match(/[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){2,}/gi) ?? []))
    .filter((s) => KEY_PATH_RE.test(s) && !/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(s));
  return { spanish, rawKeys, text };
}

const ROUTES = [
  { route: '/budget', label: 'Budget' },
  { route: '/recurring', label: 'Recurring' },
  { route: '/recurring/edit', label: 'Recurring Edit' },
  { route: '/statistics/cash-flow', label: 'CashFlow' },
  { route: '/statistics/performance', label: 'Performance' },
  { route: '/statistics/performance/config', label: 'PerformanceConfig' },
  { route: '/suppliers', label: 'Suppliers' },
  { route: '/accounts', label: 'Accounts' },
  { route: '/sync', label: 'Sync' },
  { route: '/sync/dlq', label: 'DLQ' },
  { route: '/budget/historial', label: 'History' },
  { route: '/downloads', label: 'Downloads' },
  { route: '/admin/personalization', label: 'Personalization' },
];

test('i18n audit: English mode shows no raw keys and no Spanish on main pages', async ({ page }) => {
  // The audit walks 13 routes (each one a full page load plus a menu
  // snapshot), so it needs more than the default budget on a loaded machine.
  test.setTimeout(900000);
  await setEnglishLocale(page);
  const failures: string[] = [];
  for (const p of ROUTES) {
    const result = await auditRoute(page.context(), p.route);
    if (result.spanish.length > 0) {
      failures.push(`[${p.label}] Spanish words: ${result.spanish.join(', ')}`);
    }
    if (result.rawKeys.length > 0) {
      failures.push(`[${p.label}] Raw keys: ${result.rawKeys.join(', ')}`);
    }
  }
  // F8: this is now a hard assertion. If the test fails the i18n
  // wrap is incomplete and must be fixed before merge.
  expect(failures, failures.join('\n')).toHaveLength(0);
});

test('i18n audit: Spanish mode shows no raw keys', async ({ page }) => {
  // Same as above: 13 routes with a full page load each.
  test.setTimeout(900000);
  const failures: string[] = [];
  for (const p of ROUTES) {
    const result = await auditRoute(page.context(), p.route);
    if (result.rawKeys.length > 0) {
      failures.push(`[${p.label}] Raw keys: ${result.rawKeys.join(', ')}`);
    }
  }
  expect(failures, failures.join('\n')).toHaveLength(0);
});
