import * as T from 'three';
import './style.css';
import { createSelect } from './select.js';
import { createGame } from './game.js';
import { MAPS } from './maps.js';
import { saveProfile, loadProfile } from './save.js';

const canvas = document.getElementById('c');
const renderer = new T.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;

let mode = null, size = [0, 0], lastProfile = null;
// 이전 화면을 먼저 정리한 뒤 새 화면을 만든다.
// (새 화면을 먼저 만들면 이전 화면의 정리 코드가 새 화면의 UI까지 숨겨 버린다)
function swap(make) { if (mode) mode.dispose(); mode = null; mode = make(); size = [0, 0]; }
function toSelect() { swap(() => createSelect(renderer, toGame)); }
function toGame(profile) {
  lastProfile = profile;
  swap(() => createGame(renderer, profile, what => {
    if (what === 'retry') toGame(lastProfile);
    else if (what === 'next') {
      const next = MAPS[MAPS.findIndex(m => m.id === lastProfile.map) + 1] || MAPS[0];
      lastProfile = { ...lastProfile, map: next.id }; saveProfile(lastProfile); toGame(lastProfile);
    } else toSelect();
  }));
}

let last = performance.now();
function loop() {
  const now = performance.now();
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
  const w = window.innerWidth, h = window.innerHeight;
  if (mode) {
    if (w !== size[0] || h !== size[1]) { size = [w, h]; renderer.setSize(w, h, false); mode.resize(w, h); }
    mode.update(dt, now / 1000);
  }
  requestAnimationFrame(loop);
}
// 개발용: ?map=city 처럼 전장을 지정해 바로 확인한다 (?unlock과 함께 쓴다)
const mapParam = new URLSearchParams(location.search).get('map');
if (mapParam && MAPS.some(m => m.id === mapParam)) saveProfile({ ...loadProfile(), map: mapParam });
toSelect();
requestAnimationFrame(loop);

// 개발 중 화면 확인용: #play는 선택창을 건너뛰고, #sim은 거기에 더해 자동 조준·연사로 미리 진행한다.
// #sim 뒤에 초를 붙일 수 있다(#sim90). #retry는 재시작 뒤에도 UI가 남는지 확인한다.
const hash = location.hash.slice(1);
if (/^(play|sim|retry|die)/.test(hash)) {
  const n = document.getElementById('name'); if (!n.value) { n.value = '테스트'; n.dispatchEvent(new Event('input')); }
  document.getElementById('go').click();
}
if (/^(sim|retry|die)/.test(hash)) {
  try {
    const key = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code }));
    const run = secs => {
      mode.resize(window.innerWidth, window.innerHeight); mode.peek();
      const dirs = ['KeyD', 'KeyS', 'KeyA', 'KeyW'];
      for (let i = 0; i < secs * 60 / 90; i++) { key('keydown', dirs[i % 4]); mode.sim(90); key('keyup', dirs[i % 4]); }
      return mode.sim(0);
    };
    let res;
    if (hash.startsWith('die')) { // 가만히 서서 죽은 뒤, 결과 화면의 버튼이 실제로 눌리는 위치에 있는지 본다
      mode.resize(window.innerWidth, window.innerHeight); mode.peek(); res = mode.sim(60 * 240, true);
      res.buttons = [...document.querySelectorAll('#over button')].filter(b => !b.hidden).map(b => { const r = b.getBoundingClientRect(), el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return b.id + ':' + (el === b ? 'ok' : (el && (el.id || el.tagName))); });
    } else {
      res = run(+hash.replace(/\D/g, '') || 20);
      if (hash.startsWith('retry')) { document.getElementById('p-retry').click(); res = run(5); res.hud = !document.getElementById('hud').hidden; }
    }
    document.title = JSON.stringify(res);
  } catch (e) { document.getElementById('help').textContent = 'SIM ERROR: ' + e.message; document.title = 'SIM ERROR: ' + e.message; throw e; }
}
