// 라이더(카피바라보다 작은 동물)와 악세사리. 모두 +x를 바라보고, 원점은 안장 위.
import * as T from 'three';
import { add, ell, box, cyl, cone, eye, BL } from '../kit.js';

const PI = Math.PI;

// hat: [dx, dy, scale], face: [dx, dy] — 동물마다 머리 모양이 달라 악세사리 위치를 보정한다
export const RIDERS = [
  { id: 'duck', label: '오리', body: 0xfdf6e3, hat: [0, 0, 1], face: [0, 0], def: { hat: 'helmet', face: 'none', neck: 'none' } },
  { id: 'frog', label: '개구리', body: 0x6cc24a, hat: [-0.07, 0.05, 0.8], face: [-0.05, 0.21], topEyes: true, def: { hat: 'headband', face: 'none', neck: 'none' } },
  { id: 'cat', label: '고양이', body: 0xf3a23c, hat: [0, 0, 1], face: [0, 0], def: { hat: 'none', face: 'goggles', neck: 'scarf' } },
  { id: 'dog', label: '강아지', body: 0xe8c9a0, hat: [0, 0, 1], face: [0, 0], def: { hat: 'none', face: 'none', neck: 'bell' } },
  { id: 'hamster', label: '햄스터', body: 0xf7c98b, hat: [0, 0, 1], face: [0, 0], def: { hat: 'hardhat', face: 'none', neck: 'none' } },
];

const RED = 0xd9523a, GOLD = 0xf2c14e;
const HATS = {
  helmet: g => add(g, ell(0.25, 0.15, 0.25, 0x5d7a3a), -0.01, 0.14, 0),
  straw: g => { add(g, cyl(0.36, 0.025, 0xe2b64f), 0, 0.15, 0); add(g, cyl(0.18, 0.13, 0xe2b64f), 0, 0.22, 0); add(g, cyl(0.185, 0.04, RED), 0, 0.18, 0); },
  crown: g => { add(g, cyl(0.13, 0.09, GOLD), 0, 0.25, 0); for (let i = 0; i < 5; i++) { const a = i * PI * 0.4; add(g, cone(0.035, 0.09, GOLD), Math.cos(a) * 0.1, 0.33, Math.sin(a) * 0.1); } },
  mandarin: g => { add(g, ell(0.12, 0.1, 0.12, 0xf7931e), 0, 0.28, 0); const l = add(g, ell(0.06, 0.018, 0.035, 0x4f8a3c), 0.03, 0.39, 0); l.rotation.z = 0.4; },
  party: g => { add(g, cone(0.11, 0.28, 0xff8fab), 0, 0.33, 0); add(g, ell(0.04, 0.04, 0.04, 0xffffff), 0, 0.48, 0); },
  hardhat: g => { add(g, ell(0.22, 0.13, 0.22, 0xffd43b), 0, 0.14, 0); add(g, cyl(0.26, 0.025, 0xffd43b), 0.03, 0.12, 0); },
  headband: g => { add(g, cyl(0.236, 0.05, RED), 0, 0.07, 0); const k = add(g, box(0.2, 0.04, 0.05, RED), -0.3, 0.05, 0.04); k.rotation.z = 0.35; },
};
const FIXED_HATS = new Set(['headband']); // 머리에 딱 맞아야 해서 동물별 보정을 적용하지 않는다
const FACES = {
  goggles: (g, strap) => { if (strap) add(g, cyl(0.236, 0.05, 0x3a2a22), 0, 0, 0); [1, -1].forEach(s => add(g, cyl(0.075, 0.06, 0x8fd3ff, { axis: 'x' }), 0.2, 0, s * 0.1)); },
  sunglasses: g => { [1, -1].forEach(s => add(g, box(0.04, 0.08, 0.13, BL), 0.225, 0, s * 0.1)); add(g, box(0.03, 0.02, 0.1, BL), 0.225, 0.02, 0); },
  eyepatch: (g, strap) => { add(g, box(0.04, 0.1, 0.11, BL), 0.225, 0, 0.1); if (strap) { const s = add(g, cyl(0.234, 0.02, BL), 0, 0.02, 0); s.rotation.x = 0.25; } },
};
const NECKS = {
  scarf: g => { add(g, ell(0.2, 0.06, 0.2, RED), 0, 0.37, 0); const t = add(g, box(0.24, 0.05, 0.08, RED), -0.24, 0.38, 0.05); t.rotation.z = -0.3; },
  bowtie: g => { [1, -1].forEach(s => add(g, box(0.04, 0.09, 0.09, RED), 0.17, 0.37, s * 0.065)); add(g, box(0.05, 0.05, 0.04, GOLD), 0.18, 0.37, 0); },
  bell: g => { add(g, cyl(0.2, 0.04, RED), 0, 0.37, 0); add(g, ell(0.045, 0.045, 0.045, GOLD), 0.19, 0.33, 0); },
};

