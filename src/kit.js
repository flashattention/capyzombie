// 스타일 A(포켓 디오라마) 조립 키트: 로우폴리 프리미티브 + 플랫 셰이딩 단색 머티리얼
import * as T from 'three';

const PI = Math.PI;
const G = {
  s: new T.IcosahedronGeometry(1, 1),
  b: new T.BoxGeometry(1, 1, 1),
  c: new T.CylinderGeometry(1, 1, 1, 8),
  k: new T.ConeGeometry(1, 1, 6),
};
const mats = new Map();
export function mat(c, flat) {
  const k = c + (flat ? 'f' : '');
  if (!mats.has(k)) {
    mats.set(k, flat
      ? new T.MeshBasicMaterial({ color: c })
      : new T.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.9 }));
  }
  return mats.get(k);
}
function fin(m, o) {
  if (!o.flat) { m.castShadow = true; m.receiveShadow = true; }
  if (o.axis === 'x') m.rotation.z = -PI / 2;
  if (o.axis === 'z') m.rotation.x = PI / 2;
  return m;
}
const mk = (g, c, o, sx, sy, sz) => { const m = new T.Mesh(g, mat(c, o.flat)); m.scale.set(sx, sy, sz); return fin(m, o); };
export const ell = (rx, ry, rz, c, o = {}) => mk(G.s, c, o, rx, ry, rz);
export const box = (w, h, d, c, o = {}) => mk(G.b, c, { flat: o.flat }, w, h, d);
export const cyl = (r, h, c, o = {}) => mk(G.c, c, o, r, h, r);
export const cone = (r, h, c, o = {}) => mk(G.k, c, o, r, h, r);
export const add = (p, m, x = 0, y = 0, z = 0) => { m.position.set(x, y, z); p.add(m); return m; };

export const BL = 0x1d1512, WH = 0xffffff;

// 눈: +z를 바라보는 방향으로 만들어 호출자가 돌려 붙인다
export function eye(type, r) {
  const g = new T.Group(), f = { flat: 1 };
  if (type === 'sleepy') add(g, box(r * 2.6, r * 0.6, r * 0.5, BL, f));
  else if (type === 'zed') { add(g, ell(r, r, r * 0.45, 0xfffbe6, f)); add(g, ell(r * 0.32, r * 0.32, r * 0.2, BL, f), r * 0.15, -r * 0.1, r * 0.4); }
  else { add(g, ell(r, r, r * 0.5, BL, f)); add(g, ell(r * 0.33, r * 0.33, r * 0.15, WH, f), r * 0.3, r * 0.35, r * 0.45); }
  return g;
}

export function addLights(scene, o = {}) {
  scene.add(new T.HemisphereLight(o.sky ?? 0xfff4dc, o.ground ?? 0x8a7a5a, o.hemi ?? 2.4));
  const sun = new T.DirectionalLight(o.sunColor ?? 0xffffff, o.sun ?? 3.0);
  sun.position.set(4, 9, 5); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0015; sun.shadow.normalBias = 0.03;
  scene.add(sun); scene.add(sun.target);
  return sun;
}
export function setShadowArea(sun, half) {
  const c = sun.shadow.camera;
  c.left = -half; c.right = half; c.top = half; c.bottom = -half; c.near = 1; c.far = 60;
  c.updateProjectionMatrix();
}

// 여러 메시로 조립한 모델을 정점 색을 가진 지오메트리 하나로 굽는다 (좀비 떼 인스턴싱용)
export const bakedMat = new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 });
export function bake(group) {
  group.updateMatrixWorld(true);
  const pos = [], col = [];
  group.traverse(m => {
    if (!m.isMesh) return;
    const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrixWorld);
    const p = g.attributes.position.array, c = m.material.color;
    for (let i = 0; i < p.length; i += 3) { pos.push(p[i], p[i + 1], p[i + 2]); col.push(c.r, c.g, c.b); }
    g.dispose();
  });
  const out = new T.BufferGeometry();
  out.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  out.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  out.computeVertexNormals();
  out.computeBoundingSphere();
  return out;
}
