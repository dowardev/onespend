#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 DowarDev
// SPDX-License-Identifier: AGPL-3.0-only

// LBDS-289: companion to i18n-extract.mjs. For every .vue file that
// has a t() call in its template but does NOT yet import useLocale()
// in its <script setup>, add the import + a `const { t } = useLocale()`
// binding.
//
// Detection: a file is "needs useLocale" when its template contains
// `{{ t(` or `:t="` or `@t=` and its script does not yet reference
// `useLocale` (or `useI18n`, which we keep as a synonym).
//
// The script does NOT touch files that already have the import.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(process.cwd(), 'src');

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

function extractBlocks(src) {
  const tmpl = src.match(/<template[^>]*>([\s\S]*?)<\/template>/);
  const script = src.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  return {
    template: tmpl ? tmpl[1] : '',
    script: script ? script[1] : '',
    templateMatch: tmpl,
    scriptMatch: script,
  };
}

function hasTCall(template) {
  return /\bt\s*\(/.test(template) || /\{\{\s*t\s*\(/.test(template);
}

function hasScriptTCall(script) {
  // Detect t('...') or t('...', {...}) or `t('...')` in script blocks.
  // The wrap is a manual wrap, so the `t` is always a bare function call.
  return /(^|[^a-zA-Z_$.])t\s*\(\s*['"]/.test(script);
}

function hasUseLocaleOrI18n(script) {
  return /\buseLocale\s*\(/.test(script) || /\buseI18n\s*\(/.test(script);
}

function injectImport(script, _file) {
  // Add the import to the first import block in the script. If the
  // file already has `import { ... } from 'vue'`, merge; else insert
  // a fresh import line just after the first existing import.
  const importRe = /^import\s+(?:\{[^}]*\}|[\w*]+)\s+from\s+['"][^'"]+['"];?$/m;
  const m = script.match(importRe);
  if (m) {
    const line = m[0];
    if (/from\s+['"]@\/composables\/useLocale['"]/.test(line)) {
      return script; // already there
    }
    if (line.includes('from \'vue\'')) {
      // Merge into the existing vue import.
      const merged = line.replace(
        /\{([^}]*)\}/,
        (_, inner) => `{ ${inner.trim() ? inner.trim() + ', useLocale' : 'useLocale' } }`,
      );
      return script.replace(line, merged);
    }
    // Different import line — add a new one right after.
    return script.replace(line, `${line}\nimport { useLocale } from '@/composables/useLocale';`);
  }
  // No imports at all — add at the top of the script.
  return `import { useLocale } from '@/composables/useLocale';\n${script}`;
}

function injectBinding(script) {
  // Look for the `const router = useRouter()` or `const x = useX()`
  // pattern at the top of the script (the "vars" section). Insert
  // `const { t } = useLocale();` right after the first such line so
  // it lives next to other composable instantiations.
  const first = script.match(/^\s*const\s+\w+\s*=\s*use[A-Z][A-Za-z0-9_]*\s*\(/m);
  if (first) {
    const idx = first.index + first[0].length;
    return script.slice(0, idx) + `\nconst { t } = useLocale();` + script.slice(idx);
  }
  // Fallback: after the imports.
  const lastImport = script.match(/^import [^;]+;\s*$/gm);
  if (lastImport) {
    const last = lastImport[lastImport.length - 1];
    const idx = script.indexOf(last) + last.length;
    return script.slice(0, idx) + `\n\nconst { t } = useLocale();` + script.slice(idx);
  }
  // Last resort: top of script.
  return `const { t } = useLocale();\n${script}`;
}

function main() {
  const files = walk(ROOT);
  let touched = 0;
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const { template, script, templateMatch, scriptMatch } = extractBlocks(src);
    if (!templateMatch || !scriptMatch) continue;
    if (!hasTCall(template) && !hasScriptTCall(script)) continue;
    if (hasUseLocaleOrI18n(script)) continue;
    const newScript = injectImport(script, file);
    const finalScript = injectBinding(newScript);
    if (finalScript === script) continue;
    // Splice back into the file at the script match position.
    const before = src.slice(0, scriptMatch.index);
    const after = src.slice(scriptMatch.index + scriptMatch[0].length);
    const scriptOpen = src.slice(scriptMatch.index, scriptMatch.index + scriptMatch[0].indexOf('>') + 1);
    const newFullScriptBlock = scriptOpen + finalScript + '</script>';
    const spliced = before + newFullScriptBlock + after;
    writeFileSync(file, spliced, 'utf8');
    touched += 1;
    console.log(`[ok]  ${relative(process.cwd(), file)}: added useLocale`);
  }
  console.log(`\nUpdated ${touched} files.`);
}

main();
