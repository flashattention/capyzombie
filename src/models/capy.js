// 카피바라 탈것: +x를 바라본다. userData.seat에 라이더를 앉힌다.
import * as T from 'three';
import { add, ell, box, cyl, cone, eye, BL } from '../kit.js';

const PI = Math.PI;
const C = { fur: 0xb9824f, furDark: 0x8f5e38, belly: 0xd9a873, nose: 0x5a3a28, saddle: 0x3f6b5c, trim: 0xf2c14e };
const W = { body: 0x56616b, metal: 0xa7b1b8, dark: 0x2f363c, accent: 0xd9523a, stripe: 0xfff1d6, tip: 0xfff1d6 };
const P = { legH: 0.36, bl: 1.05, bh: 0.6, bw: 0.64 };

function gatling() {
  const g = new T.Group();
  add(g, box(0.42, 0.24, 0.24, W.body), -0.1, 0, 0);
  add(g, box(0.16, 0.1, 0.3, W.dark), -0.1, 0, -0.2);
  const spin = new T.Group(); add(g, spin, 0.1, 0, 0);
  for (let i = 0; i < 6; i++) { const a = i * PI / 3; add(spin, cyl(0.032, 0.62, W.metal, { axis: 'x' }), 0.33, Math.cos(a) * 0.075, Math.sin(a) * 0.075); }
  add(spin, cyl(0.125, 0.05, W.dark, { axis: 'x' }), 0.2, 0, 0);
  add(spin, cyl(0.125, 0.05, W.dark, { axis: 'x' }), 0.6, 0, 0);
  add(g, cyl(0.15, 0.14, W.accent, { axis: 'z' }), -0.12, -0.2, 0);
  const muzzle = new T.Object3D(); add(g, muzzle, 0.78, 0, 0);
  g.userData = { spin, muzzle };
  return g;
}
function rocketPod() {
  const g = new T.Group();
  add(g, box(0.56, 0.34, 0.34, W.accent));
  add(g, box(0.08, 0.355, 0.355, W.stripe), -0.12, 0, 0);
  add(g, box(0.16, 0.1, 0.3, W.dark), -0.1, 0, 0.2);
  [-1, 1].forEach(y => [-1, 1].forEach(z => {
    add(g, cyl(0.065, 0.03, W.dark, { axis: 'x' }), 0.285, y * 0.085, z * 0.085);
    add(g, cone(0.05, 0.13, W.tip, { axis: 'x' }), 0.35, y * 0.085, z * 0.085);
  }));
  const muzzle = new T.Object3D(); add(g, muzzle, 0.4, 0, 0);
  g.userData = { muzzle };
  return g;
}

export function buildCapy() {
  const g = new T.Group(), p = P, by = p.legH + p.bh * 0.9;
  [-1, 1].forEach(sx => [-1, 1].forEach(sz => {
    add(g, cyl(0.14, p.legH + 0.2, C.furDark), sx * p.bl * 0.55, (p.legH + 0.2) / 2, sz * p.bw * 0.55);
    add(g, ell(0.16, 0.07, 0.17, C.nose), sx * p.bl * 0.55 + 0.04, 0.07, sz * p.bw * 0.55);
  }));
  const body = new T.Group(); add(g, body, 0, by, 0);
  add(body, ell(p.bl, p.bh, p.bw, C.fur));
  add(body, ell(p.bl * 0.8, p.bh * 0.6, p.bw * 0.85, C.belly), 0, -p.bh * 0.42, 0);

  // 머리: 뭉툭한 주둥이, 졸린 실눈, 머리 위 귤
  const h = new T.Group(); add(body, h, p.bl * 0.82, p.bh * 0.5, 0);
  add(h, ell(0.48, 0.42, 0.44, C.fur));
  add(h, ell(0.36, 0.32, 0.37, C.fur), 0.34, -0.07, 0);
  add(h, ell(0.1, 0.1, 0.2, C.nose), 0.62, 0.02, 0);
  add(h, box(0.03, 0.03, 0.14, BL, { flat: 1 }), 0.665, -0.2, 0);
  const ears = [1, -1].map(s => add(h, ell(0.07, 0.1, 0.09, C.furDark), -0.2, 0.38, s * 0.27));
  [1, -1].forEach(s => { const e = eye('sleepy', 0.06); add(h, e, 0.16, 0.17, s * 0.385); if (s < 0) e.rotation.y = PI; });
  add(h, ell(0.15, 0.13, 0.15, 0xf7931e), 0.02, 0.52, 0);
  const leaf = add(h, ell(0.07, 0.02, 0.04, 0x4f8a3c), 0.05, 0.66, 0); leaf.rotation.z = 0.4;

  // 안장과 무기
  const band = cyl(1, 0.8, C.saddle, { axis: 'x' }); band.scale.set(p.bh * 1.03, 0.8, p.bw * 1.04);
  add(body, band, -0.05, 0, 0);
  [-0.4, 0.3].forEach(x => { const tr = cyl(1, 0.08, C.trim, { axis: 'x' }); tr.scale.set(p.bh * 1.05, 0.08, p.bw * 1.06); add(body, tr, x, 0, 0); });
  add(body, ell(0.3, 0.09, 0.26, C.trim), -0.05, p.bh * 1.02, 0);
  const gat = gatling(); add(body, gat, 0.12, 0.12, p.bw + 0.2);
  const rk = rocketPod(); add(body, rk, 0.1, 0.12, -(p.bw + 0.2));
  const seat = new T.Group(); add(body, seat, -0.08, p.bh * 1.04, 0);

  g.userData = { body, by, head: h, ears, seat, spin: gat.userData.spin, gunMuzzle: gat.userData.muzzle, rocketMuzzle: rk.userData.muzzle };
  return g;
}

// 공통 대기/이동 애니메이션
export function animateCapy(capy, t, moving, firing) {
  const u = capy.userData;
  u.body.position.y = u.by + Math.sin(t * (moving ? 12 : 3)) * (moving ? 0.045 : 0.02);
  u.body.rotation.z = moving ? Math.sin(t * 12) * 0.03 : 0;
  u.ears.forEach((e, i) => { e.rotation.x = Math.max(0, Math.sin(t * 1.3 + i)) ** 8 * 0.5 * (i ? -1 : 1); });
  if (firing) u.spin.rotation.x = t * 22;
  u.seat.position.y = 0.6 * 1.04 + Math.abs(Math.sin(t * (moving ? 12 : 6))) * 0.03;
}
