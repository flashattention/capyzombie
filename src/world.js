// 전장 만들기: 지면, 맵별 지형지물, 고지대, 소품, 경계벽, 하늘과 원경.
// 충돌 상자(plats)와 그려질 메시들을 돌려준다.
import * as T from 'three';
import { add, box, cyl, cone, ell, bake, bakedMat } from './kit.js';
import { pickProp } from './maps.js';

const TIER = 1.2;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

export function buildWorld(map, A) {
  const g = new T.Group(), plats = [], reserved = [], avoiders = [];

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
    for (let i = 0, tries = 0; i < n && tries < n * 30; tries++) {
      const x = rnd(-A + r + 3, A - r - 3), z = rnd(-A + r + 3, A - r - 3);
      if (!clear(x, z, r)) continue;
      reserved.push([x, z, flat ? r * 0.9 : r]); fn(x, z); i++;
    }
  }
  map.build({ g, A, solid, spots, avoid: fn => avoiders.push(fn) });

  // 고지대: 점프로 올라서는 1~3단 언덕
  for (let i = 0, tries = 0; i < 46 && tries < 600; tries++) {
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

  // 지면 얼룩: 평지의 단조로움을 줄인다
  const base = new T.Color(map.ground);
  for (let i = 0; i < 260; i++) {
    const x = rnd(-A, A), z = rnd(-A, A);
    if (avoiders.some(fn => fn(x, z, 2))) continue;
    const c = base.clone().offsetHSL(rnd(-0.015, 0.015), 0, rnd(-0.06, 0.05)).getHex();
    add(g, cyl(rnd(2, 7), 0.02, c), x, 0.006 + i * 0.00008, z);
  }

  // 작은 소품
  for (let i = 0; i < 1500; i++) {
    const x = rnd(-A + 1, A - 1), z = rnd(-A + 1, A - 1);
    if (clear(x, z, 1.2) || (Math.hypot(x, z) > 5 && Math.hypot(x, z) < 10 && Math.random() < 0.3)) pickProp(map, Math.random())(g, x, z);
  }

  // 경계벽
  const wallTop = new T.Color(map.wall).offsetHSL(0, 0, -0.1).getHex();
  [[0, A + 1, A * 2 + 4, 2], [0, -A - 1, A * 2 + 4, 2], [A + 1, 0, 2, A * 2 + 4], [-A - 1, 0, 2, A * 2 + 4]].forEach(q => {
    add(g, box(q[2], 2.6, q[3], map.wall), q[0], 1.3, q[1]); add(g, box(q[2] + 0.3, 0.3, q[3] + 0.3, wallTop), q[0], 2.7, q[1]);
  });

  const mesh = new T.Mesh(bake(g), bakedMat); mesh.castShadow = true; mesh.receiveShadow = true;

  const ground = new T.Mesh(new T.PlaneGeometry(A * 2 + 500, A * 2 + 500), new T.MeshStandardMaterial({ color: map.ground, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;

  // 원경과 구름: 안개에 묻히지 않게 따로 그리고, 색은 지평선 쪽으로 섞어 멀어 보이게 한다
  const farG = new T.Group(), horizon = new T.Color(map.sky);
  const haze = (c, k) => new T.Color(c).lerp(horizon, k).getHex();
  for (let i = 0; i < 70; i++) {
    const a = i / 70 * Math.PI * 2 + rnd(-0.03, 0.03), r = A * 1.42 + rnd(25, 120), k = Math.min(0.75, 0.35 + (r - A * 1.42) / 260);
    const w = rnd(map.far.w[0], map.far.w[1]), h = rnd(map.far.h[0], map.far.h[1]), c = haze(pick(map.far.colors), k);
    if (map.far.kind === 'box') add(farG, box(w, h, w, c), Math.cos(a) * r, h / 2, Math.sin(a) * r);
    else add(farG, cone(w, h, c), Math.cos(a) * r, h / 2 - 0.5, Math.sin(a) * r);
  }
  for (let i = 0; i < 34; i++) {
    const x = rnd(-A * 2.2, A * 2.2), z = rnd(-A * 2.2, A * 2.2), y = rnd(38, 70), s = rnd(4, 9);
    [[0, 0, 1], [s * 0.9, -0.5, 0.7], [-s * 0.9, -0.4, 0.75], [s * 0.3, 0.9, 0.6]].forEach(q => add(farG, ell(s * q[2], s * 0.45 * q[2], s * 0.7 * q[2], 0xffffff), x + q[0], y + q[1] * s * 0.4, z));
  }
  const farMat = new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, fog: false });
  const far = new T.Mesh(bake(farG), farMat);

  // 하늘 돔: 지평선 색에서 천정 색으로
  const skyGeo = new T.SphereGeometry(380, 24, 12), pos = skyGeo.attributes.position, cols = [], top = new T.Color(map.skyTop), c = new T.Color();
  for (let i = 0; i < pos.count; i++) { const t = Math.max(0, Math.min(1, pos.getY(i) / 200)); c.copy(horizon).lerp(top, Math.pow(t, 0.7)); cols.push(c.r, c.g, c.b); }
  skyGeo.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
  const sky = new T.Mesh(skyGeo, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -1;

  return { plats, mesh, ground, far, sky, dispose() { mesh.geometry.dispose(); far.geometry.dispose(); farMat.dispose(); skyGeo.dispose(); sky.material.dispose(); ground.geometry.dispose(); ground.material.dispose(); } };
}
