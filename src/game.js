// 전장: 1인칭(라이더 시점) FPS.
// 조작: WASD 이동, 마우스 조준, 좌클릭 게틀링, 우클릭 돌진, Q·E 추가 무기, R 궁극기, Space 점프, V 시점 전환
import * as T from 'three';
import { add, cyl, cone, box, ell, addLights, setShadowArea, bake, bakedMat } from './kit.js';
import { buildCapy, animateCapy } from './models/capy.js';
import { buildRider } from './models/riders.js';
import { buildZombie } from './models/zombies.js';
import { getMap, pickProp } from './maps.js';
import { BASE_STATS, rollChoices, xpForLevel } from './upgrades.js';

const $ = id => document.getElementById(id);
const PI = Math.PI, MAX_Z = 400, MAX_B = 300, ARENA = 55;
const WALK = 5.2, SPRINT = 11, JUMP = 8.8, GRAV = 22, TIER = 1.2, SENS = 0.0022, BULLET = 45;
const STOMP_CD = 7, ULT_KILLS = 40;

export function createGame(renderer, profile, onExit) {
  const map = getMap(profile.map), ZOMBIES = map.zombies;
  const scene = new T.Scene(); scene.background = new T.Color(map.sky); scene.fog = new T.Fog(map.sky, 34, 70);
  const cam = new T.PerspectiveCamera(75, 1, 0.08, 160);
  const sun = addLights(scene); setShadowArea(sun, 26);

  const ground = new T.Mesh(new T.PlaneGeometry(320, 320), new T.MeshStandardMaterial({ color: map.ground, roughness: 1 }));
  ground.rotation.x = -PI / 2; ground.receiveShadow = true; scene.add(ground);

  // 고지대: 점프로 올라설 수 있는 1~2단 언덕. 좀비는 벽에 붙어 잠시 버둥대다 기어오른다.
  const props = new T.Group(), plats = [];
  const topCol = new T.Color(map.ground).offsetHSL(0, 0.02, -0.07).getHex();
  function slab(cx, cz, w, d, base) {
    plats.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2, base, top: base + TIER });
    add(props, box(w, TIER, d, map.soil), cx, base + TIER / 2, cz);
    add(props, box(w + 0.2, 0.16, d + 0.2, topCol), cx, base + TIER - 0.04, cz);
  }
  for (let i = 0; i < 16; i++) {
    const cx = (Math.random() * 2 - 1) * (ARENA - 8), cz = (Math.random() * 2 - 1) * (ARENA - 8);
    if (Math.hypot(cx, cz) < 10) continue;
    const w = 5 + Math.random() * 4, d = 5 + Math.random() * 4;
    slab(cx, cz, w, d, 0);
    if (Math.random() < 0.45) slab(cx + (Math.random() - 0.5), cz + (Math.random() - 0.5), w - 3, d - 3, TIER);
  }
  for (let i = 0; i < 260; i++) {
    const x = (Math.random() * 2 - 1) * (ARENA + 12), z = (Math.random() * 2 - 1) * (ARENA + 12);
    if (Math.hypot(x, z) < 5 || plats.some(b => x > b.x0 - 1 && x < b.x1 + 1 && z > b.z0 - 1 && z < b.z1 + 1)) continue;
    pickProp(map, Math.random())(props, x, z);
  }
  const propMesh = new T.Mesh(bake(props), bakedMat); propMesh.castShadow = true; propMesh.receiveShadow = true; scene.add(propMesh);

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
  const P = { x: 0, y: 0, z: 0, vy: 0, yaw: 0, pitch: -0.05, hp: 100, stamina: 1, grounded: true, sprinting: false };
  let firstPerson = true;
  function applyView() {
    rider.visible = !firstPerson;
    if (firstPerson) { U.gun.position.set(0.8, 0.5, 0.84); U.pod.position.set(0.8, 0.46, -0.86); }
    else { U.gun.position.copy(gunHome); U.pod.position.copy(podHome); }
    $('tag').hidden = firstPerson;
  }

  // 좀비 떼: 종류마다 InstancedMesh 하나. 날아가는 좀비(flyers)도 같은 메시로 그린다.
  const zMesh = ZOMBIES.map(Z => {
    const m = new T.InstancedMesh(bake(buildZombie(Z)), bakedMat, MAX_Z + 80);
    m.count = 0; m.castShadow = true; m.frustumCulled = false; scene.add(m); return m;
  });
  const zs = [], flyers = [];
  const bMesh = new T.InstancedMesh(new T.IcosahedronGeometry(0.09, 0), new T.MeshBasicMaterial({ color: 0xffe066 }), MAX_B);
  bMesh.count = 0; bMesh.frustumCulled = false; scene.add(bMesh);
  const bs = [], rockets = [], booms = [], strikes = [];
  const boomGeo = new T.IcosahedronGeometry(1, 1);
  // 경험치 귤: 좀비가 떨어뜨리고, 가까이 가면 빨려온다
  const gMesh = new T.InstancedMesh(new T.IcosahedronGeometry(0.17, 0), new T.MeshStandardMaterial({ color: 0xf7931e, flatShading: true, roughness: 0.7 }), 400);
  gMesh.count = 0; gMesh.frustumCulled = false; scene.add(gMesh);
  const gems = [];
  const S = BASE_STATS(), levels = {};
  let level = 1, xp = 0, paused = false, choices = [];

  // ── 입력: 마우스 조준(포인터 잠금) + 키보드, 터치는 왼쪽 이동·오른쪽 조준 ──
  const canvas = renderer.domElement, keys = {};
  const stick = { x: 0, y: 0, id: null, o: null }, look = { id: null, last: null };
  let jumpQueued = false, fireHeld = false, rushHeld = false, locked = false, touchMode = false, autoAim = false;
  const want = { q: false, e: false, r: false }; // 이번 프레임에 눌린 스킬
  const lockNow = () => { if (!touchMode && !over && !paused && document.pointerLockElement !== canvas) { const p = canvas.requestPointerLock?.(); if (p && p.catch) p.catch(() => {}); } };
  const onLock = () => { locked = document.pointerLockElement === canvas; if (!locked) { fireHeld = rushHeld = false; } $('resume').hidden = locked || touchMode || over || paused; };
  const kd = e => {
    if (paused && /^Digit[123]$/.test(e.code)) { choose(+e.code[5] - 1); return; }
    if (e.code === 'Space') { jumpQueued = true; e.preventDefault(); }
    if (!e.repeat) {
      if (e.code === 'KeyV') { firstPerson = !firstPerson; applyView(); }
      if (e.code === 'KeyQ') want.q = true;
      if (e.code === 'KeyE') want.e = true;
      if (e.code === 'KeyR') want.r = true;
    }
    keys[e.code] = true;
  };
  const ku = e => { keys[e.code] = false; };
  const mm = e => { if (!locked) return; P.yaw -= e.movementX * SENS; P.pitch = Math.max(-1.2, Math.min(1.1, P.pitch - e.movementY * SENS)); };
  const md = e => {
    if (e.pointerType === 'touch') {
      touchMode = true; $('resume').hidden = true;
      if (e.clientX < W / 2 && stick.id === null) { stick.id = e.pointerId; stick.o = [e.clientX, e.clientY]; }
      else if (look.id === null) { look.id = e.pointerId; look.last = [e.clientX, e.clientY]; fireHeld = true; }
      else jumpQueued = true;
      return;
    }
    if (!locked) { lockNow(); return; }
    if (e.button === 0) fireHeld = true; if (e.button === 2) rushHeld = true;
  };
  const mv = e => {
    if (e.pointerId === stick.id) { const dx = e.clientX - stick.o[0], dy = e.clientY - stick.o[1], l = Math.hypot(dx, dy); stick.x = l > 8 ? dx / Math.max(l, 60) : 0; stick.y = l > 8 ? dy / Math.max(l, 60) : 0; }
    else if (e.pointerId === look.id) { P.yaw -= (e.clientX - look.last[0]) * 0.006; P.pitch = Math.max(-1.2, Math.min(1.1, P.pitch - (e.clientY - look.last[1]) * 0.006)); look.last = [e.clientX, e.clientY]; }
  };
  const mu = e => {
    if (e.pointerId === stick.id) { stick.id = null; stick.x = stick.y = 0; }
    else if (e.pointerId === look.id) { look.id = null; fireHeld = false; }
    else if (e.pointerType !== 'touch') { if (e.button === 0) fireHeld = false; if (e.button === 2) rushHeld = false; }
  };
  const noMenu = e => e.preventDefault();
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
  document.addEventListener('mousemove', mm); document.addEventListener('pointerlockchange', onLock);
  canvas.addEventListener('pointerdown', md); window.addEventListener('pointermove', mv); window.addEventListener('pointerup', mu); window.addEventListener('pointercancel', mu);
  canvas.addEventListener('contextmenu', noMenu);

  // HUD
  ['hud', 'xp', 'help', 'cross', 'skills'].forEach(id => { $(id).hidden = false; }); $('over').hidden = true;
  $('hud-name').textContent = profile.name; $('tag').textContent = profile.name;
  const onRetry = () => onExit('retry'), onBack = () => onExit('select');
  $('retry').addEventListener('click', onRetry); $('back').addEventListener('click', onBack);

  let time = 0, kills = 0, spawnAcc = 2, gunCd = 0, rocketCd = 0, stompCd = 0, ult = 0, over = false, W = 1, H = 1, firing = false, shake = 0, hurt = 0, lastHp = 100;
  const dummy = new T.Object3D(), v = new T.Vector3(), eye = new T.Vector3(), fwd = new T.Vector3(), aim = new T.Vector3();
  applyView(); lockNow(); onLock();

  function spawn() {
    const r = Math.random();
    const type = time > 20 && r < 0.1 ? 2 : r < 0.32 ? 1 : 0, Z = ZOMBIES[type];
    const a = Math.random() * PI * 2, d = 21 + Math.random() * 6;
    zs.push({ type, x: P.x + Math.cos(a) * d, y: 0, z: P.z + Math.sin(a) * d, hp: Z.hp, ph: Math.random() * 6, hit: 0, climb: 0, blocked: false });
  }
  // 처치. power가 있으면 (fx,fz) 방향으로 날려 보낸다.
  function kill(i, fx, fz, power = 0) {
    const q = zs[i];
    if (power && flyers.length < 80) flyers.push({ type: q.type, x: q.x, y: q.y, z: q.z, vx: fx * power, vy: 5 + Math.random() * 4, vz: fz * power, rot: 0, spin: 8 + Math.random() * 8, yaw: Math.random() * 6 });
    if (gems.length < 400) gems.push({ x: q.x, y: q.y, z: q.z, v: q.type === 2 ? 5 : 1, ph: Math.random() * 6 });
    zs[i] = zs[zs.length - 1]; zs.pop(); kills++; ult = Math.min(ULT_KILLS, ult + 1);
  }
  function boom(x, y, z, color, size) {
    const m = new T.Mesh(boomGeo, new T.MeshBasicMaterial({ color, transparent: true }));
    m.position.set(x, y, z); scene.add(m); booms.push({ m, t: 0, size });
  }
  function blast(x, y, z, radius, dmg, color) {
    boom(x, y + 0.5, z, color, radius);
    for (let i = zs.length - 1; i >= 0; i--) {
      const q = zs[i], dx = q.x - x, dz = q.z - z, d = Math.hypot(dx, dz);
      if (d < radius && Math.abs(q.y - y) < 2) { q.hp -= dmg; q.hit = 0.12; if (q.hp <= 0) kill(i, dx / (d || 1), dz / (d || 1), 6); }
    }
  }

  function levelUp() {
    level++;
    choices = rollChoices(levels);
    if (!choices.length) { P.hp = Math.min(S.maxHp, P.hp + 20); return; } // 전부 최대면 체력만 회복
    paused = true; fireHeld = rushHeld = false;
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    $('lv-title').textContent = `레벨 ${level}!`;
    const host = $('choices'); host.innerHTML = '';
    choices.forEach((u, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'choice'; b.id = 'choice-' + i;
      const lv = levels[u.id] || 0;
      b.innerHTML = `<span class="key">${i + 1}</span><span class="grp">${u.group}</span><b>${u.name}</b><span class="desc">${u.desc}</span><span class="pips">${'●'.repeat(lv)}<i>●</i>${'○'.repeat(u.max - lv - 1)}</span>`;
      b.onclick = () => choose(i);
      host.appendChild(b);
    });
    $('levelup').hidden = false; $('resume').hidden = true; $('cross').hidden = true;
  }
  function choose(i) {
    const u = choices[i]; if (!paused || !u) return;
    levels[u.id] = (levels[u.id] || 0) + 1; u.apply(S, P);
    paused = false; choices = []; $('levelup').hidden = true; $('cross').hidden = false;
    if (xp >= xpForLevel(level)) { xp -= xpForLevel(level); levelUp(); }
    else { lockNow(); onLock(); }
  }

  // 조준 방향(fwd)과 카메라 위치(eye)
  function aimVectors() {
    const cp = Math.cos(P.pitch);
    fwd.set(Math.cos(P.yaw) * cp, Math.sin(P.pitch), -Math.sin(P.yaw) * cp);
    const hx = Math.cos(P.yaw), hz = -Math.sin(P.yaw);
    if (firstPerson) eye.set(P.x - hx * 0.3, P.y + 2.42, P.z - hz * 0.3);
    else eye.set(P.x - hx * 6.2 - hz * 0.9, P.y + 3.7, P.z - hz * 6.2 + hx * 0.9);
  }

  function update(dt, t) {
    if (!over && !paused && (locked || touchMode)) step(dt, t);
    renderer.render(scene, cam);
  }

  function step(dt, t) {
    time += dt;
    if (autoAim && zs.length) { // 개발용 자동 조준
      let q = zs[0], bd = 1e9; for (const o of zs) { const d = (o.x - P.x) ** 2 + (o.z - P.z) ** 2; if (d < bd) { bd = d; q = o; } }
      P.yaw = Math.atan2(-(q.z - P.z), q.x - P.x); P.pitch = Math.atan2(q.y + 0.7 - (P.y + 2.42), Math.sqrt(bd) || 1);
    }
    // ── 이동(시선 기준)과 돌진: 우클릭을 누르면 입력이 없어도 앞으로 내달린다 ──
    const rush = rushHeld || keys.ShiftLeft || keys.ShiftRight;
    const ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + stick.x;
    let iy = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - stick.y;
    if (rushHeld && Math.hypot(ix, iy) < 0.1) iy = 1;
    const hx = Math.cos(P.yaw), hz = -Math.sin(P.yaw); // 앞 (hx,hz), 오른쪽 (-hz,hx)
    let mx = hx * iy - hz * ix, mz = hz * iy + hx * ix;
    const ml = Math.hypot(mx, mz), moving = ml > 0.1;
    const wantSprint = (rush || (touchMode && ml > 0.95)) && moving;
    if (wantSprint && (P.sprinting ? P.stamina > 0 : P.stamina > 0.2)) { P.sprinting = true; P.stamina = Math.max(0, P.stamina - dt * 0.33); }
    else { P.sprinting = false; P.stamina = Math.min(1, P.stamina + dt * S.stReg); }
    const speed = (P.sprinting ? SPRINT : WALK) * S.speed;
    if (moving) {
      const n = Math.max(1, ml); mx /= n; mz /= n;
      P.x = Math.max(-ARENA, Math.min(ARENA, P.x + mx * speed * dt));
      P.z = Math.max(-ARENA, Math.min(ARENA, P.z + mz * speed * dt));
    }
    // ── 점프와 고지대 ──
    const g = collide(P, 0.7);
    if (jumpQueued && P.grounded) { P.vy = JUMP; P.grounded = false; }
    jumpQueued = false;
    P.vy -= GRAV * dt; P.y += P.vy * dt;
    if (P.y <= g) {
      if (!P.grounded && P.vy < -7) { blast(P.x, g, P.z, 2.2, 6, 0xfff1d6); shake = 0.25; } // 착지 충격파
      P.y = g; P.vy = 0; P.grounded = true;
    } else P.grounded = false;
    capy.position.set(P.x, P.y, P.z); capy.rotation.y = P.yaw;

    // ── 스폰 ──
    spawnAcc += dt * (1.5 + time / 12);
    while (spawnAcc >= 1) { spawnAcc -= 1; if (zs.length < MAX_Z) spawn(); }

    // ── 좀비 이동, 들이받기, 접촉 피해 ──
    for (let i = zs.length - 1; i >= 0; i--) {
      const q = zs[i], Z = ZOMBIES[q.type], dx = P.x - q.x, dz = P.z - q.z, d = Math.hypot(dx, dz) || 1;
      const touching = d < Z.radius + 0.9 && Math.abs(P.y - q.y) < 1;
      if (touching && P.sprinting) {
        // 돌진 중에는 치고 지나간다. 탱커는 한 번에 못 날린다.
        shake = Math.max(shake, 0.12);
        if (q.type === 2 && q.hp > S.ramDmg) { if (q.hit <= 0) { q.hp -= S.ramDmg; q.hit = 0.25; } q.x -= dx / d * 1.2; q.z -= dz / d * 1.2; P.stamina = Math.max(0, P.stamina - 0.08); }
        else { kill(i, -dx / d + mx * 0.6, -dz / d + mz * 0.6, 7); continue; }
      } else if (touching) P.hp -= Z.dps * dt;
      else { q.x += dx / d * Z.speed * dt; q.z += dz / d * Z.speed * dt; }
      const zg = collide(q, Z.radius);
      if (q.blocked) { q.climb += dt; if (q.climb > 1.2) q.y += 3 * dt; }
      else { q.climb = 0; q.y = q.y > zg ? Math.max(zg, q.y - 9 * dt) : zg; }
      q.ph += dt * Z.speed * 4; q.hit = Math.max(0, q.hit - dt);
    }
    for (let i = 0; i < zs.length; i++) for (let j = i + 1; j < zs.length; j++) {
      const a = zs[i], b = zs[j], dx = b.x - a.x, dz = b.z - a.z, rr = ZOMBIES[a.type].radius + ZOMBIES[b.type].radius, d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2), p = (rr - d) / d * 0.5; a.x -= dx * p; a.z -= dz * p; b.x += dx * p; b.z += dz * p; }
    }
    for (let i = flyers.length - 1; i >= 0; i--) {
      const f = flyers[i]; f.vy -= GRAV * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt; f.rot += f.spin * dt;
      if (f.y < -0.5) flyers.splice(i, 1);
    }

    // ── 조준점: 조준선이 가리키는 먼 지점으로 총구에서 쏜다 ──
    aimVectors();
    aim.copy(eye).addScaledVector(fwd, 45);
    capy.updateMatrixWorld(true);

    // ── 좌클릭 게틀링: 누르고 있는 동안 연사 ──
    gunCd -= dt; firing = fireHeld;
    if (firing && gunCd <= 0 && bs.length < MAX_B) {
      gunCd = S.fireCd;
      U.gunMuzzle.getWorldPosition(v);
      const dx = aim.x - v.x, dy = aim.y - v.y, dz = aim.z - v.z, d = Math.hypot(dx, dy, dz) || 1;
      for (let k = 0; k < S.shots; k++) {
        const sp = (Math.random() - 0.5) * 0.03 + (k - (S.shots - 1) / 2) * 0.09;
        bs.push({ x: v.x, y: v.y, z: v.z, vx: (dx - dz * sp) / d * BULLET, vy: (dy / d + (Math.random() - 0.5) * 0.02) * BULLET, vz: (dz + dx * sp) / d * BULLET, life: 0.7, pierce: S.pierce, last: null });
      }
    }
    flash.visible = firing && Math.random() < 0.6; flash.scale.setScalar(0.1 + Math.random() * 0.12);
    for (let i = bs.length - 1; i >= 0; i--) {
      const b = bs[i]; let dead = false;
      for (let sub = 0; sub < 2 && !dead; sub++) { // 빠른 탄이 좀비를 건너뛰지 않게 반 걸음씩
        b.x += b.vx * dt / 2; b.y += b.vy * dt / 2; b.z += b.vz * dt / 2;
        if (b.y < 0) { dead = true; break; }
        for (let j = zs.length - 1; j >= 0 && !dead; j--) {
          const q = zs[j], Z = ZOMBIES[q.type], r = Z.radius + 0.15;
          if (q !== b.last && (q.x - b.x) ** 2 + (q.z - b.z) ** 2 < r * r && b.y > q.y - 0.2 && b.y < q.y + Z.s * 1.55 + 0.2) {
            q.hp -= S.dmg; q.hit = 0.1; b.last = q; if (b.pierce-- <= 0) dead = true;
            if (q.hp <= 0) { const l = Math.hypot(b.vx, b.vz) || 1; kill(j, b.vx / l, b.vz / l, 2.5); }
          }
        }
      }
      b.life -= dt;
      if (dead || b.life <= 0) { bs[i] = bs[bs.length - 1]; bs.pop(); }
    }

    // ── Q 로켓 포드: 조준 방향으로 발사 ──
    rocketCd = Math.max(0, rocketCd - dt);
    if (want.q && rocketCd <= 0) {
      rocketCd = S.rocketCd;
      U.rocketMuzzle.getWorldPosition(v);
      const dx = aim.x - v.x, dy = aim.y - v.y, dz = aim.z - v.z, d = Math.hypot(dx, dy, dz) || 1;
      for (let k = 0; k < S.rockets; k++) {
        const sp = (k - (S.rockets - 1) / 2) * 0.14;
        const m = new T.Group(); add(m, cyl(0.08, 0.4, 0xfff1d6, { axis: 'x' })); add(m, cone(0.08, 0.16, 0xd9523a, { axis: 'x' }), 0.28, 0, 0);
        m.position.copy(v); m.rotation.order = 'YZX'; scene.add(m);
        rockets.push({ m, vx: (dx - dz * sp) / d * 24, vy: dy / d * 24, vz: (dz + dx * sp) / d * 24, life: 1.6 });
      }
    }
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i], p = r.m.position;
      p.x += r.vx * dt; p.y += r.vy * dt; p.z += r.vz * dt; r.life -= dt; r.vy -= 3 * dt;
      r.m.rotation.y = Math.atan2(-r.vz, r.vx); r.m.rotation.z = Math.atan2(r.vy, Math.hypot(r.vx, r.vz));
      let hit = p.y <= 0.1 || r.life <= 0 || plats.some(b => p.x > b.x0 && p.x < b.x1 && p.z > b.z0 && p.z < b.z1 && p.y < b.top && p.y > b.base);
      for (let j = 0; j < zs.length && !hit; j++) { const q = zs[j]; if ((q.x - p.x) ** 2 + (q.z - p.z) ** 2 < 0.8 && p.y > q.y - 0.3 && p.y < q.y + 2.4) hit = true; }
      if (hit) { blast(p.x, Math.max(0, p.y - 0.6), p.z, S.rocketR, 8, 0xffa94d); shake = Math.max(shake, 0.12); scene.remove(r.m); rockets.splice(i, 1); }
    }

    // ── E 발 구르기: 카피바라가 껑충 뛰어 주변 좀비를 날린다 ──
    stompCd = Math.max(0, stompCd - dt);
    if (want.e && stompCd <= 0) {
      stompCd = STOMP_CD; shake = 0.35;
      if (P.grounded) { P.vy = 4.5; P.grounded = false; }
      blast(P.x, P.y, P.z, 5.5, 8, 0xfff1d6);
    }

    // ── R 궁극기 귤 폭격: 처치로 충전, 조준한 지점 일대에 폭발을 쏟아붓는다 ──
    if (want.r && ult >= ULT_KILLS) {
      ult = 0;
      const tt = fwd.y < -0.05 ? Math.min(30, -eye.y / fwd.y) : 18, cx = eye.x + fwd.x * tt, cz = eye.z + fwd.z * tt;
      for (let k = 0; k < 14; k++) { const a = Math.random() * PI * 2, r = Math.sqrt(Math.random()) * 7; strikes.push({ t: k * 0.12, x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r }); }
    }
    for (let i = strikes.length - 1; i >= 0; i--) {
      const s = strikes[i]; s.t -= dt;
      if (s.t <= 0) { blast(s.x, 0, s.z, S.rocketR * 1.25, 14, 0xf7931e); shake = Math.max(shake, 0.2); strikes.splice(i, 1); }
    }
    want.q = want.e = want.r = false;

    for (let i = booms.length - 1; i >= 0; i--) {
      const b = booms[i]; b.t += dt; const k = b.t / 0.3;
      b.m.scale.setScalar(b.size * (0.2 + k * 0.8)); b.m.material.opacity = 1 - k;
      if (k >= 1) { scene.remove(b.m); b.m.material.dispose(); booms.splice(i, 1); }
    }

    // ── 경험치 귤 ──
    for (let i = gems.length - 1; i >= 0; i--) {
      const q = gems[i], dx = P.x - q.x, dz = P.z - q.z, d = Math.hypot(dx, dz) || 1;
      q.ph += dt * 4;
      if (d < 0.9 && Math.abs(P.y - q.y) < 2.5) { xp += q.v; gems[i] = gems[gems.length - 1]; gems.pop(); continue; }
      if (d < S.magnet) { q.x += dx / d * 15 * dt; q.z += dz / d * 15 * dt; q.y += (P.y - q.y) * Math.min(1, dt * 8); }
    }
    if (xp >= xpForLevel(level)) { xp -= xpForLevel(level); levelUp(); }

    // ── 인스턴스 행렬 ──
    const counts = [0, 0, 0];
    for (const q of zs) {
      dummy.position.set(q.x, q.y + Math.abs(Math.sin(q.ph)) * 0.12, q.z);
      dummy.rotation.set(0, Math.atan2(-(P.z - q.z), P.x - q.x), Math.sin(q.ph) * 0.1);
      dummy.scale.setScalar(q.hit > 0 ? 1.15 : 1);
      dummy.updateMatrix(); zMesh[q.type].setMatrixAt(counts[q.type]++, dummy.matrix);
    }
    dummy.scale.setScalar(1);
    for (const f of flyers) {
      dummy.position.set(f.x, f.y + 0.5, f.z); dummy.rotation.set(f.rot * 0.7, f.yaw, f.rot);
      dummy.updateMatrix(); zMesh[f.type].setMatrixAt(counts[f.type]++, dummy.matrix);
    }
    zMesh.forEach((m, i) => { m.count = counts[i]; m.instanceMatrix.needsUpdate = true; });
    dummy.rotation.set(0, 0, 0);
    bs.forEach((b, i) => { dummy.position.set(b.x, b.y, b.z); dummy.updateMatrix(); bMesh.setMatrixAt(i, dummy.matrix); });
    bMesh.count = bs.length; bMesh.instanceMatrix.needsUpdate = true;
    gems.forEach((q, i) => { dummy.position.set(q.x, q.y + 0.3 + Math.sin(q.ph) * 0.08, q.z); dummy.updateMatrix(); gMesh.setMatrixAt(i, dummy.matrix); });
    gMesh.count = gems.length; gMesh.instanceMatrix.needsUpdate = true;

    animateCapy(capy, t * (P.sprinting ? 1.6 : 1), moving && P.grounded, firing);

    // ── 카메라: 라이더 눈높이(1인칭) 또는 어깨 뒤(3인칭). 돌진하면 시야가 넓어진다 ──
    shake = Math.max(0, shake - dt);
    const bob = firstPerson && moving && P.grounded ? Math.sin(t * (P.sprinting ? 19 : 12)) * (P.sprinting ? 0.05 : 0.025) : 0;
    cam.position.set(eye.x + (Math.random() - 0.5) * shake, eye.y + bob + (Math.random() - 0.5) * shake, eye.z + (Math.random() - 0.5) * shake);
    v.copy(cam.position).add(fwd); cam.lookAt(v);
    const fov = (W < H ? 90 : 75) + (P.sprinting ? 9 : 0);
    if (Math.abs(cam.fov - fov) > 0.1) { cam.fov += (fov - cam.fov) * Math.min(1, dt * 8); cam.updateProjectionMatrix(); }
    sun.position.set(P.x + 6, 14, P.z + 7); sun.target.position.set(P.x, 0, P.z);

    // ── HUD ──
    if (P.hp < lastHp - 0.01) hurt = Math.min(1, hurt + (lastHp - P.hp) * 0.12);
    lastHp = P.hp; hurt = Math.max(0, hurt - dt * 1.5); $('hurt').style.opacity = hurt;
    $('hp-fill').style.width = Math.max(0, P.hp) / S.maxHp * 100 + '%';
    $('xp-fill').style.width = Math.min(1, xp / xpForLevel(level)) * 100 + '%';
    $('lv').textContent = 'Lv ' + level;
    $('st-fill').style.width = P.stamina * 100 + '%';
    $('kills').textContent = kills;
    $('time').textContent = Math.floor(time / 60) + ':' + String(Math.floor(time % 60)).padStart(2, '0');
    const slot = (id, wait) => { const el = $(id); el.style.setProperty('--wait', Math.max(0, Math.min(1, wait)) * 100 + '%'); el.classList.toggle('ready', wait <= 0); };
    slot('sk-q', rocketCd / S.rocketCd); slot('sk-e', stompCd / STOMP_CD); slot('sk-r', 1 - ult / ULT_KILLS);
    if (!firstPerson) {
      v.set(P.x, P.y + 2.9, P.z).project(cam);
      $('tag').style.transform = `translate(-50%,-100%) translate(${(v.x * 0.5 + 0.5) * W}px,${(-v.y * 0.5 + 0.5) * H}px)`;
    }

    if (P.hp <= 0) {
      over = true;
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      $('over-stats').textContent = `${profile.name}: ${map.name}에서 ${$('time').textContent} 동안 버티며 레벨 ${level}까지 올리고 좀비 ${kills}마리를 물리쳤어요.`;
      $('over').hidden = false; ['help', 'cross', 'resume', 'skills'].forEach(id => { $(id).hidden = true; });
    }
  }

  function resize(w, h) { W = w; H = h; cam.aspect = w / h; cam.updateProjectionMatrix(); aimVectors(); cam.position.copy(eye); v.copy(eye).add(fwd); cam.lookAt(v); }
  function dispose() {
    window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
    document.removeEventListener('mousemove', mm); document.removeEventListener('pointerlockchange', onLock);
    canvas.removeEventListener('pointerdown', md); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', mu); window.removeEventListener('pointercancel', mu);
    canvas.removeEventListener('contextmenu', noMenu);
    $('retry').removeEventListener('click', onRetry); $('back').removeEventListener('click', onBack);
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    ['hud', 'tag', 'help', 'over', 'levelup', 'xp', 'cross', 'resume', 'skills'].forEach(id => { $(id).hidden = true; });
    $('hurt').style.opacity = 0;
    zMesh.forEach(m => { m.geometry.dispose(); m.dispose(); }); bMesh.dispose(); gMesh.dispose(); propMesh.geometry.dispose();
  }
  // 개발용: 화면을 그리지 않고 n프레임을 빠르게 진행한다 (자동 조준·연사, 스킬은 찰 때마다 사용)
  function sim(n) {
    autoAim = true; fireHeld = true;
    for (let i = 0; i < n && !over; i++) { if (paused) choose(0); else { want.q = want.e = want.r = true; step(1 / 60, time); } }
    autoAim = false; fireHeld = false;
    return { level, levels, kills, hp: Math.round(P.hp), time: Math.round(time) };
  }
  return { update, resize, dispose, sim, grant: n => { xp += n; }, peek: () => { touchMode = true; $('resume').hidden = true; } };
}