export const ACCESSORIES = {
  hat: [['none', '없음'], ['helmet', '군용 헬멧'], ['straw', '밀짚모자'], ['crown', '왕관'], ['mandarin', '귤'], ['party', '파티모자'], ['hardhat', '안전모'], ['headband', '빨간 머리띠']],
  face: [['none', '없음'], ['goggles', '고글'], ['sunglasses', '선글라스'], ['eyepatch', '안대']],
  neck: [['none', '없음'], ['scarf', '스카프'], ['bowtie', '나비넥타이'], ['bell', '방울 목걸이']],
};

// cfg = { animal, hat, face, neck }
export function buildRider(cfg) {
  const R = RIDERS.find(r => r.id === cfg.animal) || RIDERS[0];
  const g = new T.Group(), t = R.id, c = R.body;
  add(g, ell(0.19, 0.2, 0.19, c), 0, 0.2, 0);
  const h = new T.Group(); add(g, h, 0.03, 0.52, 0);
  add(h, ell(0.23, 0.21, 0.23, c));
  if (!R.topEyes) [1, -1].forEach(s => { const e = eye('dot', 0.035); add(h, e, 0.215, 0, s * 0.1); e.rotation.y = PI / 2; });
  [1, -1].forEach(s => add(g, ell(0.065, 0.065, 0.065, c), 0.15, 0.24, s * 0.19));
  add(g, cyl(0.02, 0.5, 0x2f363c, { axis: 'z' }), 0.23, 0.22, 0);

  if (t === 'duck') {
    add(h, ell(0.1, 0.035, 0.09, 0xf59a23), 0.25, -0.05, 0);
    [1, -1].forEach(s => add(g, ell(0.1, 0.12, 0.04, c), -0.03, 0.22, s * 0.2));
    add(g, ell(0.08, 0.06, 0.08, c), -0.2, 0.3, 0);
  } else if (t === 'frog') {
    add(g, ell(0.15, 0.15, 0.15, 0xd8f0a8), 0.06, 0.18, 0);
    [1, -1].forEach(s => { add(h, ell(0.085, 0.085, 0.085, c), 0.08, 0.2, s * 0.12); const e = eye('dot', 0.04); add(h, e, 0.165, 0.21, s * 0.12); e.rotation.y = PI / 2; });
    add(h, box(0.02, 0.016, 0.24, BL, { flat: 1 }), 0.222, -0.05, 0);
  } else if (t === 'cat') {
    [1, -1].forEach(s => add(h, cone(0.07, 0.13, c), -0.02, 0.23, s * 0.16));
    add(h, ell(0.08, 0.06, 0.1, 0xfff3df), 0.19, -0.07, 0);
    add(h, ell(0.025, 0.02, 0.03, 0xff8fa3, { flat: 1 }), 0.265, -0.05, 0);
    const tail = add(g, cyl(0.035, 0.32, c), -0.22, 0.3, 0); tail.rotation.z = 0.5;
  } else if (t === 'dog') {
    add(g, ell(0.15, 0.15, 0.15, 0xfff3df), 0.06, 0.18, 0);
    add(h, ell(0.11, 0.08, 0.1, 0xfff3df), 0.2, -0.07, 0);
    add(h, ell(0.035, 0.03, 0.04, BL), 0.3, -0.03, 0);
    [1, -1].forEach(s => { const e = add(h, ell(0.05, 0.13, 0.08, 0x9a6a3c), -0.02, 0.04, s * 0.235); e.rotation.x = s * 0.2; });
    const tail = add(g, cyl(0.03, 0.2, c), -0.2, 0.32, 0); tail.rotation.z = 0.7;
  } else { // hamster
    add(g, ell(0.15, 0.15, 0.15, 0xfff3df), 0.06, 0.18, 0);
    [1, -1].forEach(s => { add(h, ell(0.07, 0.07, 0.03, 0xe9a868), -0.02, 0.2, s * 0.16); add(h, ell(0.1, 0.09, 0.1, 0xfff3df), 0.13, -0.08, s * 0.12); });
    add(h, ell(0.025, 0.02, 0.03, 0xff8fa3, { flat: 1 }), 0.245, -0.03, 0);
  }

  if (HATS[cfg.hat]) {
    const a = new T.Group(); HATS[cfg.hat](a);
    if (!FIXED_HATS.has(cfg.hat)) { a.position.set(R.hat[0], R.hat[1], 0); a.scale.setScalar(R.hat[2]); }
    h.add(a);
  }
  if (FACES[cfg.face]) { const a = new T.Group(); FACES[cfg.face](a, !R.topEyes); a.position.set(R.face[0], R.face[1], 0); h.add(a); }
  if (NECKS[cfg.neck]) { const a = new T.Group(); NECKS[cfg.neck](a); g.add(a); }
  return g;
}
