// 전장: 1인칭(라이더 시점) FPS.
// 조작: WASD 이동, 마우스 조준, 좌클릭 게틀링, 우클릭 로켓 포드, Shift+앞으로 돌진,
//       Q 발 구르기, E 미끼 귤, R 궁극기, Space 점프(제트팩), V 시점 전환, Esc 일시정지
import * as T from 'three';
import { add, box, cyl, cone, ell, addLights, setShadowArea, bake, bakedMat } from './kit.js';
import { buildCapy, animateCapy, addGear } from './models/capy.js';
import { RIDERS, buildRider } from './models/riders.js';
import { buildZombie } from './models/zombies.js';
import { MAPS, getMap } from './maps.js';
import { buildWorld } from './world.js';
import { BASE_STATS, rollChoices, xpForLevel } from './upgrades.js';
import { loadProgress, loadAccount, recordRun, fmtTime } from './save.js';
import { initAudio, setSound, sfx } from './audio.js';
import { submitRun, renderRank } from './rank.js';

const $ = id => document.getElementById(id);
const PI = Math.PI, MAX_Z = 420, MAX_B = 320, ARENA = 110;
const WALK = 5.2, SPRINT = 11, JUMP = 8.8, GRAV = 22, SENS = 0.0022, BULLET = 70;
const DECOY_CD = 14, ULT_KILLS = 40, BOSS_EVERY = 60, BOSSES_TO_CLEAR = 3, COMBO_TIME = 3, CRATE_EVERY = 38, BUFF_TIME = 12;
const CHEERS = ['좋아요!', '멈추지 마세요!', '대학살!', '카피바라 폭주!', '전설의 라이더!'];
const BUFFS = [{ id: 'double', name: '두 배 화력' }, { id: 'rapid', name: '폭풍 연사' }, { id: 'shield', name: '귤 방패' }, { id: 'feast', name: '귤 잔치' }];
const WHITE = new T.Color(1, 1, 1), HIT = new T.Color(2.4, 2.4, 2.4), GOLD = new T.Color(1.7, 1.35, 0.45), ICE = new T.Color(0.6, 0.85, 1.6);

