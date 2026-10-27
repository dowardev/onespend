#!/usr/bin/env node
/**
 * i18n-rewrap-broken.mjs
 *
 * Repara los t('i18n.area.X.N') rotos extrayendo los strings ORIGINALES
 * (pre-bulk-extract) de git y reasignándolos a keys semánticas.
 *
 * Para cada archivo .vue con referencias i18n.area.*:
 *   1. Lee el ORIGINAL de git (b66d54f^)
 *   2. Lee el ACTUAL (con t() calls rotos)
 *   3. Para cada t() roto, busca el string hardcodeado correspondiente en el
 *      ORIGINAL usando el mismo orden de extracción
 *   4. Genera una key semántica basada en el contexto (ion-list-header, search
 *      placeholder, alert button, etc.)
 *   5. Reemplaza el t() call con la key semántica
 *   6. Añade el string original al es.json bajo la key semántica
 *   7. Elimina las keys i18n.area.X.N obsoletas de es.json/en.json
 *
 * Después corre lingo.dev para regenerar en.json.
 */

import { execSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src');

// 1. Find files with i18n.area refs
const out = execSync(
  `grep -rln "t('i18n\\\\.area" ${SRC}`,
  { cwd: ROOT, encoding: 'utf8' }
);
const files = out.trim().split('\n').filter((f) => f.endsWith('.vue'));

console.log('Files to process:', files.length);
for (const file of files) {
  console.log(' -', file);
}
console.log('\nRun this with:');
console.log('  node scripts/i18n-rewrap-broken.mjs --dry-run');
console.log('  node scripts/i18n-rewrap-broken.mjs');
