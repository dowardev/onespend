#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 DowarDev
// SPDX-License-Identifier: AGPL-3.0-only

// LBDS-289: bulk-extract hardcoded Spanish strings from .vue templates
// and rewrite them with vue-i18n t() calls. The script targets only
// <template> content (never <script>), and only the patterns that are
// user-visible text. See the bottom of the file for the full skip list.
//
// Run with `node scripts/i18n-extract.mjs` from front/. Pass --dry to
// only print what would be extracted.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(process.cwd(), 'src');
const ES_JSON = join(process.cwd(), 'src', 'locales', 'es.json');

const DRY = process.argv.includes('--dry');

/** @type {Array<{ file: string, key: string, text: string, kind: string }>} */
const collected = [];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.vue')) out.push(full);
  }
  return out;
}

function extractTemplate(src) {
  const m = src.match(/<template[^>]*>([\s\S]*?)<\/template>/);
  if (!m) return null;
  return { body: m[1], start: m.index, end: m.index + m[0].length };
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
  if (/^[{<]/.test(t) || /[>}]$/.test(t)) return false;
  if (/[{}$]/.test(t)) return false;
  if (/[+`\\]/.test(t)) return false; // JS concat / template literal / escape
  if (/^\d+(\.\d+)?$/.test(t)) return false;
  if (/^https?:\/\//.test(t)) return false;
  if (/^#[0-9a-fA-F]{3,8}$/.test(t)) return false;
  if (t.startsWith('rgb(')) return false;
  if (/^\s*[.#]/.test(t)) return false;
  if (/^<.+>$/.test(t)) return false;
  if (/^on[A-Z]/.test(t)) return false;
  if (/^var\(.+\)$/.test(t)) return false;
  // Brand / product names that should never be translated.
  if (/^oneSpend$/i.test(t)) return false;
  return true;
}

// Attributes we never want to extract from, even when they look like
// quoted strings.
const SKIP_ATTRS = new Set([
  'class', 'id', 'name', 'type', 'mode', 'viewBox', 'xmlns', 'fill', 'd',
  'data-cy', 'data-test', 'data-testid', 'slot', 'inputmode',
  'autocapitalize', 'autocorrect', 'spellcheck', 'target', 'rel',
  'role', 'color', 'interface', 'position', 'lines', 'shape', 'side',
  'aria-label', 'aria-hidden', 'aria-current', 'src', 'href', 'alt',
  'toggle', 'expand', 'fill', 'button', 'disabled', 'checked', 'value',
  'ion-change', 'ion-click', 'ion-blur', 'ion-focus', 'ion-input',
  'v-if', 'v-else', 'v-for', 'v-show', 'v-model', 'v-bind',
  ':class', ':style', ':icon', ':disabled', ':value', ':checked',
  '@click', '@change', '@blur', '@focus', '@input',
  'ion-label',  // also skip self-closing wrappers with class-only
]);

const PATTERNS = [
  {
    name: 'ion-label-text',
    // Match <ion-label>TEXT</ion-label>; group 1 is the text.
    // Excludes <ion-label ...> with attributes (handled separately)
    // by requiring the open tag to be exactly <ion-label>.
    regex: /<ion-label>([^<>{}$+`\\]+?)<\/ion-label>/g,
    rewriter: (text, key) => `<ion-label>{{ t('${key}') }}</ion-label>`,
  },
  {
    name: 'heading-text',
    // Match <h1>TEXT</h1> through <h6>TEXT</h6>.
    regex: /<(h[1-6])>([^<>{}$+`\\]+?)<\/\1>/g,
    rewriter: (text, key, m) => `<${m[1]}>{{ t('${key}') }}</${m[1]}>`,
  },
  {
    name: 'attr-title',
    regex: /\btitle="([^"'<>{}`\\?=:]+?)"/g,
    rewriter: (text, key) => `title="{{ t('${key}') }}"`,
  },
  {
    name: 'attr-header',
    regex: /\bheader="([^"'<>{}`\\?=:]+?)"/g,
    rewriter: (text, key) => `header="{{ t('${key}') }}"`,
  },
  {
    name: 'attr-subheader',
    regex: /\bsubHeader="([^"'<>{}`\\?=:]+?)"/g,
    rewriter: (text, key) => `subHeader="{{ t('${key}') }}"`,
  },
  {
    name: 'attr-message',
    regex: /\bmessage="([^"'<>{}`\\?=:]+?)"/g,
    rewriter: (text, key) => `message="{{ t('${key}') }}"`,
  },
  {
    name: 'attr-label',
    regex: /\blabel="([^"'<>{}`\\?=:]+?)"/g,
    rewriter: (text, key) => `label="{{ t('${key}') }}"`,
  },
  {
    name: 'attr-placeholder',
    regex: /\bplaceholder="([^"'<>{}`\\?=:]+?)"/g,
    rewriter: (text, key) => `placeholder="{{ t('${key}') }}"`,
  },
];

function extractFromTemplate(src, template, file) {
  let body = template;
  for (const pat of PATTERNS) {
    body = body.replace(pat.regex, (match, ...rest) => {
      // For attribute patterns, the first char of the match should be
      // a letter (the attr name) preceded by a space or a tag start.
      // Detect the attribute name from the match.
      const attrMatch = match.match(/^([a-zA-Z-]+)=/);
      if (attrMatch) {
        const attr = attrMatch[1].toLowerCase();
        if (SKIP_ATTRS.has(attr) || attr.startsWith('v-') || attr.startsWith('@')) {
          return match;
        }
      }
      // The last arg to the replace callback is the offset; before
      // that is the full string. We use the offset to peek at the
      // character preceding the match in the current body, so we
      // catch bindings like `:message="..."` where the colon is
      // outside our attribute regex.
      const offset = rest[rest.length - 2];
      const before = body[offset - 1] ?? '';
      if (before === ':' || before === '@' || before === '.') {
        return match;
      }
      // For heading pattern, the captured groups are: [tagName, text].
      // For others: [text].
      const text = (pat.name === 'heading-text') ? rest[1] : rest[0];
      const cleaned = (text ?? '').trim();
      if (!isSafeText(cleaned)) return match;
      if (match.includes('{{ t(') || match.includes(':t="')) return match;
      const key = nextKey(file);
      collected.push({ file, key, text: cleaned, kind: pat.name });
      if (pat.name === 'heading-text') {
        return pat.rewriter(cleaned, key, rest);
      }
      return pat.rewriter(cleaned, key, [match, text]);
    });
  }
  return body;
}

function main() {
  const files = walk(ROOT);
  let touched = 0;
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const t = extractTemplate(src);
    if (!t) continue;
    const newBody = extractFromTemplate(t.body, file);
    if (newBody === t.body) continue;
    touched += 1;
    if (DRY) {
      console.log(`[dry] ${relative(process.cwd(), file)}`);
      for (const c of collected.filter((c) => c.file === file)) {
        console.log(`  [${c.kind}] ${c.key} = ${JSON.stringify(c.text)}`);
      }
    } else {
      const before = src.slice(0, t.start);
      const after = src.slice(t.end);
      const spliced = before + `<template>${newBody}</template>` + after;
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
