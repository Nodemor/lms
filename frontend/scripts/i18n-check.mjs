#!/usr/bin/env node
/**
 * Translation guard (runs automatically as part of `pnpm build`).
 *  1. en.json, si.json and ta.json must contain exactly the same keys.
 *  2. Every {{placeholder}} in English must exist in the Sinhala and Tamil text too.
 *  3. Every literal key used in the code with t('...') must exist in en.json.
 *  4. No empty strings.
 * Adding a feature? Add its keys to all three files; this script tells you exactly what is missing.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'src/i18n/locales');
const langs = ['en', 'si', 'ta'];
const flat = (obj, prefix = '', out = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') flat(v, key, out); else out[key] = v;
  }
  return out;
};
const data = Object.fromEntries(langs.map((l) => [l, flat(JSON.parse(readFileSync(join(dir, `${l}.json`), 'utf8')))]));
const problems = [];
const enKeys = new Set(Object.keys(data.en));
// i18next plural keys: "x_one"/"x_other" satisfy t('x', {count})
const baseKeys = new Set([...enKeys].map((k) => k.replace(/_(zero|one|two|few|many|other)$/, '')));

for (const l of langs.slice(1)) {
  for (const k of enKeys) if (!(k in data[l])) problems.push(`[${l}] missing key: ${k}`);
  for (const k of Object.keys(data[l])) if (!enKeys.has(k)) problems.push(`[${l}] extra key not in en: ${k}`);
}
const vars = (s) => new Set((String(s).match(/\{\{\s*[\w.]+\s*\}\}/g) || []).map((v) => v.replace(/\s/g, '')));
for (const k of enKeys) {
  const ev = vars(data.en[k]);
  for (const l of langs.slice(1)) {
    if (!(k in data[l])) continue;
    const lv = vars(data[l][k]);
    for (const v of ev) if (!lv.has(v)) problems.push(`[${l}] ${k} is missing placeholder ${v}`);
  }
}
for (const l of langs) for (const [k, v] of Object.entries(data[l])) if (typeof v !== 'string' || !v.trim()) problems.push(`[${l}] empty value: ${k}`);

const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : /\.(jsx?|mjs)$/.test(f) ? [p] : []; });
const used = new Set();
for (const file of walk(join(root, 'src'))) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) used.add(m[1]);
}
for (const k of used) if (!enKeys.has(k) && !baseKeys.has(k)) problems.push(`[code] key used but not defined in en.json: ${k}`);

if (problems.length) {
  console.error(`\nTranslation check failed (${problems.length} problem${problems.length > 1 ? 's' : ''}):`);
  problems.forEach((p) => console.error('  - ' + p));
  process.exit(1);
}
console.log(`Translations OK: ${enKeys.size} keys in English, Sinhala and Tamil; ${used.size} keys used in code.`);
