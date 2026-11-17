// 프로토타입 전장: 이동·질주 들이받기·점프·고지대, 자동 사격 게틀링, 로켓, 몰려드는 좀비 떼
import * as T from 'three';
import { add, cyl, cone, box, addLights, setShadowArea, bake, bakedMat } from './kit.js';
import { buildCapy, animateCapy } from './models/capy.js';
import { buildRider } from './models/riders.js';
import { buildZombie } from './models/zombies.js';
import { getMap, pickProp } from './maps.js';
import { BASE_STATS, rollChoices, xpForLevel } from './upgrades.js';

const $ = id => document.getElementById(id);
const PI = Math.PI, MAX_Z = 400, MAX_B = 300, ARENA = 55;
const WALK = 5.2, SPRINT = 11, JUMP = 8.8, GRAV = 22, TIER = 1.2;

export function createGame(renderer, profile, onExit) {
  const map = getMap(profile.map), ZOMBIES = map.zombies;
  const scene = new T.Scene(); scene.background = new T.Color(map.sky); scene.fog = new T.Fog(map.sky, 30, 52);
  const cam = new T.PerspectiveCamera(40, 1, 0.1, 140);
  const sun = addLights(scene); setShadowArea(sun, 22);

  const ground = new T.Mesh(new T.PlaneGeometry(260, 260), new T.MeshStandardMaterial({ color: map.ground, roughness: 1 }));
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
  // 소품은 고지대와 함께 한 덩어리로 구워 드로우콜 1번
  for (let i = 0; i < 220; i++) {
    const x = (Math.random() * 2 - 1) * (ARENA + 8), z = (Math.random() * 2 - 1) * (ARENA + 8);
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

  // 플레이어
  const capy = buildCapy(); scene.add(capy);
  capy.userData.seat.add(buildRider(profile));
  const P = { x: 0, y: 0, z: 0, vy: 0, yaw: 0, hp: 100, stamina: 1, grounded: true, sprinting: false };

  // 좀비 떼: 종류마다 InstancedMesh 하나. 날아가는 좀비(flyers)도 같은 메시로 그린다.
  const zMesh = ZOMBIES.map(Z => {
    const m = new T.InstancedMesh(bake(buildZombie(Z)), bakedMat, MAX_Z + 80);
    m.count = 0; m.castShadow = true; m.frustumCulled = false; scene.add(m); return m;
  });
  const zs = [], flyers = [];
  const bMesh = new T.InstancedMesh(new T.IcosahedronGeometry(0.1, 0), new T.MeshBasicMaterial({ color: 0xffe066 }), MAX_B);
  bMesh.count = 0; bMesh.frustumCulled = false; scene.add(bMesh);
  const bs = [], rockets = [], booms = [];
  // 경험치 귤: 좀비가 떨어뜨리고, 가까이 가면 빨려온다
  const gMesh = new T.InstancedMesh(new T.IcosahedronGeometry(0.17, 0), new T.MeshStandardMaterial({ color: 0xf7931e, flatShading: true, roughness: 0.7 }), 400);
  gMesh.count = 0; gMesh.frustumCulled = false; scene.add(gMesh);
  const gems = [];
  const S = BASE_STATS(), levels = {};
  let level = 1, xp = 0, paused = false, choices = [];
  const boomGeo = new T.IcosahedronGeometry(1, 1);

  // 입력
  const keys = {}, joy = { x: 0, y: 0, o: null, id: null };
  let jumpQueued = false;
  const kd = e => { if (paused && /^Digit[123]$/.test(e.code)) { choose(+e.code[5] - 1); return; } if (e.code === 'Space') { jumpQueued = true; e.preventDefault(); } keys[e.code] = true; };
  const ku = e => { keys[e.code] = false; };
  const canvas = renderer.domElement;
  const pd = e => { if (joy.o) { jumpQueued = true; return; } joy.o = [e.clientX, e.clientY]; joy.id = e.pointerId; };
  const pm = e => { if (!joy.o || e.pointerId !== joy.id) return; const dx = e.clientX - joy.o[0], dy = e.clientY - joy.o[1], l = Math.hypot(dx, dy); if (l > 8) { joy.x = dx / Math.max(l, 60); joy.y = dy / Math.max(l, 60); } };
  const pu = e => { if (e.pointerId !== joy.id) return; joy.o = null; joy.x = joy.y = 0; };
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
  canvas.addEventListener('pointerdown', pd); window.addEventListener('pointermove', pm); window.addEventListener('pointerup', pu); window.addEventListener('pointercancel', pu);

  // HUD
  $('hud').hidden = false; $('xp').hidden = false; $('tag').hidden = false; $('help').hidden = false; $('over').hidden = true;
  $('hud-name').textContent = profile.name; $('tag').textContent = profile.name;
  const onRetry = () => onExit('retry'), onBack = () => onExit('select');
  $('retry').addEventListener('click', onRetry); $('back').addEventListener('click', onBack);

  let time = 0, kills = 0, spawnAcc = 2, gunCd = 0, rocketCd = 2, over = false, W = 1, H = 1, firing = false, shake = 0;
  const dummy = new T.Object3D(), v = new T.Vector3();

  function spawn() {
    const r = Math.random();
    const type = time > 20 && r < 0.1 ? 2 : r < 0.32 ? 1 : 0, Z = ZOMBIES[type];
    const a = Math.random() * PI * 2, d = 19 + Math.random() * 4;
    zs.push({ type, x: P.x + Math.cos(a) * d, y: 0, z: P.z + Math.sin(a) * d, hp: Z.hp, ph: Math.random() * 6, hit: 0, climb: 0, blocked: false });
  }
  // 처치. fx,fz가 있으면 그 방향으로 날려 보낸다.
  function kill(i, fx, fz, power = 0) {
    const q = zs[i];
    if (power && flyers.length < 80) flyers.push({ type: q.type, x: q.x, y: q.y, z: q.z, vx: fx * power, vy: 5 + Math.random() * 4, vz: fz * power, rot: 0, spin: 8 + Math.random() * 8, yaw: Math.random() * 6 });
    if (gems.length < 400) gems.push({ x: q.x, y: q.y, z: q.z, v: q.type === 2 ? 5 : 1, ph: Math.random() * 6 });
    zs[i] = zs[zs.length - 1]; zs.pop(); kills++;
  }
  function boom(x, y, z, color, size) {
    const m = new T.Mesh(boomGeo, new T.MeshBasicMaterial({ color, transparent: true }));
    m.position.set(x, y, z); scene.add(m); booms.push({ m, t: 0, size });
  }
  function blast(x, y, z, radius, dmg, color) {
    boom(x, y + 0.5, z, color, radius);
    for (let i = zs.length - 1; i >= 0; i--) {
      const q = zs[i], dx = q.x - x, dz = q.z - z, d = Math.hypot(dx, dz);
      if (d < radius && Math.abs(q.y - y) < 1.5) { q.hp -= dmg; q.hit = 0.12; if (q.hp <= 0) kill(i, dx / (d || 1), dz / (d || 1), 6); }
    }
  }

  function levelUp() {
    level++;
    choices = rollChoices(levels);
    if (!choices.length) { P.hp = Math.min(S.maxHp, P.hp + 20); return; } // 전부 최대면 체력만 회복
    paused = true;
    $('lv-title').textContent = `레벨 ${level}!`;
    const host = $('choices'); host.innerHTML = '';
    choices.forEach((u, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'choice'; b.id = 'choice-' + i;
      const lv = levels[u.id] || 0;
      b.innerHTML = `<span class="key">${i + 1}</span><span class="grp">${u.group}</span><b>${u.name}</b><span class="desc">${u.desc}</span><span class="pips">${'●'.repeat(lv)}<i>●</i>${'○'.repeat(u.max - lv - 1)}</span>`;
      b.onclick = () => choose(i);
      host.appendChild(b);
    });
    $('levelup').hidden = false; $('tag').hidden = true;
  }
  function choose(i) {
    const u = choices[i]; if (!paused || !u) return;
    levels[u.id] = (levels[u.id] || 0) + 1; u.apply(S, P);
    paused = false; choices = []; $('levelup').hidden = true; $('tag').hidden = false;
    if (xp >= xpForLevel(level)) { xp -= xpForLevel(level); levelUp(); }
  }

  function update(dt, t) {
    if (!over && !paused) step(dt, t);
    renderer.render(scene, cam);
  }

  function step(dt, t) {
    time += dt;
    // ── 이동과 질주 ──
    let mx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joy.x;
    let mz = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0) + joy.y;
    const ml = Math.hypot(mx, mz), moving = ml > 0.1;
    const wantSprint = (keys.ShiftLeft || keys.ShiftRight) && moving;
    if (wantSprint && (P.sprinting ? P.stamina > 0 : P.stamina > 0.2)) { P.sprinting = true; P.stamina = Math.max(0, P.stamina - dt * 0.33); }
    else { P.sprinting = false; P.stamina = Math.min(1, P.stamina + dt * S.stReg); }
    const speed = (P.sprinting ? SPRINT : WALK) * S.speed;
    if (moving) {
      const n = Math.max(1, ml); mx /= n; mz /= n;
      P.x = Math.max(-ARENA, Math.min(ARENA, P.x + mx * speed * dt));
      P.z = Math.max(-ARENA, Math.min(ARENA, P.z + mz * speed * dt));
      const want = Math.atan2(-mz, mx), d = ((want - P.yaw + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI;
      P.yaw += d * Math.min(1, dt * 10);
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
    capy.rotation.z = P.grounded ? 0 : Math.max(-0.35, Math.min(0.35, P.vy * 0.03));

    // ── 스폰 ──
    spawnAcc += dt * (1.5 + time / 12);
    while (spawnAcc >= 1) { spawnAcc -= 1; if (zs.length < MAX_Z) spawn(); }

    // ── 좀비 이동, 들이받기, 접촉 피해 ──
    let near = null, nd = 1e9;
    for (let i = zs.length - 1; i >= 0; i--) {
      const q = zs[i], Z = ZOMBIES[q.type], dx = P.x - q.x, dz = P.z - q.z, d = Math.hypot(dx, dz) || 1;
      const touching = d < Z.radius + 0.9 && Math.abs(P.y - q.y) < 1;
      if (touching && P.sprinting) {
        // 질주 중에는 치고 지나간다. 탱커는 한 번에 못 날린다.
        shake = Math.max(shake, 0.12);
        if (q.type === 2 && q.hp > S.ramDmg) { if (q.hit <= 0) { q.hp -= S.ramDmg; q.hit = 0.25; } q.x -= dx / d * 1.2; q.z -= dz / d * 1.2; P.stamina = Math.max(0, P.stamina - 0.08); }
        else { kill(i, -dx / d + mx * 0.6, -dz / d + mz * 0.6, 7); continue; }
      } else if (touching) P.hp -= Z.dps * dt;
      else { q.x += dx / d * Z.speed * dt; q.z += dz / d * Z.speed * dt; }
      const zg = collide(q, Z.radius);
      if (q.blocked) { q.climb += dt; if (q.climb > 1.2) q.y += 3 * dt; }
      else { q.climb = 0; q.y = q.y > zg ? Math.max(zg, q.y - 9 * dt) : zg; }
      q.ph += dt * Z.speed * 4; q.hit = Math.max(0, q.hit - dt);
      if (d < nd) { nd = d; near = q; }
    }
    for (let i = 0; i < zs.length; i++) for (let j = i + 1; j < zs.length; j++) {
      const a = zs[i], b = zs[j], dx = b.x - a.x, dz = b.z - a.z, rr = ZOMBIES[a.type].radius + ZOMBIES[b.type].radius, d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2), p = (rr - d) / d * 0.5; a.x -= dx * p; a.z -= dz * p; b.x += dx * p; b.z += dz * p; }
    }
    for (let i = flyers.length - 1; i >= 0; i--) {
      const f = flyers[i]; f.vy -= GRAV * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt; f.rot += f.spin * dt;
      if (f.y < -0.5) flyers.splice(i, 1);
    }

    // ── 게틀링 ──
    gunCd -= dt; firing = !!near && nd < 12;
    if (firing && gunCd <= 0 && bs.length < MAX_B) {
      gunCd = S.fireCd;
      capy.userData.gunMuzzle.getWorldPosition(v);
      const dx = near.x - v.x, dz = near.z - v.z, d = Math.hypot(dx, dz) || 1;
      for (let k = 0; k < S.shots; k++) {
        const sp = (Math.random() - 0.5) * 0.08 + (k - (S.shots - 1) / 2) * 0.16;
        bs.push({ x: v.x, y: v.y, z: v.z, vx: (dx / d - dz / d * sp) * 24, vz: (dz / d + dx / d * sp) * 24, vy: (near.y + 0.6 - v.y) / (d / 24), life: 0.6, pierce: S.pierce, last: null });
      }
    }
    for (let i = bs.length - 1; i >= 0; i--) {
      const b = bs[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.life -= dt;
      let dead = b.life <= 0;
      for (let j = zs.length - 1; j >= 0 && !dead; j--) {
        const q = zs[j], r = ZOMBIES[q.type].radius + 0.15;
        if (q !== b.last && (q.x - b.x) ** 2 + (q.z - b.z) ** 2 < r * r && Math.abs(b.y - q.y - 0.6) < 1.2) {
          q.hp -= S.dmg; q.hit = 0.1; b.last = q; if (b.pierce-- <= 0) dead = true;
          if (q.hp <= 0) { const l = Math.hypot(b.vx, b.vz); kill(j, b.vx / l, b.vz / l, 2.5); }
        }
      }
      if (dead) { bs[i] = bs[bs.length - 1]; bs.pop(); }
    }

    // ── 로켓 ──
    rocketCd -= dt;
    if (rocketCd <= 0) {
      const c = zs.filter(q => Math.hypot(q.x - P.x, q.z - P.z) < 13);
      if (c.length) {
        rocketCd = S.rocketCd;
        capy.userData.rocketMuzzle.getWorldPosition(v);
        for (let k = 0; k < S.rockets && c.length; k++) {
          const q = c.splice(Math.floor(Math.random() * c.length), 1)[0];
          const m = new T.Group(); add(m, cyl(0.08, 0.4, 0xfff1d6, { axis: 'x' })); add(m, cone(0.08, 0.16, 0xd9523a, { axis: 'x' }), 0.28, 0, 0);
          m.position.copy(v); scene.add(m);
          rockets.push({ m, tx: q.x, ty: q.y, tz: q.z });
        }
      }
    }
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i], p = r.m.position, dx = r.tx - p.x, dz = r.tz - p.z, d = Math.hypot(dx, dz);
      if (d < 0.4) { blast(r.tx, r.ty, r.tz, S.rocketR, 8, 0xffa94d); shake = Math.max(shake, 0.15); scene.remove(r.m); rockets.splice(i, 1); continue; }
      p.x += dx / d * 14 * dt; p.z += dz / d * 14 * dt; p.y += (r.ty + 0.6 - p.y) * Math.min(1, dt * 6); r.m.rotation.y = Math.atan2(-dz, dx);
    }
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

    // ── 카메라(질주하면 살짝 물러난다), 그림자 ──
    shake = Math.max(0, shake - dt);
    const back = P.sprinting ? 1.12 : 1, sx = (Math.random() - 0.5) * shake * 2, sz = (Math.random() - 0.5) * shake * 2;
    v.set(P.x + sx, P.y * 0.6 + 17 * back, P.z + 12.5 * back + sz);
    cam.position.lerp(v, Math.min(1, dt * 8)); cam.lookAt(cam.position.x - sx, cam.position.y - 16.5 * back, cam.position.z - 12.5 * back - sz);
    sun.position.set(P.x + 6, 14, P.z + 7); sun.target.position.set(P.x, 0, P.z);

    // ── HUD ──
    $('hp-fill').style.width = Math.max(0, P.hp) / S.maxHp * 100 + '%';
    $('xp-fill').style.width = Math.min(1, xp / xpForLevel(level)) * 100 + '%';
    $('lv').textContent = 'Lv ' + level;
    $('st-fill').style.width = P.stamina * 100 + '%';
    $('kills').textContent = kills;
    $('time').textContent = Math.floor(time / 60) + ':' + String(Math.floor(time % 60)).padStart(2, '0');
    v.set(P.x, P.y + 2.9, P.z).project(cam);
    $('tag').style.transform = `translate(-50%,-100%) translate(${(v.x * 0.5 + 0.5) * W}px,${(-v.y * 0.5 + 0.5) * H}px)`;

    if (P.hp <= 0) {
      over = true;
      $('over-stats').textContent = `${profile.name}: ${map.name}에서 ${$('time').textContent} 동안 버티며 레벨 ${level}까지 올리고 좀비 ${kills}마리를 물리쳤어요.`;
      $('over').hidden = false; $('help').hidden = true;
    }
  }

  function resize(w, h) { W = w; H = h; cam.aspect = w / h; cam.fov = w < h ? 55 : 40; cam.updateProjectionMatrix(); cam.position.set(P.x, 17, P.z + 12.5); }
  function dispose() {
    window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
    canvas.removeEventListener('pointerdown', pd); window.removeEventListener('pointermove', pm); window.removeEventListener('pointerup', pu); window.removeEventListener('pointercancel', pu);
    $('retry').removeEventListener('click', onRetry); $('back').removeEventListener('click', onBack);
    ['hud', 'tag', 'help', 'over', 'levelup', 'xp'].forEach(id => { $(id).hidden = true; });
    zMesh.forEach(m => { m.geometry.dispose(); m.dispose(); }); bMesh.dispose(); gMesh.dispose(); propMesh.geometry.dispose();
  }
  // 개발용: 화면을 그리지 않고 n프레임을 빠르게 진행한다
  function sim(n) { for (let i = 0; i < n && !over; i++) { if (paused) choose(0); else step(1 / 60, time); } return { level, levels, kills }; }
  return { update, resize, dispose, sim, grant: n => { xp += n; } };
}