export function createGame(renderer, profile, onExit) {
  const map = getMap(profile.map), mapIdx = MAPS.indexOf(map), progress = loadProgress(), account = loadAccount();
  const unlockAll = location.search.includes('unlock');
  const ctxUp = { cleared: unlockAll ? MAPS.length : progress.cleared.length };
  const sens = SENS * (progress.settings.sens || 1);
  initAudio(); setSound(progress.settings.sound !== false);
  // 난이도: 뒤 전장일수록 좀비가 단단하고 아프다. 시간이 갈수록 더 단단해진다.
  const hpMap = 1 + 0.15 * mapIdx, dmgMul = 1 + 0.08 * mapIdx;

  // 좀비 종류: 맵의 6종 + 보스(탱커의 거대 버전에 고유 패턴)
  const tank = map.zombies[2];
  const ZT = [...map.zombies, { ...tank, name: map.boss.name, ability: map.boss.ability, s: tank.s * 2.6, speed: 1.6, radius: 1.7, dps: 30, xp: 0, heavy: true, boss: true }];
  const BOSS = ZT.length - 1;

  const scene = new T.Scene(); scene.fog = new T.Fog(map.sky, map.light.fog[0], map.light.fog[1]);
  const cam = new T.PerspectiveCamera(75, 1, 0.08, 520);
  const sun = addLights(scene, map.light); setShadowArea(sun, 30);
  const world = buildWorld(map, ARENA), plats = world.plats;
  world.meshes.forEach(m => scene.add(m));

  // 벽이면 밀어내고, 올라선 상태면 발밑 높이를 돌려준다
  function collide(e, r) {
    let g = 0; e.blocked = false;
    for (const b of plats) {
      if (e.x <= b.x0 - r || e.x >= b.x1 + r || e.z <= b.z0 - r || e.z >= b.z1 + r) continue;
      if (e.y >= b.top - 0.3) { if (e.x > b.x0 && e.x < b.x1 && e.z > b.z0 && e.z < b.z1) g = Math.max(g, b.top); }
      else if (e.y + 1 > b.base) {
        const dl = e.x - (b.x0 - r), dr = (b.x1 + r) - e.x, du = e.z - (b.z0 - r), dd = (b.z1 + r) - e.z, m = Math.min(dl, dr, du, dd);
        if (m === dl) e.x = b.x0 - r; else if (m === dr) e.x = b.x1 + r; else if (m === du) e.z = b.z0 - r; else e.z = b.z1 + r;
        e.blocked = true;
      }
    }
    return g;
  }

  // 플레이어. 1인칭에서는 라이더를 숨기고(카메라가 라이더 눈), 무기를 시야에 들어오게 어깨 높이로 올린다.
  const capy = buildCapy(); scene.add(capy);
  const rider = buildRider(profile); capy.userData.seat.add(rider);
  const U = capy.userData, gunHome = U.gun.position.clone(), podHome = U.pod.position.clone();
  const flash = ell(0.16, 0.16, 0.16, 0xffe066, { flat: 1 }); U.gunMuzzle.add(flash); flash.visible = false;
  const S = BASE_STATS(), levels = {};
  const R = RIDERS.find(r => r.id === profile.animal) || RIDERS[0]; R.apply(S);
  const P = { x: 0, y: 0, z: 0, vy: 0, yaw: 0, pitch: -0.05, hp: S.maxHp, stamina: 1, grounded: true, sprinting: false };
  let firstPerson = true;
  function applyView() {
    rider.visible = !firstPerson;
    if (firstPerson) { U.gun.position.set(0.82, 0.44, -0.86); U.pod.position.set(0.82, 0.34, 0.9); }
    else { U.gun.position.copy(gunHome); U.pod.position.copy(podHome); }
    $('tag').hidden = firstPerson;
  }

  // 좀비 떼: 종류마다 InstancedMesh 하나. 인스턴스 색으로 피격·정예·빙결을 표시한다.
  const zMesh = ZT.map((Z, i) => {
    const m = new T.InstancedMesh(bake(buildZombie(Z)), bakedMat, i === BOSS ? 8 : MAX_Z + 80);
    m.count = 0; m.castShadow = true; m.frustumCulled = false; m.setColorAt(0, WHITE); scene.add(m); return m;
  });
  const zColor = ZT.map(Z => [new T.Color(Z.shirt), new T.Color(Z.headCol || Z.skin)]);
  const inst = (geo, mat, n) => { const m = new T.InstancedMesh(geo, mat, n); m.count = 0; m.frustumCulled = false; scene.add(m); return m; };
  const zs = [], flyers = [], bs = [], es = [], rockets = [], booms = [], strikes = [], gems = [], parts = [], fires = [], chainQ = [];
  const bMesh = inst(new T.IcosahedronGeometry(0.09, 0), new T.MeshBasicMaterial({ color: 0xffe066 }), MAX_B);
  const eMesh = inst(new T.IcosahedronGeometry(0.24, 0), new T.MeshBasicMaterial({ color: 0x9dff7a }), 140);
  const gMesh = inst(new T.IcosahedronGeometry(0.17, 0), new T.MeshStandardMaterial({ color: 0xf7931e, flatShading: true, roughness: 0.7 }), 400);
  const hMesh = inst(new T.IcosahedronGeometry(0.26, 0), new T.MeshStandardMaterial({ color: 0xe03131, flatShading: true, roughness: 0.6 }), 40);
  const pMesh = inst(new T.BoxGeometry(0.14, 0.14, 0.14), new T.MeshBasicMaterial(), 400);
  const fMesh = inst(new T.ConeGeometry(0.5, 1.1, 5), new T.MeshBasicMaterial({ color: 0xff922b, transparent: true, opacity: 0.85 }), 60);
  const boomGeo = new T.IcosahedronGeometry(1, 1);
  const beam = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 1, 6), new T.MeshBasicMaterial({ color: 0x7df9ff, transparent: true })); beam.visible = false; scene.add(beam);
  const ring = new T.Mesh(new T.RingGeometry(0.86, 1, 40), new T.MeshBasicMaterial({ color: 0xff6b6b, transparent: true, opacity: 0.8, side: T.DoubleSide })); ring.rotation.x = -PI / 2; ring.visible = false; scene.add(ring);
  let slam = null;
  // 맴도는 귤과 오리 드론
  const orbs = [], orbGeo = new T.IcosahedronGeometry(0.3, 1), orbMat = new T.MeshStandardMaterial({ color: 0xf7931e, flatShading: true });
  const drone = new T.Group(); add(drone, ell(0.26, 0.2, 0.22, 0xffd43b)); add(drone, ell(0.16, 0.14, 0.15, 0xffd43b), 0.2, 0.2, 0); add(drone, ell(0.1, 0.04, 0.08, 0xf59a23), 0.36, 0.18, 0); add(drone, cyl(0.3, 0.02, 0xa7b1b8), 0, 0.3, 0); drone.visible = false; scene.add(drone);
  // 보급 상자와 미끼 귤
  const crate = new T.Group(); add(crate, box(1.1, 1.1, 1.1, 0xf2c14e)); add(crate, box(1.14, 0.25, 1.14, 0xd9523a)); add(crate, box(0.25, 1.14, 1.14, 0xd9523a));
  const pillarMat = new T.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.28, depthWrite: false });
  const pillar = new T.Mesh(new T.CylinderGeometry(0.7, 0.7, 60, 8, 1, true), pillarMat); pillar.position.y = 30; crate.add(pillar); crate.visible = false; scene.add(crate);
  const decoyM = new T.Group(); add(decoyM, ell(0.9, 0.8, 0.9, 0xf7931e)); add(decoyM, ell(0.4, 0.1, 0.2, 0x4f8a3c), 0.2, 0.85, 0); add(decoyM, box(0.5, 0.12, 0.05, 0x1d1512, { flat: 1 }), 0, 0.15, 0.88); decoyM.visible = false; scene.add(decoyM);
  let crateOn = false, crateLife = 0, crateT = 25, buff = null, buffT = 0, decoy = null;
  let level = 1, xp = 0, paused = false, choices = [];

  // ── 입력: 마우스 조준(포인터 잠금) + 키보드, 터치는 왼쪽 이동·오른쪽 조준 ──
  const canvas = renderer.domElement, keys = {};
  const stick = { x: 0, y: 0, id: null, o: null }, look = { id: null, last: null };
  let jumpQueued = false, fireHeld = false, rocketHeld = false, locked = false, touchMode = false, autoAim = false, menuOpen = false;
  const want = { q: false, e: false, r: false };
  const setMenu = on => { menuOpen = on; $('pause').hidden = !on; $('cross').hidden = on || paused || over; if (on) { fireHeld = rocketHeld = false; for (const k in keys) keys[k] = false; } };
  const lockNow = () => { if (!touchMode && !over && !paused && document.pointerLockElement !== canvas) { const p = canvas.requestPointerLock?.(); if (p && p.catch) p.catch(() => {}); } };
  const onLock = () => { locked = document.pointerLockElement === canvas; if (!touchMode) setMenu(!locked && !over && !paused); };
  const kd = e => {
    if (paused && /^Digit[123]$/.test(e.code)) { choose(+e.code[5] - 1); return; }
    if (e.code === 'Space') { jumpQueued = true; e.preventDefault(); }
    if (!e.repeat) {
      if (e.code === 'KeyV') { firstPerson = !firstPerson; applyView(); }
      if (e.code === 'KeyQ') want.q = true;
      if (e.code === 'KeyE') want.e = true;
      if (e.code === 'KeyR') want.r = true;
      if (e.code === 'KeyP' && touchMode && !over && !paused) setMenu(!menuOpen);
    }
    keys[e.code] = true;
  };
  const ku = e => { keys[e.code] = false; };
  const mm = e => { if (!locked) return; P.yaw -= e.movementX * sens; P.pitch = Math.max(-1.2, Math.min(1.1, P.pitch - e.movementY * sens)); };
  const md = e => {
    initAudio();
    if (e.pointerType === 'touch') {
      if (!touchMode) { touchMode = true; setMenu(false); $('pause-btn').hidden = false; }
      if (e.clientX < W / 2 && stick.id === null) { stick.id = e.pointerId; stick.o = [e.clientX, e.clientY]; }
      else if (look.id === null) { look.id = e.pointerId; look.last = [e.clientX, e.clientY]; fireHeld = true; }
      else jumpQueued = true;
      return;
    }
    if (!locked) { lockNow(); return; }
    if (e.button === 0) fireHeld = true; if (e.button === 2) rocketHeld = true;
  };
  const mv = e => {
    if (e.pointerId === stick.id) { const dx = e.clientX - stick.o[0], dy = e.clientY - stick.o[1], l = Math.hypot(dx, dy); stick.x = l > 8 ? dx / Math.max(l, 60) : 0; stick.y = l > 8 ? dy / Math.max(l, 60) : 0; }
    else if (e.pointerId === look.id) { P.yaw -= (e.clientX - look.last[0]) * 0.006; P.pitch = Math.max(-1.2, Math.min(1.1, P.pitch - (e.clientY - look.last[1]) * 0.006)); look.last = [e.clientX, e.clientY]; }
  };
  const mu = e => {
    if (e.pointerId === stick.id) { stick.id = null; stick.x = stick.y = 0; }
    else if (e.pointerId === look.id) { look.id = null; fireHeld = false; }
    else if (e.pointerType !== 'touch') { if (e.button === 0) fireHeld = false; if (e.button === 2) rocketHeld = false; }
  };
  const noMenu = e => e.preventDefault();
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
  document.addEventListener('mousemove', mm); document.addEventListener('pointerlockchange', onLock);
  canvas.addEventListener('pointerdown', md); window.addEventListener('pointermove', mv); window.addEventListener('pointerup', mu); window.addEventListener('pointercancel', mu);
  canvas.addEventListener('contextmenu', noMenu);

  // ── HUD와 메뉴 버튼 ──
  const SHOW = ['hud', 'xp', 'help', 'cross', 'skills', 'wave', 'radar'], ALL = [...SHOW, 'tag', 'over', 'levelup', 'pause', 'boss', 'combo', 'banner', 'pause-btn', 'buff'];
  ALL.forEach(id => { $(id).hidden = true; }); SHOW.forEach(id => { $(id).hidden = false; });
  $('hud-name').textContent = profile.name; $('tag').textContent = profile.name; $('map-name').textContent = `${map.name} · ${R.label} (${R.perk})`;
  const toMain = () => { location.href = '/'; };
  const handlers = [
    ['retry', () => onExit('retry')], ['back', () => onExit('select')], ['next', () => onExit('next')], ['endless', () => goEndless()],
    ['resume-btn', () => { if (touchMode) setMenu(false); else lockNow(); }], ['p-retry', () => onExit('retry')], ['p-back', () => onExit('select')],
    ['pause-btn', () => { if (!over && !paused) setMenu(true); }], ['over-main', toMain], ['p-main', toMain],
  ];
  handlers.forEach(([id, fn]) => $(id).addEventListener('click', fn));
  const radar = $('radar').getContext('2d');

  let time = 0, kills = 0, spawnAcc = 1, gunCd = 0, rocketCd = 0, stompCd = 0, decoyCd = 0, laserCd = 0, droneCd = 0, ult = 0, over = false, W = 1, H = 1, firing = false, shake = 0, hurt = 0, lastHp = P.hp;
  let combo = 0, comboT = 0, maxCombo = 0, bannerT = 0, hitMark = 0, magnetT = 0, frame = 0, fireAcc = 0, fireTick = 0;
  let boss = null, bossCount = 0, bossKills = 0, nextBossAt = BOSS_EVERY, endless = false, winPending = false, jetting = false;
  const dummy = new T.Object3D(), v = new T.Vector3(), eye = new T.Vector3(), fwd = new T.Vector3(), aim = new T.Vector3(), UP = new T.Vector3(0, 1, 0);
  applyView(); lockNow(); onLock();

  function banner(text) { const el = $('banner'); el.textContent = text; el.hidden = false; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); bannerT = 2.4; }
  function damage(n) { if (buff && buff.id === 'shield') return; P.hp -= n * (1 - S.armor); }
  // 접촉 피해: 여러 마리가 한꺼번에 붙어도 초당 상한까지만 들어온다 (순식간에 녹지 않게)
  let touchDmg = 0;
  const CONTACT_CAP = 42;
  function burst(x, y, z, color, n, sp) {
    for (let i = 0; i < n && parts.length < 400; i++) parts.push({ x, y, z, vx: (Math.random() - 0.5) * sp, vy: Math.random() * sp * 0.9 + 1, vz: (Math.random() - 0.5) * sp, life: 0.5 + Math.random() * 0.4, c: color });
  }
  const clampA = n => Math.max(-ARENA + 1, Math.min(ARENA - 1, n));

  function spawnAt(type, x, z, elite) {
    const Z = ZT[type], hp = Z.hp * hpMap * (1 + time / 150) * (endless ? 1.5 : 1) * (elite ? 4 : 1);
    zs.push({ type, x: clampA(x), y: 0, z: clampA(z), hp, ph: Math.random() * 6, hit: 0, climb: 0, blocked: false, cd: 1 + Math.random() * 2, slow: 0, ot: 0, elite: !!elite, air: false });
  }
  function spawn() {
    const r = Math.random();
    const type = time > 20 && r < 0.07 ? 2 : time > 35 && r < 0.16 ? 3 : time > 25 && r < 0.28 ? 4 : time > 45 && r < 0.4 ? 5 : r < 0.62 ? 1 : 0;
    const a = Math.random() * PI * 2, d = 22 + Math.random() * 8;
    spawnAt(type, P.x + Math.cos(a) * d, P.z + Math.sin(a) * d, time > 30 && type !== 3 && Math.random() < 0.04);
  }
  function spawnBoss() {
    bossCount++;
    const a = Math.random() * PI * 2, hp = (320 + 260 * (bossCount - 1)) * hpMap;
    boss = { type: BOSS, x: clampA(P.x + Math.cos(a) * 26), y: 0, z: clampA(P.z + Math.sin(a) * 26), hp, maxHp: hp, ph: 0, hit: 0, climb: 0, blocked: false, cd: 4, slow: 0, ot: 0 };
    zs.push(boss); $('boss').hidden = false; $('boss-name').textContent = ZT[BOSS].name;
    banner('보스 출현! ' + ZT[BOSS].name); sfx.boss();
  }
  // 보스 고유 패턴
  function bossAct(q) {
    const ab = ZT[BOSS].ability;
    if (ab === 'summon') { for (let k = 0; k < 6; k++) spawnAt(1, q.x + Math.cos(k) * 3, q.z + Math.sin(k) * 3); banner('보스가 부하를 불러냅니다!'); }
    else if (ab === 'bombs') { for (let k = 0; k < 4; k++) spawnAt(3, q.x + Math.cos(k * 1.6) * 3, q.z + Math.sin(k * 1.6) * 3); banner('폭탄 좀비가 쏟아집니다!'); }
    else if (ab === 'volley') {
      for (let k = 0; k < 14; k++) { const a = k / 14 * PI * 2; es.push({ x: q.x, y: q.y + 2.2, z: q.z, vx: Math.cos(a) * 9, vy: 0, vz: Math.sin(a) * 9, life: 4 }); }
      const dx = P.x - q.x, dz = P.z - q.z, d = Math.hypot(dx, dz) || 1;
      [-0.15, 0, 0.15].forEach(o => es.push({ x: q.x, y: q.y + 2.6, z: q.z, vx: (dx / d - dz / d * o) * 13, vy: (P.y + 1.2 - q.y - 2.6) / (d / 13), vz: (dz / d + dx / d * o) * 13, life: 4 }));
      banner('가시가 날아옵니다!');
    } else { slam = { x: q.x, y: q.y, z: q.z, r: 2, hit: false }; shake = 0.4; sfx.stomp(); banner('충격파! 점프로 피하세요'); }
  }
  // 처치. power가 있으면 (fx,fz) 방향으로 날려 보낸다.
  function kill(i, fx, fz, power = 0) {
    const q = zs[i], Z = ZT[q.type];
    if (Z.boss) {
      boss = null; bossKills++; $('boss').hidden = true; magnetT = 4; shake = 0.5; sfx.boom();
      boom(q.x, 2.5, q.z, 0xffe066, 9); burst(q.x, 3, q.z, zColor[q.type][0], 40, 14);
      for (let k = 0; k < 14 && gems.length < 400; k++) gems.push({ x: q.x + (Math.random() - 0.5) * 6, y: q.y, z: q.z + (Math.random() - 0.5) * 6, v: 4, ph: Math.random() * 6 });
      gems.push({ x: q.x, y: q.y, z: q.z, heart: true, ph: 0 });
      if (bossKills >= BOSSES_TO_CLEAR && !endless) winPending = true; else banner(`보스 처치! 웨이브 ${bossKills + 1}`);
    } else {
      if (power && flyers.length < 80) flyers.push({ type: q.type, x: q.x, y: q.y, z: q.z, vx: fx * power, vy: 5 + Math.random() * 4, vz: fz * power, rot: 0, spin: 8 + Math.random() * 8, yaw: Math.random() * 6 });
      if (gems.length < 400) gems.push({ x: q.x, y: q.y, z: q.z, v: Z.xp * (q.elite ? 6 : 1), ph: Math.random() * 6 });
      if (Math.random() < (q.elite ? 0.4 : 0.015)) gems.push({ x: q.x + 0.4, y: q.y, z: q.z, heart: true, ph: 0 });
      if (Z.bomb) strikes.push({ t: 0.2, x: q.x, y: q.y, z: q.z, r: 3.2, dmg: 7, color: 0xff6b3d, hurt: true });
      burst(q.x, q.y + 0.8 * Z.s, q.z, zColor[q.type][Math.random() < 0.5 ? 0 : 1], q.elite ? 14 : 5, 6);
    }
    zs[i] = zs[zs.length - 1]; zs.pop(); kills++; ult = Math.min(ULT_KILLS, ult + 1); sfx.kill();
    if (S.leech && Math.random() < 0.04 * S.leech) P.hp = Math.min(S.maxHp, P.hp + 2);
    combo++; comboT = COMBO_TIME; maxCombo = Math.max(maxCombo, combo);
    if (combo % 25 === 0) { gems.push({ x: P.x + fwd.x * 2.5, y: P.y, z: P.z + fwd.z * 2.5, heart: true, ph: 0 }); banner(`${combo} 연속! ${CHEERS[Math.min(CHEERS.length - 1, combo / 25 - 1)]}`); sfx.combo(); }
  }
  function boom(x, y, z, color, size) {
    const m = new T.Mesh(boomGeo, new T.MeshBasicMaterial({ color, transparent: true }));
    m.position.set(x, y, z); scene.add(m); booms.push({ m, t: 0, size });
  }
  function blast(x, y, z, radius, dmg, color, slow = 0) {
    boom(x, y + 0.5, z, color, radius);
    for (let i = zs.length - 1; i >= 0; i--) {
      const q = zs[i], dx = q.x - x, dz = q.z - z, d = Math.hypot(dx, dz);
      if (d < radius + ZT[q.type].radius * 0.5 && Math.abs(q.y - y) < 2.5) { q.hp -= dmg; q.hit = 0.12; if (slow) q.slow = slow; if (q.hp <= 0) kill(i, dx / (d || 1), dz / (d || 1), 6); }
    }
  }

  function levelUp() {
    level++;
    choices = rollChoices(levels, ctxUp);
    if (!choices.length) { P.hp = Math.min(S.maxHp, P.hp + 20); return; } // 전부 최대면 체력만 회복
    paused = true; fireHeld = rocketHeld = false; sfx.level();
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    $('lv-title').textContent = `레벨 ${level}!`;
    const host = $('choices'); host.innerHTML = '';
    choices.forEach((u, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'choice' + (u.gear ? ' gear' : u.group === '새 무기' ? ' fresh' : ''); b.id = 'choice-' + i;
      const lv = levels[u.id] || 0;
      b.innerHTML = `<span class="key">${i + 1}</span><span class="grp">${u.group}</span><b>${u.name}</b><span class="desc">${u.desc}</span><span class="pips">${'●'.repeat(lv)}<i>●</i>${'○'.repeat(u.max - lv - 1)}</span>`;
      b.onclick = () => choose(i);
      host.appendChild(b);
    });
    $('levelup').hidden = false; $('pause').hidden = true; $('cross').hidden = true;
  }
  function choose(i) {
    const u = choices[i]; if (!paused || !u) return;
    if (u.gear && !levels[u.id]) addGear(capy, u.gear);
    levels[u.id] = (levels[u.id] || 0) + 1; u.apply(S, P);
    paused = false; choices = []; $('levelup').hidden = true; $('cross').hidden = false;
    if (xp >= xpForLevel(level)) { xp -= xpForLevel(level); levelUp(); }
    else { lockNow(); onLock(); }
  }

  function finish(won) {
    over = true; fireHeld = rocketHeld = false;
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    const better = recordRun(map.id, time, kills, won), best = loadProgress().best[map.id];
    const next = MAPS[mapIdx + 1];
    $('over-title').textContent = won ? `${map.name} 클리어!` : '좀비에게 따라잡혔어요';
    $('over-stats').textContent = `${profile.name}: ${fmtTime(time)} 생존 · 레벨 ${level} · 좀비 ${kills}마리 · 최고 ${maxCombo} 연속`;
    $('over-best').textContent = (better ? '새 기록! ' : '') + `내 최고 기록: ${fmtTime(best.time)} · ${best.kills}마리`
      + (won && next ? ` · 「${next.name}」이 열렸습니다` : '') + (won && mapIdx < 3 ? ' · 새 후반 장비가 레벨업 카드에 등장합니다' : '');
    $('next').hidden = !(won && next); $('endless').hidden = !won; $('retry').hidden = won;
    $('over').hidden = false; ['help', 'cross', 'pause', 'skills', 'boss', 'combo', 'banner', 'buff'].forEach(id => { $(id).hidden = true; });
    if (won) sfx.clear(); else sfx.over();
    // 전체 랭킹에 올리고 결과를 보여준다
    const rankEl = $('over-rank'), rankNote = $('over-rank-note'); rankEl.innerHTML = ''; rankNote.textContent = `${map.name} 전체 랭킹에 올리는 중…`;
    submitRun({ map: map.id, id: account.id, name: profile.name, kills, time: Math.floor(time), level, animal: profile.animal, cleared: won }).then(r => {
      if (!r) { rankNote.textContent = '랭킹 서버에 연결할 수 없어 이 기록은 이 기기에만 저장했습니다.'; return; }
      rankNote.textContent = `${map.name} 전체 랭킹 ${r.rank}위 · 이번 판 ${r.score.toLocaleString()}점 (내 최고 ${r.best.toLocaleString()}점)`;
      renderRank(rankEl, r.top, 5, profile.name);
    });
  }
  function goEndless() {
    over = false; endless = true; winPending = false; nextBossAt = time + BOSS_EVERY;
    $('over').hidden = true; ['help', 'cross', 'skills'].forEach(id => { $(id).hidden = false; });
    banner('무한 모드: 좀비가 더 단단해집니다'); lockNow(); onLock();
  }

  // 조준 방향(fwd)과 카메라 위치(eye)
  function aimVectors() {
    const cp = Math.cos(P.pitch);
    fwd.set(Math.cos(P.yaw) * cp, Math.sin(P.pitch), -Math.sin(P.yaw) * cp);
    const hx = Math.cos(P.yaw), hz = -Math.sin(P.yaw);
    if (firstPerson) eye.set(P.x - hx * 0.3, P.y + 2.42, P.z - hz * 0.3);
    else eye.set(P.x - hx * 6.2 - hz * 0.9, P.y + 3.7, P.z - hz * 6.2 + hx * 0.9);
  }
  // 조준선 광선이 처음 닿는 좀비(또는 지면)까지의 지점을 aim에 넣는다.
  // 총구가 조준선 옆에 있어도 이 점을 향해 쏘면 가까운 적까지 조준선 그대로 맞는다.
  function aimPoint() {
    let best = 60;
    if (fwd.y < -0.001) best = Math.min(best, -eye.y / fwd.y);
    const a = fwd.x * fwd.x + fwd.z * fwd.z, near = firstPerson ? 0.3 : 6.5;
    if (a > 1e-5) for (const q of zs) {
      const Z = ZT[q.type], r = Z.radius + 0.25, ox = q.x - eye.x, oz = q.z - eye.z, tc = (ox * fwd.x + oz * fwd.z) / a;
      if (tc <= near || tc >= best) continue;
      const px = ox - fwd.x * tc, pz = oz - fwd.z * tc; if (px * px + pz * pz > r * r) continue;
      const y = eye.y + fwd.y * tc; if (y > q.y - 0.3 && y < q.y + Z.s * 1.55 + 0.3) best = tc;
    }
    aim.copy(eye).addScaledVector(fwd, Math.max(1.5, best));
  }
  function shoot(from, tx, ty, tz, dmg, spread) {
    const dx = tx - from.x, dy = ty - from.y, dz = tz - from.z, d = Math.hypot(dx, dy, dz) || 1;
    bs.push({ x: from.x, y: from.y, z: from.z, vx: (dx - dz * spread) / d * BULLET, vy: dy / d * BULLET, vz: (dz + dx * spread) / d * BULLET, life: 0.9, pierce: S.pierce, last: null, dmg });
  }

  function update(dt, t) {
    if (!over && !paused && !menuOpen) step(dt, t);
    renderer.render(scene, cam);
  }

  function step(dt, t) {
    time += dt; frame++;
    if (autoAim && zs.length) { // 개발용 자동 조준
      let q = zs[0], bd = 1e9; for (const o of zs) { const d = (o.x - P.x) ** 2 + (o.z - P.z) ** 2; if (d < bd) { bd = d; q = o; } }
      P.yaw = Math.atan2(-(q.z - P.z), q.x - P.x); P.pitch = Math.atan2(q.y + 0.7 * ZT[q.type].s - (P.y + 2.42), Math.sqrt(bd) || 1);
    }
    // ── 이동(시선 기준)과 돌진: Shift를 누른 채 앞으로 ──
    const ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + stick.x;
    const iy = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - stick.y;
    const hx = Math.cos(P.yaw), hz = -Math.sin(P.yaw); // 앞 (hx,hz), 오른쪽 (-hz,hx)
    let mx = hx * iy - hz * ix, mz = hz * iy + hx * ix;
    const ml = Math.hypot(mx, mz), moving = ml > 0.1;
    const wantSprint = ((keys.ShiftLeft || keys.ShiftRight) && iy > 0.1) || (touchMode && iy > 0.95), was = P.sprinting;
    if (wantSprint && (P.sprinting ? P.stamina > 0 : P.stamina > 0.2)) { P.sprinting = true; P.stamina = Math.max(0, P.stamina - dt * 0.33); }
    else { P.sprinting = false; if (!jetting) P.stamina = Math.min(1, P.stamina + dt * S.stReg); }
    if (P.sprinting && !was) sfx.rush();
    const speed = (P.sprinting ? SPRINT : WALK) * S.speed;
    if (moving) {
      const n = Math.max(1, ml); mx /= n; mz /= n;
      P.x = Math.max(-ARENA, Math.min(ARENA, P.x + mx * speed * dt));
      P.z = Math.max(-ARENA, Math.min(ARENA, P.z + mz * speed * dt));
    }
    // ── 점프, 제트팩, 고지대, 점프대, 온천 ──
    const g = collide(P, 0.7);
    if (jumpQueued && P.grounded) { P.vy = JUMP * S.jump; P.grounded = false; sfx.jump(); }
    jumpQueued = false;
    jetting = !!S.jet && keys.Space && !P.grounded && P.stamina > 0;
    if (jetting) { P.vy = Math.min(7, P.vy + 48 * dt); P.stamina = Math.max(0, P.stamina - dt * 0.4); }
    if (U.flames) U.flames.forEach(f => { f.visible = jetting; f.scale.y = 0.4 + Math.random() * 0.4; });
    P.vy -= GRAV * dt; P.y += P.vy * dt;
    if (P.y <= g) {
      if (!P.grounded && P.vy < -7) { blast(P.x, g, P.z, 2.2 + Math.min(3, -P.vy * 0.12), 6, 0xfff1d6); shake = 0.25; sfx.stomp(); } // 착지 충격파
      P.y = g; P.vy = 0; P.grounded = true;
    } else P.grounded = false;
    if (P.grounded && P.y < 0.3) for (const pad of world.pads) if ((P.x - pad.x) ** 2 + (P.z - pad.z) ** 2 < pad.r * pad.r) { P.vy = 17; P.grounded = false; sfx.jump(); break; }
    let bathing = false;
    if (P.y < 0.5) for (const pl of world.pools) if ((P.x - pl.x) ** 2 + (P.z - pl.z) ** 2 < pl.r * pl.r) { bathing = true; P.hp = Math.min(S.maxHp, P.hp + 7 * dt); break; }
    capy.position.set(P.x, P.y, P.z); capy.rotation.y = P.yaw;

    // ── 스폰과 보스 ──
    spawnAcc += dt * (time < 12 ? 1.4 : 1.9 + time / 9); // 처음 12초는 숨 돌릴 틈을 준다
    while (spawnAcc >= 1) { spawnAcc -= 1; if (zs.length < MAX_Z) spawn(); }
    if (time >= nextBossAt) { nextBossAt += BOSS_EVERY; if (!boss) spawnBoss(); }

    // ── 좀비: 이동, 원거리 공격, 도약, 들이받기, 접촉 피해 ──
    for (let i = zs.length - 1; i >= 0; i--) {
      const q = zs[i], Z = ZT[q.type];
      // 미끼 귤이 있으면 가까운 좀비는 그쪽으로 몰린다
      const lure = decoy && !Z.boss && (q.x - decoy.x) ** 2 + (q.z - decoy.z) ** 2 < 15 * 15;
      const tx = lure ? decoy.x : P.x, tz = lure ? decoy.z : P.z;
      const dx = tx - q.x, dz = tz - q.z, d = Math.hypot(dx, dz) || 1, pdx = P.x - q.x, pdz = P.z - q.z, pd = Math.hypot(pdx, pdz) || 1;
      const sp = Z.speed * (q.slow > 0 ? 0.45 : 1) * (q.elite ? 1.15 : 1);
      q.slow = Math.max(0, q.slow - dt); q.ot = Math.max(0, q.ot - dt); q.cd -= dt;
      q.ph += dt * sp * 4; q.hit = Math.max(0, q.hit - dt);
      const touching = pd < Z.radius + 0.9 && Math.abs(P.y - q.y) < (Z.boss ? 4 : 1);
      if (q.air) { // 도약 중
        q.x += q.lx * dt; q.z += q.lz * dt; q.vy -= GRAV * dt; q.y += q.vy * dt;
        const zg = collide(q, Z.radius); if (q.y <= zg && q.vy < 0) { q.y = zg; q.air = false; }
        if (touching) touchDmg += Z.dps * dmgMul * dt;
        continue;
      }
      if (touching && P.sprinting) {
        // 돌진 중에는 치고 지나간다. 탱커와 보스, 정예는 한 번에 못 날린다.
        shake = Math.max(shake, 0.12);
        if ((Z.heavy || q.elite) && q.hp > S.ramDmg) {
          if (q.hit <= 0) { q.hp -= S.ramDmg; q.hit = 0.25; sfx.hit(); }
          if (Z.boss) { P.x += pdx / pd * 0.6; P.z += pdz / pd * 0.6; damage(Z.dps * dmgMul * dt * 0.5); } else { q.x -= pdx / pd * 1.2; q.z -= pdz / pd * 1.2; }
          P.stamina = Math.max(0, P.stamina - 0.08);
        } else { kill(i, -pdx / pd + mx * 0.6, -pdz / pd + mz * 0.6, 7); continue; }
      } else if (touching) touchDmg += Z.dps * dmgMul * dt;
      else if (Z.spit && !lure && pd < 13 && pd > 4) { // 멈춰 서서 침을 뱉는다. 옆으로 움직이면 피할 수 있다
        if (q.cd <= 0) { q.cd = 2.6; es.push({ x: q.x, y: q.y + 1.1, z: q.z, vx: pdx / pd * 10, vy: (P.y + 1.3 - q.y - 1.1) / (pd / 10), vz: pdz / pd * 10, life: 3 }); }
      } else if (Z.leap && !lure && pd > 5 && pd < 13 && q.cd <= 0) { // 플레이어 쪽으로 뛰어오른다. 언덕 위로도 올라온다
        const ta = 2 * 8.5 / GRAV, k = Math.min(1, 14 * ta / pd); q.air = true; q.cd = 3.5; q.vy = 8.5; q.lx = pdx / ta * k; q.lz = pdz / ta * k;
      } else if (d > (lure ? 1.2 : 0)) { q.x += dx / d * sp * dt; q.z += dz / d * sp * dt; }
      if (Z.boss && q.cd <= 0) { q.cd = 7; bossAct(q); }
      const zg = collide(q, Z.radius);
      if (q.blocked) { q.climb += dt; if (q.climb > (Z.boss ? 0.4 : 1.2)) q.y += (Z.boss ? 6 : 3) * dt; }
      else { q.climb = 0; q.y = q.y > zg ? Math.max(zg, q.y - 9 * dt) : zg; }
    }
    if (touchDmg > 0) { damage(Math.min(touchDmg, CONTACT_CAP * dmgMul * dt)); touchDmg = 0; }
    for (let i = 0; i < zs.length; i++) for (let j = i + 1; j < zs.length; j++) {
      const a = zs[i], b = zs[j], dx = b.x - a.x, dz = b.z - a.z, rr = ZT[a.type].radius + ZT[b.type].radius, d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2), p = (rr - d) / d * 0.5; a.x -= dx * p; a.z -= dz * p; b.x += dx * p; b.z += dz * p; }
    }
    for (let i = flyers.length - 1; i >= 0; i--) {
      const f = flyers[i]; f.vy -= GRAV * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt; f.rot += f.spin * dt;
      if (f.y < -0.5) flyers.splice(i, 1);
    }
    // 적의 투사체
    for (let i = es.length - 1; i >= 0; i--) {
      const e = es[i]; e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt; e.life -= dt;
      const hit = (e.x - P.x) ** 2 + (e.y - P.y - 1.2) ** 2 + (e.z - P.z) ** 2 < 0.95;
      if (hit) damage(7 * dmgMul);
      if (hit || e.life <= 0 || e.y < 0) { es[i] = es[es.length - 1]; es.pop(); }
    }
    // 보스 충격파: 고리가 지나갈 때 땅에 있으면 맞는다
    if (slam) {
      slam.r += 13 * dt; const pd = Math.hypot(P.x - slam.x, P.z - slam.z);
      if (!slam.hit && Math.abs(pd - slam.r) < 0.8 && P.y - slam.y < 0.7) { slam.hit = true; damage(22 * dmgMul); shake = 0.3; }
      ring.visible = true; ring.position.set(slam.x, slam.y + 0.15, slam.z); ring.scale.setScalar(slam.r); ring.material.opacity = Math.max(0, 0.85 - slam.r / 26);
      if (slam.r > 22) { slam = null; ring.visible = false; }
    }

    aimVectors(); aimPoint();
    capy.updateMatrixWorld(true);
    const dmgBuff = buff && buff.id === 'double' ? 2 : 1;

    // ── 좌클릭 게틀링: 누르고 있는 동안 연사 ──
    gunCd -= dt; firing = fireHeld;
    if (firing && gunCd <= 0 && bs.length < MAX_B) {
      gunCd = S.fireCd * (buff && buff.id === 'rapid' ? 0.45 : 1); sfx.shot();
      U.gunMuzzle.getWorldPosition(v);
      for (let k = 0; k < S.shots; k++) shoot(v, aim.x, aim.y, aim.z, S.dmg, (k - (S.shots - 1) / 2) * 0.07); // 첫 발은 흩어지지 않는다
    }
    flash.visible = firing && Math.random() < 0.6; flash.scale.setScalar(0.1 + Math.random() * 0.12);
    // ── 오리 드론: 가까운 좀비를 알아서 쏜다 ──
    if (S.drone) {
      drone.visible = true; drone.position.set(P.x + Math.cos(time * 0.9) * 1.6, P.y + 3.3 + Math.sin(time * 2) * 0.15, P.z + Math.sin(time * 0.9) * 1.6);
      droneCd -= dt;
      if (droneCd <= 0) {
        let tq = null, bd = 18 * 18; for (const o of zs) { const d = (o.x - P.x) ** 2 + (o.z - P.z) ** 2; if (d < bd) { bd = d; tq = o; } }
        if (tq) { droneCd = 0.75 - S.drone * 0.12; drone.rotation.y = Math.atan2(-(tq.z - drone.position.z), tq.x - drone.position.x); shoot(drone.position, tq.x, tq.y + 0.7 * ZT[tq.type].s, tq.z, 2 + S.drone, 0); }
      }
    }
    for (let i = bs.length - 1; i >= 0; i--) {
      const b = bs[i]; let dead = false;
      for (let sub = 0; sub < 3 && !dead; sub++) { // 빠른 탄이 좀비를 건너뛰지 않게 1/3 걸음씩
        b.x += b.vx * dt / 3; b.y += b.vy * dt / 3; b.z += b.vz * dt / 3;
        if (b.y < 0) { dead = true; break; }
        for (let j = zs.length - 1; j >= 0 && !dead; j--) {
          const q = zs[j], Z = ZT[q.type], r = Z.radius + 0.22;
          if (q !== b.last && (q.x - b.x) ** 2 + (q.z - b.z) ** 2 < r * r && b.y > q.y - 0.25 && b.y < q.y + Z.s * 1.55 + 0.25) {
            const crit = Math.random() < S.crit;
            q.hp -= b.dmg * dmgBuff * (crit ? S.critMul : 1); q.hit = 0.1; b.last = q; hitMark = crit ? 0.16 : 0.09; sfx.hit(); if (b.pierce-- <= 0) dead = true;
            burst(b.x, b.y, b.z, crit ? GOLD : zColor[q.type][0], crit ? 4 : 1, 4);
            if (S.chain && Math.random() < 0.1 + 0.1 * S.chain) chainQ.push(q);
            if (q.hp <= 0) { const l = Math.hypot(b.vx, b.vz) || 1; kill(j, b.vx / l, b.vz / l, 2.5); }
          }
        }
      }
      b.life -= dt;
      if (dead || b.life <= 0) { bs[i] = bs[bs.length - 1]; bs.pop(); }
    }
    // ── 연쇄 번개: 맞은 좀비에서 주변 좀비로 옮겨붙는다 ──
    while (chainQ.length) {
      const src = chainQ.pop(); let left = 1 + S.chain;
      for (let i = zs.length - 1; i >= 0 && left > 0; i--) {
        const q = zs[i]; if (q === src || (q.x - src.x) ** 2 + (q.z - src.z) ** 2 > 30) continue;
        left--; burst(q.x, q.y + 0.9, q.z, ICE, 4, 5); q.hp -= S.dmg * dmgBuff; q.hit = 0.12; if (q.hp <= 0) kill(i, 0, 0, 0);
      }
    }
    // ── 맴도는 귤 ──
    if (S.orbit) {
      const n = S.orbit + 1;
      while (orbs.length < n) { const m = new T.Mesh(orbGeo, orbMat); scene.add(m); orbs.push(m); }
      orbs.forEach((m, k) => { const a = time * 2.6 + k / n * PI * 2; m.position.set(P.x + Math.cos(a) * 2.7, P.y + 1.1, P.z + Math.sin(a) * 2.7); m.rotation.y = a; });
      for (let i = zs.length - 1; i >= 0; i--) {
        const q = zs[i]; if (q.ot > 0 || Math.abs(q.y - P.y) > 1.6) continue;
        const r = ZT[q.type].radius + 0.5;
        for (const m of orbs) if ((q.x - m.position.x) ** 2 + (q.z - m.position.z) ** 2 < r * r) { q.ot = 0.45; q.hp -= (3 + S.orbit) * dmgBuff; q.hit = 0.1; if (q.hp <= 0) kill(i, q.x - P.x, q.z - P.z, 2); break; }
      }
    }
    // ── 불타는 발자국: 돌진한 자리에 불길이 남는다 ──
    if (S.fire && P.sprinting && P.grounded) { fireAcc += dt; if (fireAcc > 0.18 && fires.length < 60) { fireAcc = 0; fires.push({ x: P.x, y: P.y, z: P.z, life: 2.6 }); } }
    fireTick += dt;
    const burn = fireTick > 0.25; if (burn) fireTick = 0;
    for (let i = fires.length - 1; i >= 0; i--) {
      const f = fires[i]; f.life -= dt; if (f.life <= 0) { fires[i] = fires[fires.length - 1]; fires.pop(); continue; }
      if (burn) for (let j = zs.length - 1; j >= 0; j--) { const q = zs[j]; if ((q.x - f.x) ** 2 + (q.z - f.z) ** 2 < 2.2 && Math.abs(q.y - f.y) < 1.5) { q.hp -= S.fire * 1.2 * dmgBuff; q.hit = 0.08; if (q.hp <= 0) kill(j, 0, 0, 0); } }
    }

    // ── 레이저(후반 장비): 사격 중 주기적으로 조준선 위의 좀비를 일렬로 꿰뚫는다 ──
    laserCd = Math.max(0, laserCd - dt);
    if (S.laser && fireHeld && laserCd <= 0) {
      laserCd = 4 - S.laser * 0.6; sfx.laser(); hitMark = 0.12;
      for (let i = zs.length - 1; i >= 0; i--) {
        const q = zs[i], Z = ZT[q.type], wx = q.x - eye.x, wy = q.y + 0.7 * Z.s - eye.y, wz = q.z - eye.z, tt = wx * fwd.x + wy * fwd.y + wz * fwd.z;
        if (tt < 0.5 || tt > 50) continue;
        const r = Z.radius + 0.7; if (wx * wx + wy * wy + wz * wz - tt * tt > r * r) continue;
        q.hp -= (10 + 6 * S.laser) * dmgBuff; q.hit = 0.12; if (q.hp <= 0) kill(i, fwd.x, fwd.z, 5);
      }
      (U.laserMuzzle || U.rocketMuzzle).getWorldPosition(v);
      aim.copy(eye).addScaledVector(fwd, 50); const len = v.distanceTo(aim);
      beam.position.copy(v).lerp(aim, 0.5); beam.scale.set(1.6, len, 1.6); beam.quaternion.setFromUnitVectors(UP, aim.sub(v).normalize());
      beam.visible = true; beam.material.opacity = 1; aimPoint();
    }
    if (beam.visible) { beam.material.opacity -= dt * 5; if (beam.material.opacity <= 0) beam.visible = false; }

    // ── 우클릭 로켓 포드: 조준 방향으로 발사 ──
    rocketCd = Math.max(0, rocketCd - dt);
    if (rocketHeld && rocketCd <= 0) {
      rocketCd = S.rocketCd; sfx.rocket();
      U.rocketMuzzle.getWorldPosition(v);
      const dx = aim.x - v.x, dy = aim.y - v.y, dz = aim.z - v.z, d = Math.hypot(dx, dy, dz) || 1;
      for (let k = 0; k < S.rockets; k++) {
        const sp = (k - (S.rockets - 1) / 2) * 0.14;
        const m = new T.Group(); add(m, cyl(0.08, 0.4, S.frost ? 0xbfe8ff : 0xfff1d6, { axis: 'x' })); add(m, cone(0.08, 0.16, S.frost ? 0x4dd4ff : 0xd9523a, { axis: 'x' }), 0.28, 0, 0);
        m.position.copy(v); m.rotation.order = 'YZX'; scene.add(m);
        rockets.push({ m, vx: (dx - dz * sp) / d * 28, vy: dy / d * 28, vz: (dz + dx * sp) / d * 28, life: 1.8 });
      }
    }
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i], p = r.m.position;
      p.x += r.vx * dt; p.y += r.vy * dt; p.z += r.vz * dt; r.life -= dt;
      r.m.rotation.y = Math.atan2(-r.vz, r.vx); r.m.rotation.z = Math.atan2(r.vy, Math.hypot(r.vx, r.vz));
      let hit = p.y <= 0.1 || r.life <= 0 || plats.some(b => p.x > b.x0 && p.x < b.x1 && p.z > b.z0 && p.z < b.z1 && p.y < b.top && p.y > b.base);
      for (let j = 0; j < zs.length && !hit; j++) { const q = zs[j], Z = ZT[q.type], rr = Z.radius + 0.5; if ((q.x - p.x) ** 2 + (q.z - p.z) ** 2 < rr * rr && p.y > q.y - 0.3 && p.y < q.y + Z.s * 1.6 + 0.4) hit = true; }
      if (hit) { blast(p.x, Math.max(0, p.y - 0.6), p.z, S.rocketR, 8 * dmgBuff, S.frost ? 0x8fe0ff : 0xffa94d, S.frost ? 1.5 + S.frost : 0); sfx.boom(); shake = Math.max(shake, 0.12); scene.remove(r.m); rockets.splice(i, 1); }
    }

    // ── Q 발 구르기: 카피바라가 껑충 뛰어 주변 좀비를 날린다 ──
    stompCd = Math.max(0, stompCd - dt);
    if (want.q && stompCd <= 0) {
      stompCd = S.stompCd; shake = 0.35; sfx.stomp();
      if (P.grounded) { P.vy = 4.5; P.grounded = false; }
      blast(P.x, P.y, P.z, 5.5, 8 * dmgBuff, 0xfff1d6);
    }
    // ── E 미끼 귤: 조준한 곳에 커다란 귤을 던져 좀비를 꾀어낸 뒤 터뜨린다 ──
    decoyCd = Math.max(0, decoyCd - dt);
    if (want.e && decoyCd <= 0) {
      decoyCd = DECOY_CD; sfx.jump();
      const tt = fwd.y < -0.05 ? Math.min(20, -eye.y / fwd.y) : 14;
      decoy = { x: clampA(eye.x + fwd.x * tt), z: clampA(eye.z + fwd.z * tt), t: 5 }; banner('미끼 귤!');
    }
    if (decoy) {
      decoy.t -= dt; decoyM.visible = true; decoyM.position.set(decoy.x, 0.8 + Math.abs(Math.sin(time * 5)) * 0.3, decoy.z); decoyM.rotation.y = time * 2; decoyM.scale.setScalar(1 + (decoy.t < 1 ? Math.sin(time * 40) * 0.12 : 0));
      if (decoy.t <= 0) { blast(decoy.x, 0, decoy.z, 5, 12 * dmgBuff, 0xf7931e); sfx.boom(); shake = Math.max(shake, 0.25); decoy = null; decoyM.visible = false; }
    }
    // ── R 궁극기 귤 폭격: 처치로 충전, 조준한 지점 일대에 폭발을 쏟아붓는다 ──
    if (want.r && ult >= ULT_KILLS) {
      ult = 0; sfx.ult(); banner('귤 폭격!');
      const tt = fwd.y < -0.05 ? Math.min(30, -eye.y / fwd.y) : 18, cx = eye.x + fwd.x * tt, cz = eye.z + fwd.z * tt;
      for (let k = 0; k < 14; k++) { const a = Math.random() * PI * 2, r = Math.sqrt(Math.random()) * 7; strikes.push({ t: k * 0.12, x: cx + Math.cos(a) * r, y: 0, z: cz + Math.sin(a) * r, r: S.rocketR * 1.25, dmg: 14, color: 0xf7931e }); }
    }
    // 예약된 폭발: 궁극기 탄착과 폭탄 좀비의 연쇄 폭발
    for (let i = strikes.length - 1; i >= 0; i--) {
      const s = strikes[i]; s.t -= dt;
      if (s.t > 0) continue;
      strikes.splice(i, 1); blast(s.x, s.y, s.z, s.r, s.dmg, s.color); sfx.boom(); shake = Math.max(shake, 0.2);
      if (s.hurt && Math.hypot(P.x - s.x, P.z - s.z) < s.r && Math.abs(P.y - s.y) < 2) damage(16 * dmgMul);
    }
    want.q = want.e = want.r = false;

    // ── 보급 상자: 주기적으로 떨어지고, 먹으면 잠시 강해진다 ──
    crateT -= dt;
    if (!crateOn && crateT <= 0) {
      for (let k = 0; k < 10; k++) {
        const a = Math.random() * PI * 2, d = 14 + Math.random() * 12, x = clampA(P.x + Math.cos(a) * d), z = clampA(P.z + Math.sin(a) * d);
        if (plats.some(b => x > b.x0 - 1 && x < b.x1 + 1 && z > b.z0 - 1 && z < b.z1 + 1)) continue;
        crateOn = true; crateLife = 30; crate.visible = true; crate.position.set(x, 0.8, z); banner('보급 상자 투하!'); sfx.combo(); break;
      }
      crateT = CRATE_EVERY;
    }
    if (crateOn) {
      crateLife -= dt; crate.rotation.y += dt; crate.position.y = 0.8 + Math.sin(time * 3) * 0.15;
      if ((P.x - crate.position.x) ** 2 + (P.z - crate.position.z) ** 2 < 3.2 && P.y < 3) {
        crateOn = false; crate.visible = false; buff = BUFFS[Math.floor(Math.random() * BUFFS.length)]; buffT = BUFF_TIME; banner(buff.name + '!'); sfx.level();
        if (buff.id === 'feast') magnetT = BUFF_TIME;
      } else if (crateLife <= 0) { crateOn = false; crate.visible = false; }
    }
    if (buff) { buffT -= dt; if (buffT <= 0) buff = null; }

    for (let i = booms.length - 1; i >= 0; i--) {
      const b = booms[i]; b.t += dt; const k = b.t / 0.3;
      b.m.scale.setScalar(b.size * (0.2 + k * 0.8)); b.m.material.opacity = 1 - k;
      if (k >= 1) { scene.remove(b.m); b.m.material.dispose(); booms.splice(i, 1); }
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.vy -= 14 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.life -= dt;
      if (p.life <= 0 || p.y < 0) { parts[i] = parts[parts.length - 1]; parts.pop(); }
    }

    // ── 귤(경험치)과 체력 귤 ──
    magnetT = Math.max(0, magnetT - dt);
    const reach = magnetT > 0 ? 999 : S.magnet, xpGain = S.xpMul * (buff && buff.id === 'feast' ? 2 : 1);
    for (let i = gems.length - 1; i >= 0; i--) {
      const q = gems[i], dx = P.x - q.x, dz = P.z - q.z, d = Math.hypot(dx, dz) || 1;
      q.ph += dt * 4;
      if (d < 0.9 && Math.abs(P.y - q.y) < 2.5) {
        if (q.heart) { P.hp = Math.min(S.maxHp, P.hp + 15); sfx.heart(); } else { xp += q.v * xpGain; sfx.pickup(); }
        gems[i] = gems[gems.length - 1]; gems.pop(); continue;
      }
      if (d < reach) { const sp = magnetT > 0 ? 30 : 15; q.x += dx / d * sp * dt; q.z += dz / d * sp * dt; q.y += (P.y - q.y) * Math.min(1, dt * 8); }
      else if (d < 45) { q.x += dx / d * 2.5 * dt; q.z += dz / d * 2.5 * dt; } // 멀리 떨어진 귤도 천천히 굴러온다
    }
    if (xp >= xpForLevel(level)) { xp -= xpForLevel(level); levelUp(); }

    if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0; }

    // ── 인스턴스 행렬과 색 ──
    const counts = ZT.map(() => 0);
    for (const q of zs) {
      const m = zMesh[q.type], k = counts[q.type]++;
      dummy.position.set(q.x, q.y + (q.air ? 0 : Math.abs(Math.sin(q.ph)) * 0.12), q.z);
      dummy.rotation.set(0, Math.atan2(-(P.z - q.z), P.x - q.x), q.air ? -0.5 : Math.sin(q.ph) * 0.1);
      dummy.scale.setScalar(q.elite ? 1.35 : 1);
      dummy.updateMatrix(); m.setMatrixAt(k, dummy.matrix);
      m.setColorAt(k, q.hit > 0 ? HIT : q.slow > 0 ? ICE : q.elite ? GOLD : WHITE);
    }
    dummy.scale.setScalar(1);
    for (const f of flyers) {
      const m = zMesh[f.type], k = counts[f.type]++;
      dummy.position.set(f.x, f.y + 0.5, f.z); dummy.rotation.set(f.rot * 0.7, f.yaw, f.rot);
      dummy.updateMatrix(); m.setMatrixAt(k, dummy.matrix); m.setColorAt(k, WHITE);
    }
    zMesh.forEach((m, i) => { m.count = counts[i]; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
    dummy.rotation.set(0, 0, 0);
    const fill = (mesh, list, y) => { list.forEach((b, i) => { dummy.position.set(b.x, b.y + y, b.z); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); }); mesh.count = list.length; mesh.instanceMatrix.needsUpdate = true; };
    fill(bMesh, bs, 0); fill(eMesh, es, 0);
    fires.forEach((f, i) => { dummy.position.set(f.x, f.y + 0.5, f.z); dummy.scale.set(1, (0.5 + Math.random() * 0.6) * Math.min(1, f.life), 1); dummy.updateMatrix(); fMesh.setMatrixAt(i, dummy.matrix); });
    fMesh.count = fires.length; fMesh.instanceMatrix.needsUpdate = true; dummy.scale.setScalar(1);
    let gc = 0, hc = 0;
    for (const q of gems) {
      dummy.position.set(q.x, q.y + (q.heart ? 0.5 : 0.3) + Math.sin(q.ph) * 0.08, q.z); dummy.rotation.y = q.ph * 0.5; dummy.updateMatrix();
      if (q.heart) { if (hc < 40) hMesh.setMatrixAt(hc++, dummy.matrix); } else if (gc < 400) gMesh.setMatrixAt(gc++, dummy.matrix);
    }
    gMesh.count = gc; gMesh.instanceMatrix.needsUpdate = true; hMesh.count = hc; hMesh.instanceMatrix.needsUpdate = true;
    parts.forEach((p, i) => { dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(p.life * 9, p.life * 7, 0); dummy.updateMatrix(); pMesh.setMatrixAt(i, dummy.matrix); pMesh.setColorAt(i, p.c); });
    pMesh.count = parts.length; pMesh.instanceMatrix.needsUpdate = true; if (pMesh.instanceColor) pMesh.instanceColor.needsUpdate = true;
    dummy.rotation.set(0, 0, 0);

    animateCapy(capy, t * (P.sprinting ? 1.6 : 1), moving && P.grounded, firing);
    world.anims.forEach(a => { a.m.rotation[a.axis] += a.speed * dt; });
    world.far.rotation.y += dt * 0.002;

    // ── 카메라: 라이더 눈높이(1인칭) 또는 어깨 뒤(3인칭). 돌진하면 시야가 넓어진다 ──
    shake = Math.max(0, shake - dt);
    const bob = firstPerson && moving && P.grounded ? Math.sin(t * (P.sprinting ? 19 : 12)) * (P.sprinting ? 0.05 : 0.025) : 0;
    cam.position.set(eye.x + (Math.random() - 0.5) * shake, eye.y + bob + (Math.random() - 0.5) * shake, eye.z + (Math.random() - 0.5) * shake);
    v.copy(cam.position).add(fwd); cam.lookAt(v);
    const fov = (W < H ? 90 : 75) + (P.sprinting ? 9 : 0);
    if (Math.abs(cam.fov - fov) > 0.1) { cam.fov += (fov - cam.fov) * Math.min(1, dt * 8); cam.updateProjectionMatrix(); }
    sun.position.set(P.x + 6, 14, P.z + 7); sun.target.position.set(P.x, 0, P.z);
    world.sky.position.copy(cam.position); world.updateAir(time, cam.position.x, cam.position.y, cam.position.z);

    hud(dt, bathing);
    if (P.hp <= 0) finish(false);
    else if (winPending) { winPending = false; finish(true); }
  }

  function hud(dt, bathing) {
    if (P.hp < lastHp - 0.01) { hurt = Math.min(1, hurt + (lastHp - P.hp) * 0.12); sfx.hurt(); }
    lastHp = P.hp; hurt = Math.max(0, hurt - dt * 1.5); $('hurt').style.opacity = hurt;
    hitMark = Math.max(0, hitMark - dt); $('cross').classList.toggle('hit', hitMark > 0);
    $('hp-fill').style.width = Math.max(0, P.hp) / S.maxHp * 100 + '%';
    $('xp-fill').style.width = Math.min(1, xp / xpForLevel(level)) * 100 + '%';
    $('lv').textContent = 'Lv ' + level;
    $('st-fill').style.width = P.stamina * 100 + '%';
    $('kills').textContent = kills;
    $('time').textContent = fmtTime(time);
    const slot = (id, wait) => { const el = $(id); el.style.setProperty('--wait', Math.max(0, Math.min(1, wait)) * 100 + '%'); el.classList.toggle('ready', wait <= 0); };
    slot('sk-m2', rocketCd / S.rocketCd); slot('sk-q', stompCd / S.stompCd); slot('sk-e', decoyCd / DECOY_CD); slot('sk-r', 1 - ult / ULT_KILLS);
    $('wave').textContent = boss ? '보스전!' : endless ? `무한 모드 · 다음 보스 ${fmtTime(Math.max(0, nextBossAt - time))}` : `웨이브 ${Math.min(BOSSES_TO_CLEAR, bossKills + 1)}/${BOSSES_TO_CLEAR} · 보스까지 ${fmtTime(Math.max(0, nextBossAt - time))}`;
    if (boss) $('boss-fill').style.width = Math.max(0, boss.hp) / boss.maxHp * 100 + '%';
    const cEl = $('combo'); cEl.hidden = combo < 5; if (combo >= 5) { cEl.textContent = combo + ' 연속'; cEl.style.opacity = Math.min(1, comboT / 1.2); }
    const bEl = $('buff'); bEl.hidden = !buff && !bathing; if (buff) bEl.textContent = `${buff.name} ${Math.ceil(buffT)}초`; else if (bathing) bEl.textContent = '온천욕 중: 체력 회복';
    if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').hidden = true; }
    if (!firstPerson) {
      v.set(P.x, P.y + 2.9, P.z).project(cam);
      $('tag').style.transform = `translate(-50%,-100%) translate(${(v.x * 0.5 + 0.5) * W}px,${(-v.y * 0.5 + 0.5) * H}px)`;
    }
    // 레이더: 앞이 위. 반경 34 안의 좀비와 보급 상자를 점으로
    if (frame % 3 === 0) {
      const RR = 60, sc = RR / 34, c = Math.cos(P.yaw), s = Math.sin(P.yaw);
      const dot = (x, z, col, sz) => { const dx = x - P.x, dz = z - P.z; let f = dx * c - dz * s, r = dx * s + dz * c; const l = Math.hypot(f, r); if (l > 33) { if (sz < 5) return; f *= 33 / l; r *= 33 / l; } radar.fillStyle = col; radar.fillRect(60 + r * sc - sz / 2, 60 - f * sc - sz / 2, sz, sz); };
      radar.clearRect(0, 0, 120, 120);
      radar.fillStyle = 'rgba(58,42,28,.55)'; radar.beginPath(); radar.arc(60, 60, RR - 1, 0, 7); radar.fill();
      radar.strokeStyle = 'rgba(255,248,234,.35)'; radar.beginPath(); radar.arc(60, 60, RR / 2, 0, 7); radar.stroke();
      for (const q of zs) { const Z = ZT[q.type]; dot(q.x, q.z, Z.boss ? '#ffe066' : Z.bomb ? '#ff922b' : Z.spit ? '#d0a6ff' : Z.heavy ? '#ff6b6b' : q.elite ? '#ffd43b' : '#b6f09c', Z.boss ? 6 : Z.heavy || q.elite ? 3 : 2); }
      if (crateOn) dot(crate.position.x, crate.position.z, '#7df9ff', 6);
      radar.fillStyle = '#fff'; radar.beginPath(); radar.moveTo(60, 53); radar.lineTo(65, 65); radar.lineTo(55, 65); radar.fill();
    }
  }

  function resize(w, h) { W = w; H = h; cam.aspect = w / h; cam.updateProjectionMatrix(); aimVectors(); cam.position.copy(eye); v.copy(eye).add(fwd); cam.lookAt(v); world.sky.position.copy(eye); world.updateAir(0, eye.x, eye.y, eye.z); }
  function dispose() {
    window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
    document.removeEventListener('mousemove', mm); document.removeEventListener('pointerlockchange', onLock);
    canvas.removeEventListener('pointerdown', md); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', mu); window.removeEventListener('pointercancel', mu);
    canvas.removeEventListener('contextmenu', noMenu);
    handlers.forEach(([id, fn]) => $(id).removeEventListener('click', fn));
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    ALL.forEach(id => { $(id).hidden = true; });
    $('hurt').style.opacity = 0;
    zMesh.forEach(m => { m.geometry.dispose(); m.dispose(); }); [bMesh, eMesh, gMesh, hMesh, pMesh, fMesh].forEach(m => { m.geometry.dispose(); m.material.dispose(); m.dispose(); });
    world.dispose();
  }
  // 개발용: 화면을 그리지 않고 n프레임을 빠르게 진행한다 (자동 조준·연사, 스킬은 찰 때마다 사용). idle이면 아무것도 하지 않는다.
  function sim(n, idle) {
    autoAim = !idle; fireHeld = rocketHeld = !idle;
    for (let i = 0; i < n && !over; i++) { if (paused) choose(0); else { if (!idle) want.q = want.e = want.r = true; step(1 / 60, time); } }
    autoAim = false; fireHeld = rocketHeld = false;
    return { level, levels, kills, hp: Math.round(P.hp), time: Math.round(time), bossKills, maxCombo, over };
  }
  return { update, resize, dispose, sim, grant: n => { xp += n; }, peek: () => { touchMode = true; setMenu(false); } };
}
