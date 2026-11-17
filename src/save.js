import { RIDERS, ACCESSORIES } from './models/riders.js';

// 저장 규칙 (업데이트해도 유저 진행이 초기화되지 않게 지킨다)
//  1. localStorage 키 이름(capyzombie.profile / .progress / .account)은 바꾸지 않는다.
//  2. 읽을 때 모르는 필드는 그대로 두고, 없는 필드만 기본값으로 채운다. 값이 이상하면 그 필드만 고친다.
//  3. 형식을 바꿔야 하면 SAVE_VERSION을 올리고 migrate()에 옮기는 코드를 추가한다. 지우지 않는다.
const SAVE_VERSION = 2;
const read = key => { try { const v = JSON.parse(localStorage.getItem(key)); return v && typeof v === 'object' ? v : null; } catch (e) { return null; } };
const KEY = 'capyzombie.profile';
export const NAMES = ['꽥꽥이', '귤대장', '진흙왕', '콩떡', '물만두', '감자', '초코', '두부', '호두', '보리', '온천이', '낮잠왕'];
export const randomName = () => NAMES[Math.floor(Math.random() * NAMES.length)];

export function defaultProfile(animal = 'duck') {
  const R = RIDERS.find(r => r.id === animal) || RIDERS[0];
  return { name: '', animal: R.id, map: 'farm', ...R.def };
}
export function loadProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY));
    if (p && RIDERS.some(r => r.id === p.animal)) {
      const d = defaultProfile(p.animal);
      for (const slot of Object.keys(ACCESSORIES)) if (!ACCESSORIES[slot].some(a => a[0] === p[slot])) p[slot] = d[slot];
      p.name = String(p.name || '').slice(0, 12);
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
  p.v = SAVE_VERSION;
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

// ── 계정: 닉네임(필수)과 랭킹용 고유 번호. 캐릭터를 바꿔도 그대로 유지된다 ──
const AKEY = 'capyzombie.account';
export function loadAccount() {
  let a = null;
  try { a = JSON.parse(localStorage.getItem(AKEY)); } catch (e) { /* 무시 */ }
  a = a && typeof a === 'object' ? a : {};
  const hadId = /^[a-z0-9-]{8,40}$/i.test(a.id || '');
  if (!hadId) a.id = (crypto.randomUUID ? crypto.randomUUID() : 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12));
  // 이전 버전에서는 닉네임이 캐릭터 이름(profile.name)에 들어 있었다. 그 이름을 계정 닉네임으로 옮긴다.
  if (!a.nick) { const old = read(KEY); if (old && old.name) a.nick = String(old.name); }
  a.nick = String(a.nick || '').trim().slice(0, 12);
  if (!hadId || a.v !== SAVE_VERSION) { a.v = SAVE_VERSION; saveAccount(a); }
  return a;
}
export function saveAccount(a) {
  try { localStorage.setItem(AKEY, JSON.stringify(a)); } catch (e) { /* 무시 */ }
}
export const validNick = s => String(s || '').trim().length >= 2;
