#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 DowarDev
// SPDX-License-Identifier: AGPL-3.0-only

// LBDS-289: fix script for the broken i18n-add-useLocale.mjs injection.
// When the original useX() call was multi-line (`const router = useRouter(\n)`),
// the old script inserted `const { t } = useLocale();` right after the
// open paren, producing invalid syntax. This fix moves the t() binding
// to the line after the closing `;` of the broken construct.

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

// Pattern: `const NAME = useHook(\nconst { t } = useLocale();)` — the
// closing paren of useHook appears AFTER the t() binding. Match the
// entire broken construct (the open paren of useHook through the
// final `);`).
const BROKEN = /const\s+(\w+)\s*=\s*use([A-Z][A-Za-z0-9_]*)\s*\(\s*const\s+\{\s*t\s*\}\s*=\s*useLocale\(\)/g;

function main() {
  const files = walk(ROOT);
  let touched = 0;
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    let changed = false;
    // First, fix the broken `useX(const { t } = useLocale());` pattern
    // (no newline between them) by inserting a newline and the
    // closing paren of useX right after its open paren.
    const out = src.replace(BROKEN, (_m, name, hook) => {
      changed = true;
      return `const ${name} = use${hook}();\nconst { t } = useLocale();`;
    });
    if (changed) {
      writeFileSync(file, out, 'utf8');
      touched += 1;
      console.log(`[fix] ${relative(process.cwd(), file)}`);
    }
  }
  console.log(`\nFixed ${touched} files.`);
}

main();
