// 캐릭터 선택창: 라이더 동물, 악세사리, 이름, 전장(해금·기록), 설정
import * as T from 'three';
import { addLights, setShadowArea } from './kit.js';
import { MAPS, getMap, buildDiorama } from './maps.js';
import { buildCapy, animateCapy } from './models/capy.js';
import { RIDERS, ACCESSORIES, buildRider } from './models/riders.js';
import { loadProfile, saveProfile, randomName, loadProgress, saveProgress, fmtTime, loadAccount, saveAccount, validNick } from './save.js';
import { fetchTop, renderRank } from './rank.js';
import { ACHS, CATS, TIER, TITLES, getState, chooseTitle } from './achievements.js';
import { DIFFS, getDiff } from './difficulty.js';
import { initAudio, setSound, sfx } from './audio.js';

const $ = id => document.getElementById(id);

export function createSelect(renderer, onStart) {
  const profile = loadProfile(), progress = loadProgress(), account = loadAccount();
  profile.name = account.nick; // 닉네임은 계정 것이라 캐릭터를 바꿔도 그대로다
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
    showBoard(map.id);
  }
  // 왼쪽 위 전체 랭킹 보드: 전장 탭을 눌러 다른 전장의 순위도 본다
  let boardMap = null;
  function showBoard(id) {
    boardMap = id; const m = getMap(id);
    const tabs = $('rb-tabs'); tabs.innerHTML = '';
    MAPS.forEach(x => { const b = document.createElement('button'); b.type = 'button'; b.id = 'rb-' + x.id; b.textContent = x.name; b.setAttribute('aria-pressed', x.id === id); b.onclick = () => showBoard(x.id); tabs.appendChild(b); });
    $('rank-map').textContent = '· ' + m.name; $('rank').innerHTML = '<li class="none">불러오는 중…</li>';
    fetchTop(id).then(top => { if (boardMap === id) renderRank($('rank'), top, 10, account.nick); });
  }
  // 칭호와 메달, 업적 화면
  function renderTitle() {
    const st = getState(), sel = $('title-sel');
    sel.innerHTML = st.titles.map(t => `<option value="${t.id}"${t.id === st.title.id ? ' selected' : ''}>${t.name}</option>`).join('');
    $('medals').textContent = `메달 ${st.total}/${ACHS.length} · 백금 ${st.medals[3]} · 금 ${st.medals[2]} · 은 ${st.medals[1]} · 동 ${st.medals[0]} · 칭호 ${st.titles.length}/${TITLES.length}`;
    return st;
  }
  function renderAch() {
    const st = renderTitle(), have = new Set(st.titles.map(t => t.id));
    $('ach-sum').textContent = `업적 ${st.total}/${ACHS.length}개 달성 · 백금 ${st.medals[3]} · 금 ${st.medals[2]} · 은 ${st.medals[1]} · 동 ${st.medals[0]} · 누적 처치 ${st.stats.kills.toLocaleString()}마리`;
    const tl = $('title-list'); tl.innerHTML = '';
    TITLES.forEach(t => {
      const b = document.createElement('button'); b.type = 'button'; b.id = 'tl-' + t.id; b.textContent = t.name; b.title = t.how;
      if (!have.has(t.id)) { b.className = 'locked'; b.disabled = true; } else { b.setAttribute('aria-pressed', t.id === st.title.id); b.onclick = () => { chooseTitle(t.id); renderAch(); }; }
      tl.appendChild(b);
    });
    $('ach-list').innerHTML = CATS.map(c => `<h3>${c}</h3><ul class="achs">` + ACHS.filter(a => a.cat === c).map(a => {
      const cur = Math.min(a.goal, a.get(st.stats)), done = cur >= a.goal;
      return `<li class="${done ? 'done' : ''}"><span class="md t${a.tier}">${TIER[a.tier].name}</span><b>${a.name}</b><span class="ds">${a.desc}${a.goal > 1 ? ` (${Math.floor(cur).toLocaleString()}/${a.goal.toLocaleString()})` : ''}</span><span class="pbar"><i style="width:${cur / a.goal * 100}%"></i></span></li>`;
    }).join('') + '</ul>').join('');
  }
  const onTitle = () => chooseTitle($('title-sel').value);
  const onAchOpen = () => { renderAch(); $('ach').hidden = false; }, onAchClose = () => { $('ach').hidden = true; renderTitle(); };

  const capy = buildCapy(); turn.add(capy);
  let rider = null, pop = 0;
  function refreshRider() {
    if (rider) capy.userData.seat.remove(rider);
    rider = buildRider(profile); capy.userData.seat.add(rider); pop = 1;
    saveProfile(profile);
  }

  // ── UI ──
  const root = $('select'); root.hidden = false; $('rankboard').hidden = false;
  const nameEl = $('name'), msgEl = $('nick-msg'), goEl = $('go'); nameEl.value = account.nick;
  const NICK_HELP = '닉네임은 계정에 저장되어 캐릭터를 바꿔도 그대로이고, 전체 랭킹에 표시됩니다.';
  function checkNick(warn) {
    const ok = validNick(nameEl.value);
    goEl.disabled = !ok; nameEl.classList.toggle('bad', !ok && warn); msgEl.classList.toggle('bad', !ok && warn);
    msgEl.textContent = ok || !warn ? NICK_HELP : '닉네임을 2자 이상 입력해야 시작할 수 있습니다.';
    return ok;
  }
  const onName = () => { account.nick = profile.name = nameEl.value.trim().slice(0, 12); saveAccount(account); saveProfile(profile); checkNick(true); };
  const onDice = () => { nameEl.value = randomName(); onName(); };
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
    $('perk').textContent = '특성: ' + (RIDERS.find(r => r.id === profile.animal) || RIDERS[0]).perk;
    chips($('maps'), MAPS.map(m => [m.id, m.name]), () => profile.map, id => { profile.map = id; }, i => !isOpen(i));
    profile.diff = getDiff(profile.diff).id;
    chips($('diffs'), DIFFS.map(d => [d.id, d.name]), () => profile.diff, id => { profile.diff = id; });
    $('diff-info').textContent = getDiff(profile.diff).desc;
    for (const slot of Object.keys(ACCESSORIES)) chips($('acc-' + slot), ACCESSORIES[slot], () => profile[slot], id => { profile[slot] = id; });
  }
  // 설정
  const sensEl = $('sens'), soundEl = $('sound');
  sensEl.value = progress.settings.sens; $('sens-val').textContent = (+sensEl.value).toFixed(1); soundEl.checked = progress.settings.sound !== false;
  const onSens = () => { progress.settings.sens = +sensEl.value; $('sens-val').textContent = (+sensEl.value).toFixed(1); saveProgress(progress); };
  const onSound = () => { progress.settings.sound = soundEl.checked; saveProgress(progress); initAudio(); setSound(soundEl.checked); if (soundEl.checked) sfx.level(); };
  const onGo = () => {
    if (!checkNick(true)) { nameEl.focus(); return; } // 닉네임 없이는 시작할 수 없다
    saveProfile(profile); onStart({ ...profile });
  };
  nameEl.addEventListener('input', onName);
  $('dice').addEventListener('click', onDice);
  $('go').addEventListener('click', onGo);
  sensEl.addEventListener('input', onSens); soundEl.addEventListener('change', onSound);
  $('title-sel').addEventListener('change', onTitle); $('ach-open').addEventListener('click', onAchOpen); $('ach-close').addEventListener('click', onAchClose);
  renderTitle();
  refreshMap(); render(); refreshRider(); checkNick(false);
  if (!account.nick) nameEl.focus();

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
    root.hidden = true; $('rankboard').hidden = true; $('ach').hidden = true;
    $('title-sel').removeEventListener('change', onTitle); $('ach-open').removeEventListener('click', onAchOpen); $('ach-close').removeEventListener('click', onAchClose);
    nameEl.removeEventListener('input', onName);
    $('dice').removeEventListener('click', onDice);
    $('go').removeEventListener('click', onGo);
    sensEl.removeEventListener('input', onSens); soundEl.removeEventListener('change', onSound);
    canvas.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
    cam.clearViewOffset();
  }
  return { update, resize, dispose };
}
