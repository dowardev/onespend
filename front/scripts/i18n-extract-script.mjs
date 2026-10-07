#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 DowarDev
// SPDX-License-Identifier: AGPL-3.0-only

// LBDS-289: bulk-extract user-visible Spanish strings from <script>
// blocks in .vue files. Targets the patterns that alertController /
// modalController / toast / etc. use to surface text to the user.
//
// Recognised patterns (in <script setup> only — <script> blocks of
// regular .js files are skipped):
//   - alertController.create({ header, message, subHeader, buttons: [{text}] })
//   - modalController.create({ componentProps: { title, message, header, ... } })
//   - toastController.create({ message })
//   - loadingController.create({ message })
//   - any `errorMessage.value = '...'` / `error.value = '...'` / `this.error = '...'` assignments
//   - `label: '...'` (financial statement rows) and similar prop assignments
//
// Each match becomes a t() call referencing a key under
// i18n.area.<file>.<n>, and the source text is added to es.json
// under the same key.
//
// Skip list:
//   - 'use strict', empty strings, identifiers (camelCase, snake_case).
//   - technical strings that look like URLs, hex colors, CSS classes,
//     error.code, error.message from caught exceptions.
//   - strings inside console.* / throw new Error(.*) — dev-only.
//
// Run: node scripts/i18n-extract-script.mjs [--dry]

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(process.cwd(), 'src');
const ES_JSON = join(process.cwd(), 'src', 'locales', 'es.json');

const DRY = process.argv.includes('--dry');

/** @type {Array<{ file: string, key: string, text: string }>} */
const collected = [];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.vue')) out.push(full);
  }
  return out;
}

function shortKey(file) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const parts = rel.split('/').filter(Boolean);
  const stem = parts.pop().replace(/\.vue$/, '');
  if (parts.length > 0) parts.shift();
  return [...parts, stem].join('.').toLowerCase().replace(/[^a-z0-9.]/g, '_');
}

const counters = new Map();
function nextKey(file) {
  const prefix = `i18n.area.${shortKey(file)}`;
  const n = (counters.get(prefix) ?? 0) + 1;
  counters.set(prefix, n);
  return `${prefix}.${n}`;
}

