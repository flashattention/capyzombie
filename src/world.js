// 전장 만들기: 지면, 맵별 지형지물, 고지대, 점프대, 소품, 경계벽, 하늘과 원경, 날리는 입자.
// 충돌 상자(plats), 점프대(pads), 회복 탕(pools), 움직이는 구조물(anims)과 그려질 메시들을 돌려준다.
import * as T from 'three';
import { add, box, cyl, cone, ell, bake, bakedMat } from './kit.js';
import { pickProp } from './maps.js';

const TIER = 1.2;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

export function buildWorld(map, A) {
  const g = new T.Group(), plats = [], reserved = [], avoiders = [], pads = [], pools = [], anims = [], extra = [];

  // 충돌이 있는 상자. top 색을 주면 윗면에 얇은 판을 얹는다.
  function solid(cx, cz, w, d, h, col, top, base = 0) {
    plats.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2, base, top: base + h });
    add(g, box(w, h, d, col), cx, base + h / 2, cz);
    if (top != null) add(g, box(w + 0.2, 0.16, d + 0.2, top), cx, base + h - 0.04, cz);
  }
  const clear = (x, z, r) => Math.hypot(x, z) > 9 + r
    && !plats.some(b => x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r)
    && !reserved.some(c => Math.hypot(x - c[0], z - c[1]) < c[2] + r)
    && !avoiders.some(fn => fn(x, z, r));
  // 서로 겹치지 않는 자리 n곳을 찾아 fn(x,z)를 부른다. flat이면 충돌 없는 바닥 장식(밭, 연못)
  function spots(n, r, fn, flat) {
    for (let i = 0, tries = 0; i < n && tries < n * 40; tries++) {
      const x = rnd(-A + r + 3, A - r - 3), z = rnd(-A + r + 3, A - r - 3);
      if (!clear(x, z, r)) continue;
      reserved.push([x, z, flat ? r * 0.9 : r]); fn(x, z); i++;
    }
  }
  // 따로 도는 구조물(풍차 날개, 대관람차): 원점 기준으로 구워 제자리에 둔다
  function spinner(group, axis, speed) {
    const p = group.position.clone(); group.position.set(0, 0, 0);
    const m = new T.Mesh(bake(group), bakedMat); m.position.copy(p); m.castShadow = true;
    extra.push(m); anims.push({ m, axis, speed });
  }
  map.build({ g, A, solid, spots, spinner, avoid: fn => avoiders.push(fn), pool: (x, z, r) => pools.push({ x, z, r }) });

  // 고지대: 점프로 올라서는 1~3단 언덕
  for (let i = 0, tries = 0; i < 46 && tries < 700; tries++) {
    const w = rnd(5, 10), d = rnd(5, 10), cx = rnd(-A + 8, A - 8), cz = rnd(-A + 8, A - 8);
    if (!clear(cx, cz, Math.max(w, d) / 2 + 1)) continue;
    const side = pick(map.hill.side); i++;
    solid(cx, cz, w, d, TIER, side, map.hill.top);
    if (Math.random() < 0.5) {
      solid(cx + rnd(-0.5, 0.5), cz + rnd(-0.5, 0.5), w - 3, d - 3, TIER, side, map.hill.top, TIER);
      if (w > 7.5 && d > 7.5 && Math.random() < 0.4) solid(cx, cz, w - 6, d - 6, TIER, side, map.hill.top, TIER * 2);
    }
    reserved.push([cx, cz, Math.max(w, d) / 2]);
  }

  // 점프대: 밟으면 높이 튀어 오른다
  spots(18, 3, (x, z) => {
    pads.push({ x, z, r: 1.5 });
    add(g, cyl(1.6, 0.3, map.pad[0]), x, 0.15, z); add(g, cyl(1.25, 0.36, map.pad[1]), x, 0.18, z);
    for (let i = 0; i < 4; i++) add(g, cone(0.22, 0.4, 0xffffff, { flat: 1 }), x + Math.cos(i * 1.57) * 0.6, 0.5, z + Math.sin(i * 1.57) * 0.6);
  }, true);

  // 작은 소품: 절반은 무리 지어 놓아 빈 곳과 빽빽한 곳의 차이를 만든다
  const centers = Array.from({ length: 150 }, () => [rnd(-A, A), rnd(-A, A)]);
  for (let i = 0; i < 3200; i++) {
    let x, z;
    if (i % 2) { const c = pick(centers); x = c[0] + rnd(-6, 6); z = c[1] + rnd(-6, 6); } else { x = rnd(-A + 1, A - 1); z = rnd(-A + 1, A - 1); }
    if (Math.abs(x) > A - 1 || Math.abs(z) > A - 1 || Math.hypot(x, z) < 5) continue;
    if (clear(x, z, 1.2) || (Math.hypot(x, z) < 10 && !plats.some(b => x > b.x0 - 1 && x < b.x1 + 1 && z > b.z0 - 1 && z < b.z1 + 1) && Math.random() < 0.3)) pickProp(map, Math.random())(g, x, z);
  }

  // 경계벽과 기둥
  const wallTop = new T.Color(map.wall).offsetHSL(0, 0, -0.1).getHex();
  [[0, A + 1, A * 2 + 4, 2], [0, -A - 1, A * 2 + 4, 2], [A + 1, 0, 2, A * 2 + 4], [-A - 1, 0, 2, A * 2 + 4]].forEach(q => {
    add(g, box(q[2], 2.6, q[3], map.wall), q[0], 1.3, q[1]); add(g, box(q[2] + 0.3, 0.3, q[3] + 0.3, wallTop), q[0], 2.7, q[1]);
  });
  for (let k = -A; k <= A; k += 11) [[k, A + 1], [k, -A - 1], [A + 1, k], [-A - 1, k]].forEach(q => add(g, box(2.4, 4, 2.4, wallTop), q[0], 2, q[1]));

  const mesh = new T.Mesh(bake(g), bakedMat); mesh.castShadow = true; mesh.receiveShadow = true;

  // 지면: 정점마다 색을 달리해 얼룩덜룩한 땅을 만든다. 바깥은 단색 평면으로 지평선까지 잇는다.
  const seg = 110, gGeo = new T.PlaneGeometry(A * 2 + 60, A * 2 + 60, seg, seg); gGeo.rotateX(-Math.PI / 2);
  const gp = gGeo.attributes.position, gc = [], base = new T.Color(map.ground), lo = new T.Color(map.tones[0]), hi = new T.Color(map.tones[1]), c = new T.Color();
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i);
    const n = Math.sin(x * 0.11 + 1.3) * Math.cos(z * 0.13) + Math.sin((x + z) * 0.05) * 0.8 + Math.sin(x * 0.37 + 2) * Math.sin(z * 0.31) * 0.5 + (Math.random() - 0.5) * 0.5;
    c.copy(base).lerp(n > 0 ? hi : lo, Math.min(1, Math.abs(n) * 0.75)); gc.push(c.r, c.g, c.b);
  }
  gGeo.setAttribute('color', new T.Float32BufferAttribute(gc, 3));
  const ground = new T.Mesh(gGeo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); ground.receiveShadow = true;
  const outer = new T.Mesh(new T.PlaneGeometry(A * 2 + 700, A * 2 + 700), new T.MeshStandardMaterial({ color: map.ground, roughness: 1 }));
  outer.rotation.x = -Math.PI / 2; outer.position.y = -0.05;

  // 원경과 구름: 안개에 묻히지 않게 따로 그리고, 색은 지평선 쪽으로 섞어 멀어 보이게 한다
  const farG = new T.Group(), horizon = new T.Color(map.sky);
  const haze = (col, k) => new T.Color(col).lerp(horizon, k).getHex();
  for (let i = 0; i < 90; i++) {
    const a = i / 90 * Math.PI * 2 + rnd(-0.03, 0.03), r = A * 1.42 + rnd(25, 140), k = Math.min(0.75, 0.3 + (r - A * 1.42) / 280);
    const w = rnd(map.far.w[0], map.far.w[1]), h = rnd(map.far.h[0], map.far.h[1]), col = haze(pick(map.far.colors), k);
    if (map.far.kind === 'box') add(farG, box(w, h, w, col), Math.cos(a) * r, h / 2, Math.sin(a) * r);
    else add(farG, cone(w, h, col), Math.cos(a) * r, h / 2 - 0.5, Math.sin(a) * r);
  }
  const cloudCol = map.night ? 0x4a5088 : 0xffffff;
  for (let i = 0; i < 40; i++) {
    const x = rnd(-A * 2.4, A * 2.4), z = rnd(-A * 2.4, A * 2.4), y = rnd(40, 80), s = rnd(4, 10);
    [[0, 0, 1], [s * 0.9, -0.5, 0.7], [-s * 0.9, -0.4, 0.75], [s * 0.3, 0.9, 0.6]].forEach(q => add(farG, ell(s * q[2], s * 0.45 * q[2], s * 0.7 * q[2], cloudCol), x + q[0], y + q[1] * s * 0.4, z));
  }
  const farMat = new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, fog: false });
  const far = new T.Mesh(bake(farG), farMat);

  // 하늘 돔: 지평선 색에서 천정 색으로. 밤 맵은 별과 달을 더한다.
  const skyGeo = new T.SphereGeometry(390, 24, 12), pos = skyGeo.attributes.position, cols = [], top = new T.Color(map.skyTop);
  for (let i = 0; i < pos.count; i++) { const t = Math.max(0, Math.min(1, pos.getY(i) / 200)); c.copy(horizon).lerp(top, Math.pow(t, 0.7)); cols.push(c.r, c.g, c.b); }
  skyGeo.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
  const sky = new T.Mesh(skyGeo, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -1;
  if (map.night) {
    const sp = []; for (let i = 0; i < 500; i++) { const a = rnd(0, 6.28), e = rnd(0.12, 1.5), r = 370; sp.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r); }
    const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
    sky.add(new T.Points(sg, new T.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, fog: false })));
    const moon = new T.Mesh(new T.IcosahedronGeometry(26, 2), new T.MeshBasicMaterial({ color: 0xfff6d0, fog: false })); moon.position.set(220, 190, -200); sky.add(moon);
  }

  // 날리는 입자(꽃잎, 먼지, 모래, 색종이, 눈, 반딧불): 플레이어 주변 상자 안에서 되감긴다
  const air = map.air, airMesh = new T.InstancedMesh(new T.BoxGeometry(1, 1, 0.2), new T.MeshBasicMaterial({ transparent: !!air.glow, opacity: air.glow ? 0.9 : 1 }), air.n);
  airMesh.frustumCulled = false;
  const motes = Array.from({ length: air.n }, (_, i) => { airMesh.setColorAt(i, new T.Color(pick(air.colors))); return { x: rnd(0, 44), y: rnd(0, 16), z: rnd(0, 44), ph: rnd(0, 6), s: air.size * rnd(0.7, 1.5) }; });
  const dm = new T.Object3D();
  function updateAir(t, px, py, pz) {
    for (let i = 0; i < motes.length; i++) {
      const m = motes[i];
      const x = ((m.x + t * air.drift + Math.sin(t * 0.7 + m.ph) * 0.8) % 44 + 44) % 44 - 22;
      const y = ((m.y - t * air.fall) % 16 + 16) % 16;
      const z = ((m.z + Math.cos(t * 0.5 + m.ph) * 0.8) % 44 + 44) % 44 - 22;
      dm.position.set(px + x, Math.max(0.1, py - 2) + y, pz + z); dm.rotation.set(t * 1.3 + m.ph, t + m.ph, 0);
      dm.scale.setScalar(m.s * (air.glow ? 0.7 + Math.sin(t * 3 + m.ph) * 0.4 : 1)); dm.updateMatrix(); airMesh.setMatrixAt(i, dm.matrix);
    }
    airMesh.instanceMatrix.needsUpdate = true;
  }

  const meshes = [outer, ground, mesh, far, sky, airMesh, ...extra];
  return {
    plats, pads, pools, anims, meshes, sky, far, updateAir,
    dispose() { meshes.forEach(m => { m.geometry.dispose(); if (m.material !== bakedMat) m.material.dispose(); }); },
  };
}
