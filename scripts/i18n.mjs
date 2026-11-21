// 번역 키 점검: 코드의 t('…')와 HTML의 한국어 문장을 모아 각 언어 사전에 빠진 키와 쓰지 않는 키를 알려 준다.
//   npm run i18n           → 점검만 (빠진 키가 있으면 종료 코드 1)
//   npm run i18n -- --keys → src/locales/_keys.json 에 전체 키 목록을 쓴다 (번역 작업용)
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const LOCALES = ['en', 'ja', 'zh-CN'];
const HANGUL = /[가-힣]/;
const keys = new Map(); // 키 → 처음 나온 위치

// 코드의 t('…')는 한글이 없어도 키다(예: '{tag} {name}' 어순). HTML은 한글이 있는 문장만 모은다.
const add = (k, where, any) => { k = k.trim(); if (k && (any || HANGUL.test(k)) && !keys.has(k)) keys.set(k, where); };
const unescape = s => s.replace(/\\'/g, "'").replace(/\\\\/g, '\\');

function walk(dir) {
  return readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
}
for (const file of walk(join(root, 'src')).filter(f => f.endsWith('.js'))) {
  const src = readFileSync(file, 'utf8'), rel = file.slice(root.length);
  for (const m of src.matchAll(/\bt\('((?:[^'\\]|\\.)*)'/g)) add(unescape(m[1]), rel, true);
  // 내부 키로 쓰는 한국어(좀비 역할)는 화면에 t(role)로 보여 준다
  for (const m of src.matchAll(/role: '([^']+)'/g)) add(m[1], rel);
  const roles = src.match(/const ROLES = \[([^\]]+)\]/);
  if (roles) for (const m of roles[1].matchAll(/'([^']+)'/g)) add(m[1], rel);
}
for (const f of ['index.html', 'play.html']) {
  const html = readFileSync(join(root, f), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
  for (const m of html.matchAll(/>([^<>]+)</g)) add(m[1].replace(/\s+/g, ' '), f);
  for (const m of html.matchAll(/(?:placeholder|aria-label|title|content)="([^"]+)"/g)) add(m[1], f);
}

const all = [...keys.keys()].sort();
if (process.argv.includes('--keys')) {
  writeFileSync(join(root, 'src/locales/_keys.json'), JSON.stringify(Object.fromEntries(all.map(k => [k, keys.get(k)])), null, 1) + '\n');
  console.log(`키 ${all.length}개를 src/locales/_keys.json 에 썼습니다.`);
}
let bad = 0;
for (const l of LOCALES) {
  const dict = JSON.parse(readFileSync(join(root, `src/locales/${l}.json`), 'utf8'));
  const missing = all.filter(k => !dict[k]), unused = Object.keys(dict).filter(k => !keys.has(k));
  // 자리표시자({n} 등)가 번역에서 빠지거나 달라졌는지 본다
  const ph = s => (s.match(/\{\w+\}/g) || []).sort().join();
  const broken = all.filter(k => dict[k] && ph(k) !== ph(dict[k]));
  console.log(`${l}: 키 ${all.length} · 빠짐 ${missing.length} · 안 쓰임 ${unused.length} · 자리표시자 불일치 ${broken.length}`);
  missing.slice(0, 15).forEach(k => console.log('  - 빠짐:', k));
  broken.slice(0, 15).forEach(k => console.log('  - 자리표시자:', k, '→', dict[k]));
  if (missing.length || broken.length) bad = 1;
}
process.exit(bad);
