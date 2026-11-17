import * as T from 'three';
import './style.css';
import { createSelect } from './select.js';
import { createGame } from './game.js';

const canvas = document.getElementById('c');
const renderer = new T.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;

let mode = null, size = [0, 0], lastProfile = null;
function swap(next) { if (mode) mode.dispose(); mode = next; size = [0, 0]; }
function toSelect() { swap(createSelect(renderer, toGame)); }
function toGame(profile) {
  lastProfile = profile;
  swap(createGame(renderer, profile, what => (what === 'retry' ? toGame(lastProfile) : toSelect())));
}

let last = performance.now();
function loop() {
  const now = performance.now();
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
  const w = window.innerWidth, h = window.innerHeight;
  if (w !== size[0] || h !== size[1]) { size = [w, h]; renderer.setSize(w, h, false); mode.resize(w, h); }
  mode.update(dt, now / 1000);
  requestAnimationFrame(loop);
}
toSelect();
requestAnimationFrame(loop);

// 개발 중 화면 확인용: #play는 선택창을 건너뛰고, #sim은 거기에 더해 질주·점프를 섞어 20초를 미리 돌린다
if (location.hash === '#play' || location.hash === '#sim') document.getElementById('go').click();
if (location.hash === '#sim') {
  try {
    const key = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code }));
    mode.resize(window.innerWidth, window.innerHeight);
    mode.sim(600);
    key('keydown', 'KeyD'); key('keydown', 'ShiftLeft');
    for (let i = 0; i < 6; i++) { key('keydown', 'Space'); mode.sim(100); }
    key('keyup', 'KeyD'); key('keyup', 'ShiftLeft');
    if (location.search === '?lv') { // 원을 그리며 귤을 주워 레벨업 흐름을 확인하고, 마지막에 선택창을 띄운다
      const dirs = ['KeyD', 'KeyS', 'KeyA', 'KeyW'];
      for (let i = 0; i < 40; i++) { key('keydown', dirs[i % 4]); mode.sim(90); key('keyup', dirs[i % 4]); }
      mode.grant(999);
    }
    document.title = JSON.stringify(mode.sim(0));
  } catch (e) { document.getElementById('help').textContent = 'SIM ERROR: ' + e.message; throw e; }
}
