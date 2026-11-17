// 캐릭터 선택창: 라이더 동물, 악세사리, 이름, 전장(해금·기록), 설정
import * as T from 'three';
import { addLights, setShadowArea } from './kit.js';
import { MAPS, getMap, buildDiorama } from './maps.js';
import { buildCapy, animateCapy } from './models/capy.js';
import { RIDERS, ACCESSORIES, buildRider } from './models/riders.js';
import { loadProfile, saveProfile, randomName, loadProgress, saveProgress, fmtTime } from './save.js';
import { initAudio, setSound, sfx } from './audio.js';

const $ = id => document.getElementById(id);

export function createSelect(renderer, onStart) {
  const profile = loadProfile(), progress = loadProgress();
  const unlockAll = location.search.includes('unlock');
  const isOpen = i => unlockAll || i === 0 || progress.cleared.includes(MAPS[i - 1].id);
  if (!isOpen(MAPS.indexOf(getMap(profile.map)))) profile.map = MAPS[0].id;

  const scene = new T.Scene(); scene.background = new T.Color(0xcfe8dc);
  const cam = new T.PerspectiveCamera(30, 1, 0.1, 100);
  const sun = addLights(scene); setShadowArea(sun, 5);

  const turn = new T.Group(); scene.add(turn);
  let stage = null;
  function refreshMap() {
    const map = getMap(profile.map); profile.map = map.id;
    if (stage) turn.remove(stage);
    stage = buildDiorama(map, 2.6); turn.add(stage);
    scene.background.set(map.sky);
    const best = progress.best[map.id], cleared = progress.cleared.includes(map.id);
    $('map-info').textContent = `${map.blurb} ` + (best ? `최고 기록 ${fmtTime(best.time)} · ${best.kills}마리${cleared ? ' · 클리어' : ''}` : '아직 기록이 없습니다.');
    saveProfile(profile);
  }

  const capy = buildCapy(); turn.add(capy);
  let rider = null, pop = 0;
  function refreshRider() {
    if (rider) capy.userData.seat.remove(rider);
    rider = buildRider(profile); capy.userData.seat.add(rider); pop = 1;
    saveProfile(profile);
  }

  // ── UI ──
  const root = $('select'); root.hidden = false;
  const nameEl = $('name'); nameEl.value = profile.name;
  const onName = () => { profile.name = nameEl.value.trim().slice(0, 12); saveProfile(profile); };
  const onDice = () => { nameEl.value = profile.name = randomName(); saveProfile(profile); };
  function chips(host, items, get, set, locked) {
    host.innerHTML = '';
    items.forEach(([id, label], i) => {
      const b = document.createElement('button'); b.type = 'button'; b.id = host.id + '-' + id;
      const lock = locked && locked(i);
      b.textContent = lock ? label + ' · 잠김' : label; b.disabled = !!lock;
      if (lock) b.title = `「${items[i - 1][1]}」을 클리어하면 열립니다`;
      b.setAttribute('aria-pressed', get() === id);
      b.onclick = () => { initAudio(); sfx.pickup(); set(id); render(); refreshRider(); refreshMap(); };
      host.appendChild(b);
    });
  }
  function render() {
    chips($('animals'), RIDERS.map(r => [r.id, r.label]), () => profile.animal, id => {
      if (id !== profile.animal) Object.assign(profile, { animal: id }, RIDERS.find(r => r.id === id).def);
    });
    chips($('maps'), MAPS.map(m => [m.id, m.name]), () => profile.map, id => { profile.map = id; }, i => !isOpen(i));
    for (const slot of Object.keys(ACCESSORIES)) chips($('acc-' + slot), ACCESSORIES[slot], () => profile[slot], id => { profile[slot] = id; });
  }
  // 설정
  const sensEl = $('sens'), soundEl = $('sound');
  sensEl.value = progress.settings.sens; $('sens-val').textContent = (+sensEl.value).toFixed(1); soundEl.checked = progress.settings.sound !== false;
  const onSens = () => { progress.settings.sens = +sensEl.value; $('sens-val').textContent = (+sensEl.value).toFixed(1); saveProgress(progress); };
  const onSound = () => { progress.settings.sound = soundEl.checked; saveProgress(progress); initAudio(); setSound(soundEl.checked); if (soundEl.checked) sfx.level(); };
  const onGo = () => {
    if (!profile.name) { profile.name = randomName(); }
    saveProfile(profile); onStart({ ...profile });
  };
  nameEl.addEventListener('input', onName);
  $('dice').addEventListener('click', onDice);
  $('go').addEventListener('click', onGo);
  sensEl.addEventListener('input', onSens); soundEl.addEventListener('change', onSound);
  refreshMap(); render(); refreshRider();

  // ── 드래그 회전 ──
  const canvas = renderer.domElement;
  let px = null, drag = 0;
  const down = e => { px = e.clientX; }, move = e => { if (px !== null) { drag += (e.clientX - px) * 0.01; px = e.clientX; } }, up = () => { px = null; };
  canvas.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);

  let W = 1, H = 1;
  function resize(w, h) {
    W = w; H = h; cam.aspect = w / h;
    // 패널이 가리는 만큼 시야를 밀어 캐릭터를 남은 영역 가운데에 둔다
    const r = root.getBoundingClientRect();
    if (w > 760) cam.setViewOffset(w, h, (w - r.left) / 2, 0, w, h);
    else cam.setViewOffset(w, h, 0, (h - r.top) / 2, w, h);
    cam.updateProjectionMatrix();
  }

  function update(dt, t) {
    turn.rotation.y = -0.55 + drag + Math.sin(t * 0.4) * 0.25;
    animateCapy(capy, t, false, true);
    if (rider) { pop = Math.max(0, pop - dt * 3); const s = 1 + Math.sin(pop * Math.PI) * 0.25; rider.scale.set(s, s, s); }
    // 패널을 뺀 영역에 디오라마(반지름 2.6)가 다 들어오도록 거리를 잡는다
    const wide = W > 760, fw = wide ? Math.max(0.3, (W - 440) / W) : 1, fh = wide ? 1 : 0.44, k = Math.tan(15 * Math.PI / 180);
    const d = Math.max(2.9 / (k * cam.aspect * fw), 2.0 / (k * fh));
    cam.position.set(0, 1.0 + Math.sin(0.25) * d, Math.cos(0.25) * d);
    cam.lookAt(0, 1.0, 0);
    renderer.render(scene, cam);
  }

  function dispose() {
    root.hidden = true;
    nameEl.removeEventListener('input', onName);
    $('dice').removeEventListener('click', onDice);
    $('go').removeEventListener('click', onGo);
    sensEl.removeEventListener('input', onSens); soundEl.removeEventListener('change', onSound);
    canvas.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
    cam.clearViewOffset();
  }
  return { update, resize, dispose };
}