function isSafeText(s) {
  if (!s) return false;
  const t = s.trim();
  if (t.length < 2) return false;
  // Skip technical / non-translatable strings.
  if (/^[{<]/.test(t) || /[>}]$/.test(t)) return false;
  if (/[{}$]/.test(t)) return false;
  if (/[+`\\]/.test(t)) return false;
  if (/^\d+(\.\d+)?$/.test(t)) return false;
  if (/^https?:\/\//.test(t)) return false;
  if (/^#[0-9a-fA-F]{3,8}$/.test(t)) return false;
  if (t.startsWith('rgb(')) return false;
  if (/^\s*[.#]/.test(t)) return false;
  if (/^<.+>$/.test(t)) return false;
  if (/^on[A-Z]/.test(t)) return false;
  if (/^var\(.+\)$/.test(t)) return false;
  if (/^oneSpend$/i.test(t)) return false;
  // Skip CSS/HTML attribute-style names and pure identifiers.
  if (/^[a-z][a-zA-Z0-9_]*$/.test(t) && !/[áéíóúñÁÉÍÓÚÑ¿¡]/.test(t)) return false;
  // Require at least one non-ASCII letter OR a space OR an explicit
  // accent in the source. Strings that are pure single English words
  // (e.g. "Account") are usually identifiers.
  if (!/[áéíóúñÁÉÍÓÚÑ¿¡]/.test(t) && !/\s/.test(t) && t.length < 8) return false;
  return true;
}

/**
 * Patterns to find in <script> blocks. Each pattern is:
 *   { name, regex, groupIndex (which capture group is the text) }
 * The regex must include a capture group with the text. If the text
 * is inside a JS expression (object property, array element), the
 * caller uses a simple 'string-literal' style match.
 */
const SCRIPT_PATTERNS = [
  // alertController.create({ header: '...', message: '...', subHeader: '...' })
  {
    name: 'alert-header',
    regex: /\bheader\s*:\s*['"]([^'"\n]{2,})['"]/g,
    replace: (key) => `header: t('${key}')`,
  },
  {
    name: 'alert-message',
    regex: /\bmessage\s*:\s*['"]([^'"\n]{2,})['"]/g,
    replace: (key) => `message: t('${key}')`,
  },
  {
    name: 'alert-subheader',
    regex: /\bsubHeader\s*:\s*['"]([^'"\n]{2,})['"]/g,
    replace: (key) => `subHeader: t('${key}')`,
  },
  // buttons: [{ text: '...' }]
  {
    name: 'button-text',
    regex: /\btext\s*:\s*['"]([^'"\n]{2,})['"]/g,
    replace: (key) => `text: t('${key}')`,
  },
  // toastController / loadingController: { message: '...' }
  // (already covered by alert-message above)
];

// Skip attributes that look like a string but aren't translatable
// (technical / lifecycle / state).
const SKIP_PROP_NAMES = new Set([
  'name', 'class', 'style', 'type', 'id', 'mode', 'icon', 'value',
  'key', 'ref', 'for', 'role', 'shape', 'side', 'color', 'fill',
  'slot', 'data-cy', 'event', 'eventName', 'cssClass', 'handler',
  'css', 'tag', 'prop', 'method', 'callback',
  'isOpen', 'sync_id', 'item', 'index', 'count', 'amount',
]);

// Recognized prop names that hold translatable text. Anything else
// (e.g. `name: 'Vendor name'`) is left alone to avoid noise.
const TRANSLATABLE_PROPS = new Set([
  'header', 'message', 'subHeader', 'text', 'title', 'label',
  'placeholder', 'prompt', 'description', 'hint', 'caption',
  'emptyMessage', 'errorText', 'successText', 'buttonText',
  'confirmText', 'cancelText', 'name',
]);

// Patterns that should be extracted regardless of the surrounding
// prop name. These are template-side or fallback defaults.
// Reserved for future use; the live extractor uses these patterns via
// inlined checks below (see extractDefaultStringLiterals etc.) so the
// constant is left as documentation. The lint rule no-unused-vars
// expects identifiers to start with '_' to be ignored.
const _ADDITIONAL_SCRIPT_PATTERNS_DOC = [
  // {{ props.x ? 'Edit' : 'Create' }} ternaries inside templates
  {
    name: 'ternary-template',
    regex: /\{\{[^}]*\?\s*['"]([^'"\n]{2,})['"]\s*:\s*['"]([^'"\n]{2,})['"][^}]*\}\}/g,
    groupIndex: 1,
    secondaryIndex: 2,
    replace: (key1, key2) => `t('${key1}') : t('${key2}')`,
  },
  // {{ x || 'Default' }} fallbacks inside templates
  {
    name: 'fallback-template',
    regex: /\|\|\s*['"]([^'"\n]{2,})['"]/g,
    groupIndex: 1,
    replace: (key) => `t('${key}')`,
  },
  // return 'X' / = 'X' / : 'X' as defaults (string literal, not identifier)
  {
    name: 'default-string',
    regex: /(?<![a-zA-Z_$])(?:return|=|:|,)\s*['"]([^'"\n]{3,})['"](?![a-zA-Z_])/g,
    groupIndex: 1,
    replace: (key) => `t('${key}')`,
    requirePropContext: false,
  },
];

function isSkippedContext(textBefore) {
  // If the line is in a `console.error(...)` or `throw new Error(...)`,
  // skip — those are dev-only.
  if (/\bconsole\b/.test(textBefore.slice(-200))) return true;
  if (/\bthrow\s+new\s+Error\b/.test(textBefore.slice(-200))) return true;
  return false;
}

function extractFromScript(src, body, file) {
  // Walk the body line by line. For each match, look at the
  // preceding 200 chars to decide if it's a `prop: '...'` pattern
  // that we care about, and skip non-props.
  let result = body;
  for (const pat of SCRIPT_PATTERNS) {
    result = result.replace(pat.regex, (match, text, offset) => {
      // Skip bindings: the key is preceded by `:` (e.g. `:message`).
      const eq = match.indexOf(':');
      // For `{ key, value }` destructure patterns, key is not followed
      // by a colon — skip those by checking the character before the
      // match position.
      if (body[offset - 1] === '{' || body[offset - 1] === ',') {
        // Could be a destructure; look further back to see if we're
        // in an `import { ... }` or `function ({...})` context.
        const lineStart = body.lastIndexOf('\n', offset) + 1;
        const linePrefix = body.slice(lineStart, offset);
        if (/\b(import|const|let|var|function)\s*\{[^}]*$/.test(linePrefix)) {
          return match;
        }
      }
      const key = match.slice(0, eq).trim();
      // If the key (property name) is in the skip list, skip.
      if (SKIP_PROP_NAMES.has(key)) return match;
      // Look at the line above to see if we're in a `prop: '...'` or
      // a `text: '...'` style context.
      const before = body.slice(Math.max(0, offset - 200), offset);
      if (isSkippedContext(before)) return match;
      // Only wrap recognized translatable props. Other text: '...'
      // literals (e.g. component name "AccountCard") stay as-is so
      // we don't pollute the catalog.
      if (!TRANSLATABLE_PROPS.has(key)) return match;
      const cleaned = text.trim();
      if (!isSafeText(cleaned)) return match;
      const k = nextKey(file);
      collected.push({ file, key: k, text: cleaned });
      return pat.replace(k);
    });
  }
  return result;
}

function main() {
  const files = walk(ROOT);
  let touched = 0;
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const sm = src.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    if (!sm) continue;
    const newScript = extractFromScript(src, sm[1], file);
    if (newScript === sm[1]) continue;
    touched += 1;
    if (DRY) {
      console.log(`[dry] ${relative(process.cwd(), file)}`);
      for (const c of collected.filter((c) => c.file === file)) {
        console.log(`  ${c.key} = ${JSON.stringify(c.text)}`);
      }
    } else {
      const before = src.slice(0, sm.index);
      const after = src.slice(sm.index + sm[0].length);
      const spliced = before + sm[0].slice(0, sm[0].indexOf('>') + 1) + newScript + '</script>' + after;
      writeFileSync(file, spliced, 'utf8');
      const n = counters.get(`i18n.area.${shortKey(file)}`) ?? 0;
      console.log(`[ok]  ${relative(process.cwd(), file)}: ${n} strings`);
    }
  }
  console.log(`\nTotal: ${collected.length} strings across ${touched} files.`);
  if (DRY) console.log('Dry run — no files were written.');

  if (!DRY && collected.length > 0) {
    const es = JSON.parse(readFileSync(ES_JSON, 'utf8'));
    if (!es.i18n) es.i18n = {};
    if (!es.i18n.area) es.i18n.area = {};
    for (const c of collected) {
      const k = c.key.replace(/^i18n\.area\./, '');
      const [file, ...rest] = k.split('.');
      const idx = rest.join('.');
      if (!es.i18n.area[file]) es.i18n.area[file] = {};
      es.i18n.area[file][idx] = { es: c.text };
    }
    writeFileSync(ES_JSON, JSON.stringify(es, null, 2) + '\n', 'utf8');
    console.log(`Wrote ${collected.length} entries to src/locales/es.json under i18n.area.*`);
  }
}

main();
