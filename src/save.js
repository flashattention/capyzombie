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
