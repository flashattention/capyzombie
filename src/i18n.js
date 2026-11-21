// 다국어: 한국어 문장을 그대로 키로 쓴다. t('최고 기록 {time}', { time }) 처럼 부르면
// 현재 언어 사전에서 번역을 찾고, 없으면 한국어 원문을 그대로 쓴다.
// 사전: src/locales/<언어>.json  ({ "한국어 원문": "번역" })
// 새 문장을 추가했다면 `npm run i18n` 으로 사전에 빠진 키를 확인한다.
// 언어는 시작할 때 한 번 정하고, 바꾸면 페이지를 다시 불러온다(데이터 이름이 불러올 때 정해지므로).
import en from './locales/en.json';
import ja from './locales/ja.json';
import zhCN from './locales/zh-CN.json';

export const LANGS = [
  { id: 'ko', name: '한국어' },
  { id: 'en', name: 'English' },
  { id: 'ja', name: '日本語' },
  { id: 'zh-CN', name: '简体中文' },
];
const DICTS = { en, ja, 'zh-CN': zhCN };
const KEY = 'capyzombie.lang';

function detect() {
  try { const s = localStorage.getItem(KEY); if (LANGS.some(l => l.id === s)) return s; } catch (e) { /* 무시 */ }
  const prefs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en']).map(x => String(x).toLowerCase());
  for (const p of prefs) {
    if (p.startsWith('ko')) return 'ko';
    if (p.startsWith('ja')) return 'ja';
    if (p.startsWith('zh')) return 'zh-CN';
    if (p.startsWith('en')) return 'en';
  }
  return 'en'; // 지원하지 않는 언어는 영어로
}

export const lang = detect();
const dict = DICTS[lang] || null;

export function t(s, p) {
  let r = (dict && dict[s]) || s;
  if (p) r = r.replace(/\{(\w+)\}/g, (m, k) => (k in p ? p[k] : m));
  return r;
}
// 숫자는 언어에 맞는 구분 기호로
export const num = n => Number(n).toLocaleString(lang);

export function setLang(id) {
  try { localStorage.setItem(KEY, id); } catch (e) { /* 무시 */ }
  location.reload();
}

// HTML에 직접 적힌 한국어를 번역한다: 텍스트 노드와 몇몇 속성의 원문이 사전에 있으면 바꾼다.
const ATTRS = ['placeholder', 'aria-label', 'title', 'content'];
export function translateDom(root = document) {
  document.documentElement.lang = lang;
  if (document.title) document.title = t(document.title.trim());
  if (!dict) return;
  const walk = document.createTreeWalker(root.body || root, NodeFilter.SHOW_TEXT);
  const nodes = []; while (walk.nextNode()) nodes.push(walk.currentNode);
  for (const n of nodes) {
    const raw = n.nodeValue, s = raw.trim();
    if (!s || !(s in dict)) continue;
    n.nodeValue = raw.replace(s, dict[s]);
  }
  (root.querySelectorAll ? root : document).querySelectorAll('[placeholder],[aria-label],[title],meta[name="description"]').forEach(el => {
    for (const a of ATTRS) { const v = el.getAttribute(a); if (v && v.trim() in dict) el.setAttribute(a, dict[v.trim()]); }
  });
}
