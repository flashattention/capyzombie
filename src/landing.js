// 랜딩페이지: 게임과 같은 모델로 만든 3D 미리보기 + 전장/라이더 전환
import * as T from 'three';
import '@fontsource/jua/400.css';
import '@fontsource/ibm-plex-sans-kr/400.css';
import '@fontsource/ibm-plex-sans-kr/500.css';
import '@fontsource/ibm-plex-sans-kr/600.css';
import './landing.css';
import { add, addLights, setShadowArea } from './kit.js';
import { buildCapy, animateCapy } from './models/capy.js';
import { RIDERS, buildRider } from './models/riders.js';
import { buildZombie } from './models/zombies.js';
import { MAPS, buildDiorama } from './maps.js';
import { fetchTop, renderRank } from './rank.js';
import { t, translateDom, lang, LANGS, setLang } from './i18n.js';
import { makeRenderer } from './quality.js';

translateDom();

const $ = id => document.getElementById(id);
const hex = n => '#' + n.toString(16).padStart(6, '0');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = { map: MAPS[0], rider: RIDERS[0] };

// ── 전장 카드 ──
$('maps').innerHTML = MAPS.map(m => `
  <button type="button" class="map" id="map-${m.id}" data-map="${m.id}">
    <span class="sky" style="background:linear-gradient(${m.bg[0]},${m.bg[1]})"><i style="background:${hex(m.ground)}"></i></span>
    <h3>${m.name}</h3>
    <p>${m.blurb}</p>
    <ul class="zlist">${m.zombies.map(z => `<li><span class="role">${t(z.role)}</span><span>${z.name}</span></li>`).join('')}</ul>
  </button>`).join('');

function chips(host, items, current, pick) {
  host.innerHTML = '';
  items.forEach(it => {
    const b = document.createElement('button'); b.type = 'button'; b.id = host.id + '-' + it.id;
    b.textContent = it.name || it.label; b.setAttribute('aria-pressed', it === current());
    b.onclick = () => pick(it);
    host.appendChild(b);
  });
}
function renderChips() {
  chips($('pick-map'), MAPS, () => state.map, m => setMap(m));
  chips($('pick-rider'), RIDERS, () => state.rider, r => { state.rider = r; renderChips(); refreshRider(); });
}

// ── 3D 무대 ──
const wrap = $('stage'), canvas = $('hero');
let renderer = null, refreshRider = () => {}, refreshStage = () => {};
function setMap(m, scroll) {
  state.map = m; renderChips(); refreshStage();
  wrap.style.background = `linear-gradient(${m.bg[0]},${m.bg[1]})`;
  if (scroll) wrap.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
}
$('maps').addEventListener('click', e => { const b = e.target.closest('.map'); if (b) setMap(MAPS.find(m => m.id === b.dataset.map), true); });

try {
  renderer = makeRenderer({ canvas, alpha: true });
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(30, 1.6, 0.1, 100);
  const sun = addLights(scene); setShadowArea(sun, 6);
  const turn = new T.Group(); scene.add(turn);
  const capy = buildCapy(); add(turn, capy, -1.5, 0, 0);
  let rider = null, stage = null, pop = 0;
  const spots = [[0.8, 0.9, 0.25], [0.9, -1.2, -0.3], [2.5, -0.2, 0], [1.9, 1.7, 0.2], [2.0, -1.9, -0.2], [3.0, 1.0, 0.1]];

  refreshRider = () => {
    if (rider) capy.userData.seat.remove(rider);
    rider = buildRider({ animal: state.rider.id, ...state.rider.def }); capy.userData.seat.add(rider); pop = 1;
  };
  refreshStage = () => {
    if (stage) turn.remove(stage);
    stage = buildDiorama(state.map, 3.75);
    stage.userData.zeds = state.map.zombies.map((Z, i) => {
      const z = buildZombie(Z); add(stage, z, spots[i][0], 0, spots[i][1]); z.rotation.y = Math.PI + spots[i][2]; z.userData = { vy: 0, spin: 0 }; return z;
    });
    turn.add(stage);
  };

  let px = null, drag = 0, size = [0, 0], visible = true, moved = 0, bonks = 0;
  wrap.addEventListener('pointerdown', e => { px = e.clientX; moved = 0; wrap.setPointerCapture(e.pointerId); });
  wrap.addEventListener('pointermove', e => { if (px !== null) { moved += Math.abs(e.clientX - px); drag += (e.clientX - px) * 0.01; px = e.clientX; } });
  ['pointerup', 'pointercancel'].forEach(n => wrap.addEventListener(n, () => { px = null; }));
  // 끌지 않고 누르면 좀비들을 날려 보낸다
  wrap.addEventListener('click', () => {
    if (moved > 6 || !stage) return;
    stage.userData.zeds.forEach((z, i) => { if (z.position.y < 0.1) { z.userData.vy = 5 + Math.random() * 3 + i * 0.4; z.userData.spin = (Math.random() - 0.5) * 16; bonks++; } });
    const el = $('bonk'); el.hidden = false; el.textContent = t('날려 버린 좀비 {n}마리', { n: bonks });
  });
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(wrap);

  const frame = ms => {
    requestAnimationFrame(frame);
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (!visible || !w || !h) return;
    if (w !== size[0] || h !== size[1]) { size = [w, h]; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    const t = reduce ? 0 : ms / 1000;
    turn.rotation.y = drag + Math.sin(t * 0.35) * 0.75;
    animateCapy(capy, t, false, !reduce);
    if (rider) { pop = Math.max(0, pop - 0.05); const s = 1 + Math.sin(pop * Math.PI) * 0.25; rider.scale.set(s, s, s); }
    if (stage) stage.userData.zeds.forEach((z, i) => {
      const u = z.userData;
      if (u.vy !== 0 || z.position.y > 0.07) { u.vy -= 0.3; z.position.y += u.vy * 0.016; z.rotation.x += u.spin * 0.016; if (z.position.y <= 0) { z.position.y = 0; u.vy = 0; z.rotation.x = 0; } }
      else { z.rotation.z = Math.sin(t * 2.2 + i * 2) * 0.08; z.position.y = Math.abs(Math.sin(t * 3 + i)) * 0.06; }
    });
    const d = 3.45 / (Math.tan(15 * Math.PI / 180) * Math.min(cam.aspect, 1.6));
    cam.position.set(0, 0.9 + Math.sin(0.3) * d, Math.cos(0.3) * d); cam.lookAt(0, 0.9, 0);
    renderer.render(scene, cam);
  };
  requestAnimationFrame(frame);
} catch (e) {
  wrap.querySelector('.hint').textContent = t('이 브라우저에서는 3D 미리보기를 표시할 수 없습니다');
  console.error(e);
}

setMap(MAPS[0]);
refreshRider();

// ── 전체 랭킹 ──
let rankMap = MAPS[0];
function showRank(m) {
  rankMap = m;
  chips($('rank-tabs'), MAPS, () => rankMap, showRank);
  $('rank-list').innerHTML = `<li class="none">${t('불러오는 중…')}</li>`;
  fetchTop(m.id).then(top => { if (rankMap === m) renderRank($('rank-list'), top, 10); });
}
showRank(MAPS[0]);

// ── 언어 선택 ──
const langSel = $('lang');
if (langSel) {
  langSel.innerHTML = LANGS.map(l => `<option value="${l.id}"${l.id === lang ? ' selected' : ''}>${l.name}</option>`).join('');
  langSel.addEventListener('change', () => setLang(langSel.value));
}
