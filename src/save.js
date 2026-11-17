import { RIDERS, ACCESSORIES } from './models/riders.js';

const KEY = 'capyzombie.profile';
export const NAMES = ['꽥꽥이', '귤대장', '진흙왕', '콩떡', '물만두', '감자', '초코', '두부', '호두', '보리', '온천이', '낮잠왕'];
export const randomName = () => NAMES[Math.floor(Math.random() * NAMES.length)];

export function defaultProfile(animal = 'duck') {
  const R = RIDERS.find(r => r.id === animal) || RIDERS[0];
  return { name: randomName(), animal: R.id, map: 'farm', ...R.def };
}
export function loadProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY));
    if (p && RIDERS.some(r => r.id === p.animal)) {
      const d = defaultProfile(p.animal);
      for (const slot of Object.keys(ACCESSORIES)) if (!ACCESSORIES[slot].some(a => a[0] === p[slot])) p[slot] = d[slot];
      p.name = String(p.name || d.name).slice(0, 12);
      return p;
    }
  } catch (e) { /* 저장소를 못 쓰는 환경이면 기본값으로 시작 */ }
  return defaultProfile();
}
export function saveProfile(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* 무시 */ }
}

// ── 진행도: 클리어한 전장, 전장별 최고 기록, 설정 ──
const PKEY = 'capyzombie.progress';
export function loadProgress() {
  let p = null;
  try { p = JSON.parse(localStorage.getItem(PKEY)); } catch (e) { /* 무시 */ }
  p = p && typeof p === 'object' ? p : {};
  p.cleared = Array.isArray(p.cleared) ? p.cleared : [];
  p.best = p.best && typeof p.best === 'object' ? p.best : {};
  p.settings = Object.assign({ sens: 1, sound: true }, p.settings);
  return p;
}
export function saveProgress(p) {
  try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch (e) { /* 무시 */ }
}
// 기록을 갱신하고, 갱신됐는지 돌려준다
export function recordRun(mapId, time, kills, cleared) {
  const p = loadProgress(), b = p.best[mapId] || { time: 0, kills: 0 };
  const better = time > b.time || kills > b.kills;
  p.best[mapId] = { time: Math.max(b.time, Math.floor(time)), kills: Math.max(b.kills, kills) };
  if (cleared && !p.cleared.includes(mapId)) p.cleared.push(mapId);
  saveProgress(p);
  return better;
}
export const fmtTime = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
