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
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src');
const PRE_REF = 'b66d54f^'; // commit parent of bulk extraction
const ES_JSON = path.join(SRC, 'locales', 'es.json');
const EN_JSON = path.join(SRC, 'locales', 'en.json');

// 1. Find files with i18n.area refs
const out = execSync(
  `grep -rln "t('i18n\\\\.area" ${SRC}`,
  { cwd: ROOT, encoding: 'utf8' }
);
const files = out.trim().split('\n').filter((f) => f.endsWith('.vue'));

// 2. Determine semantic key for each t() call based on context
// Returns { key, es, replaced }
function inferContextKey(line, surroundingLines, fileKey) {
  // Find the original hardcoded text from the surrounding template
  // Look at the line content to determine what kind of element this is

  // Alert button text
  if (/role:\s*['"]cancel['"]/i.test(surroundingLines)) {
    return { semantic: `${fileKey}.alert.cancel`, kind: 'button' };
  }
  if (/role:\s*['"]destructive['"]/i.test(surroundingLines)) {
    return { semantic: `${fileKey}.alert.delete`, kind: 'button' };
  }

  // Search placeholder
  if (/<ion-searchbar/.test(surroundingLines) || /placeholder.*t\(/i.test(surroundingLines)) {
    return { semantic: `${fileKey}.search.placeholder`, kind: 'placeholder' };
  }

  // ion-list-header (section header)
  if (/<ion-list-header/.test(surroundingLines)) {
    return { semantic: `${fileKey}.list.header`, kind: 'header' };
  }

  // alert header
  if (/header=/.test(surroundingLines) && /<ion-alert/.test(surroundingLines)) {
    return { semantic: `${fileKey}.alert.header`, kind: 'header' };
  }

  // alert message
  if (/message=/.test(surroundingLines) && /<ion-alert/.test(surroundingLines)) {
    return { semantic: `${fileKey}.alert.message`, kind: 'message' };
  }

  // alert subHeader
  if (/subHeader=/.test(surroundingLines)) {
    return { semantic: `${fileKey}.alert.subHeader`, kind: 'subHeader' };
  }

  // toast message
  if (/toastController\.create|message:/.test(surroundingLines)) {
    return { semantic: `${fileKey}.toast.message`, kind: 'toast' };
  }

  // Default: just use a numbered key
  return { semantic: `${fileKey}.text`, kind: 'text' };
}

// 3. Extract the i-th hardcoded string from the original file
// Returns array of { text, line, kind } in the order the script would have extracted
function extractOriginalStrings(originalContent) {
  // The script extracted strings from:
  //  - <ion-label>...</ion-label> in templates
  //  - h1-h6 in templates
  //  - Static text attributes: title, header, subHeader, message, label, placeholder
  const lines = originalContent.split('\n');
  const extracted = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // <ion-label>text</ion-label>
    let m = line.match(/<ion-label[^>]*>([^<{]+)<\/ion-label>/);
    if (m) {
      extracted.push({ text: m[1].trim(), line: i + 1, kind: 'ion-label' });
      continue;
    }

    // h1-h6
    m = line.match(/<h[1-6][^>]*>([^<{]+)<\/h[1-6]>/);
    if (m) {
      extracted.push({ text: m[1].trim(), line: i + 1, kind: 'h' });
      continue;
    }

    // static title="X" or :title="..."
    m = line.match(/\btitle=["']([^"']+)["']/);
    if (m) {
      extracted.push({ text: m[1].trim(), line: i + 1, kind: 'title' });
      continue;
    }

    // header="X"
    m = line.match(/\bheader=["']([^"']+)["']/);
    if (m) {
      extracted.push({ text: m[1].trim(), line: i + 1, kind: 'header' });
      continue;
    }

    // subHeader="X"
    m = line.match(/\bsubHeader=["']([^"']+)["']/);
    if (m) {
      extracted.push({ text: m[1].trim(), line: i + 1, kind: 'subHeader' });
      continue;
    }

    // message="X"
    m = line.match(/\bmessage=["']([^"']+)["']/);
    if (m) {
      extracted.push({ text: m[1].trim(), line: i + 1, kind: 'message' });
      continue;
    }

    // label="X"
    m = line.match(/\blabel=["']([^"']+)["']/);
    if (m) {
      extracted.push({ text: m[1].trim(), line: i + 1, kind: 'label' });
      continue;
    }

    // placeholder="X"
    m = line.match(/\bplaceholder=["']([^"']+)["']/);
    if (m) {
      extracted.push({ text: m[1].trim(), line: i + 1, kind: 'placeholder' });
      continue;
    }
  }

  return extracted;
}

console.log('Files to process:', files.length);
for (const file of files) {
  console.log(' -', file);
}
console.log('\nRun this with:');
console.log('  node scripts/i18n-rewrap-broken.mjs --dry-run');
console.log('  node scripts/i18n-rewrap-broken.mjs');
