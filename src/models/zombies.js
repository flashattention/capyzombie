// 좀비 조립. +x를 바라본다. 맵별 좀비 정의는 maps.js에 있다.
import * as T from 'three';
import { add, ell, box, cyl, cone, eye, BL, WH } from '../kit.js';

const PI = Math.PI;

export function buildZombie(Z) {
  const g = new T.Group(), f = Z.fat || 1, skin = Z.skin, A = Z.acc;
  [1, -1].forEach(s => { add(g, cyl(0.1, 0.32, Z.pants), 0, 0.16, s * 0.13 * f); add(g, ell(0.13, 0.06, 0.11, 0x3b3030), 0.04, 0.05, s * 0.13 * f); });
  add(g, ell(0.25 * f, 0.3, 0.27 * f, Z.shirt), 0, 0.56, 0);
  [1, -1].forEach(s => {
    const a = new T.Group(); add(g, a, 0.05, 0.7, s * 0.27 * f);
    add(a, cyl(0.07, 0.4, Z.shirt, { axis: 'x' }), 0.2, 0, 0);
    add(a, ell(0.09, 0.09, 0.09, skin), 0.42, 0, 0);
    a.rotation.z = s > 0 ? -0.15 : 0.2;
  });
  const h = new T.Group(); add(g, h, 0.04, 1.08, 0); h.rotation.x = 0.1; h.rotation.z = -0.08;
  add(h, ell(0.36, 0.33, 0.36, Z.headCol || skin));
  if (A === 'pumpkin') {
    [1, -1].forEach(s => { const e = add(h, box(0.03, 0.1, 0.1, 0xffe45c, { flat: 1 }), 0.335, 0.03, s * 0.13); e.rotation.x = PI / 4; });
    add(h, box(0.03, 0.05, 0.26, 0xffe45c, { flat: 1 }), 0.32, -0.15, 0);
    add(h, cyl(0.05, 0.14, 0x4f8a3c), 0, 0.36, 0);
  } else {
    const e1 = eye('zed', 0.115); add(h, e1, 0.335, 0, 0.14); e1.rotation.y = PI / 2;
    const e2 = eye('zed', 0.07); add(h, e2, 0.345, -0.02, -0.15); e2.rotation.y = PI / 2;
    if (A !== 'gum') {
      const m = add(h, ell(0.12, 0.05, 0.03, BL, { flat: 1 }), 0.318, -0.17, 0); m.rotation.y = PI / 2;
      add(h, box(0.03, 0.05, 0.05, WH, { flat: 1 }), 0.33, -0.15, 0.05);
    }
  }
  if (Z.brain) add(h, ell(0.15, 0.09, 0.15, 0xff9db0), -0.05, 0.3, 0.08);
  if (A === 'straw') { add(h, cyl(0.5, 0.03, 0xe2b64f), 0, 0.2, 0); add(h, cyl(0.24, 0.17, 0xe2b64f), 0, 0.29, 0); add(h, cyl(0.245, 0.04, 0xc95f4a), 0, 0.24, 0); }
  if (A === 'tie') { add(g, box(0.03, 0.24, 0.08, 0xe03131), 0.25 * f, 0.56, 0); add(g, box(0.04, 0.06, 0.1, 0xe03131), 0.24 * f, 0.72, 0); }
  if (A === 'hardhat') { add(h, ell(0.37, 0.2, 0.37, 0xffc21f), 0, 0.2, 0); add(h, cyl(0.43, 0.03, 0xffc21f), 0.06, 0.16, 0); }
  if (A === 'cap') { add(h, ell(0.37, 0.18, 0.37, Z.capCol), 0, 0.2, 0); add(h, box(0.26, 0.03, 0.4, Z.capCol), 0.42, 0.17, 0); }
  if (A === 'bandage') {
    add(h, cyl(0.34, 0.05, 0xa89f84), 0, 0.2, 0); add(h, cyl(0.33, 0.05, 0xa89f84), 0, -0.24, 0);
    add(g, cyl(0.265 * f, 0.04, 0xa89f84), 0, 0.48, 0); add(g, cyl(0.25 * f, 0.04, 0xa89f84), 0, 0.66, 0);
    const st = add(g, box(0.05, 0.3, 0.04, 0xd9cfb0), -0.2, 0.5, 0.2); st.rotation.z = 0.3;
  }
  if (A === 'cowboy') { add(h, cyl(0.52, 0.03, 0x7a4a26), 0, 0.2, 0); add(h, cyl(0.23, 0.2, 0x7a4a26), 0, 0.31, 0); add(h, cyl(0.235, 0.04, 0xfcbf49), 0, 0.25, 0); }
  if (A === 'cactus') {
    add(h, ell(0.09, 0.06, 0.09, 0xff6fa5), 0.02, 0.36, 0);
    [[0.2, 0.2, 0.24], [-0.2, 0.1, 0.28], [0.1, 0.2, -0.28], [-0.25, 0.2, -0.15], [-0.34, -0.05, 0]].forEach(q => add(h, cone(0.03, 0.09, 0xf4f0d0), q[0], q[1], q[2]));
    [1, -1].forEach(s => { add(g, cyl(0.08, 0.3, skin), -0.02, 0.86, s * 0.34 * f); });
  }
  if (A === 'party') { const ph = add(h, cone(0.16, 0.36, 0xff8fab), -0.03, 0.46, 0); ph.rotation.z = 0.12; add(h, ell(0.05, 0.05, 0.05, 0xffffff), -0.07, 0.65, 0); }
  if (A === 'gum') add(h, ell(0.19, 0.19, 0.19, 0xff9ac2), 0.47, -0.14, 0);
  if (A === 'bunny') [1, -1].forEach(s => { const e = add(h, ell(0.06, 0.2, 0.04, 0xffb3c6), -0.02, 0.46, s * 0.13); e.rotation.x = s * 0.15; });
  if (A === 'antenna') [1, -1].forEach(s => { const t = add(h, cyl(0.02, 0.4, 0x3b3030), 0.1, 0.48, s * 0.12); t.rotation.z = -0.4; add(h, ell(0.06, 0.06, 0.06, Z.shirt), 0.19, 0.67, s * 0.12); });
  if (A === 'headband') { add(h, cyl(0.365, 0.07, 0xe03131), 0, 0.14, 0); const k = add(h, box(0.3, 0.06, 0.07, 0xe03131), -0.45, 0.1, 0.06); k.rotation.z = 0.4; }
  if (A === 'puff') { add(h, ell(0.5, 0.42, 0.5, Z.puffCol), -0.03, 0.42, 0); add(h, ell(0.26, 0.24, 0.26, Z.puffCol), 0.22, 0.6, 0.2); }
  if (A === 'hood') { add(h, ell(0.2, 0.5, 0.62, Z.hoodCol), -0.2, 0.06, 0); add(h, ell(0.1, 0.34, 0.44, 0xe8d98a), -0.14, 0.02, 0); }
  if (A === 'towel') { add(h, box(0.5, 0.12, 0.44, 0xffffff), -0.02, 0.36, 0); add(h, box(0.5, 0.05, 0.44, 0x8ecae6), -0.02, 0.4, 0); }
  if (A === 'beanie') { add(h, ell(0.37, 0.24, 0.37, Z.capCol), 0, 0.2, 0); add(h, cyl(0.37, 0.08, 0xffffff), 0, 0.14, 0); add(h, ell(0.09, 0.09, 0.09, 0xffffff), 0, 0.46, 0); }
  if (A === 'snow') { add(h, cone(0.06, 0.3, 0xf7931e, { axis: 'x' }), 0.46, -0.06, 0); add(h, cyl(0.26, 0.24, 0x3b5bdb), 0, 0.4, 0); add(h, cyl(0.34, 0.03, 0x3b5bdb), 0, 0.3, 0); [0.66, 0.5, 0.34].forEach(y => add(g, ell(0.05, 0.05, 0.05, 0x3b3030), 0.26 * f, y, 0)); }
  if (A === 'wings') [1, -1].forEach(s => { const w = add(g, box(0.06, 0.5, 0.7, 0x4a3a66), -0.15, 0.72, s * 0.6 * f); w.rotation.x = s * 0.5; add(h, cone(0.08, 0.2, 0x4a3a66), -0.02, 0.38, s * 0.2); });
  if (A === 'bolts') { [1, -1].forEach(s => add(h, cyl(0.06, 0.16, 0xa7b1b8, { axis: 'z' }), 0, -0.12, s * 0.4)); add(h, box(0.74, 0.12, 0.74, 0x2a2a35), 0, 0.3, 0); add(h, box(0.04, 0.03, 0.3, 0x3b3030, { flat: 1 }), 0.3, 0.2, 0.1); }
  if (A === 'witch') { add(h, cyl(0.54, 0.03, 0x2f2244), 0, 0.2, 0); const c = add(h, cone(0.26, 0.7, 0x2f2244), -0.04, 0.56, 0); c.rotation.z = 0.15; add(h, cyl(0.265, 0.06, 0xb6f09c), 0, 0.25, 0); }
  if (A === 'ears') [1, -1].forEach(s => { add(h, cone(0.12, 0.26, Z.earCol), -0.02, 0.36, s * 0.22); add(h, ell(0.18, 0.12, 0.2, Z.earCol), 0.26, -0.1, 0); });
  if (Z.spit) add(h, ell(0.05, 0.1, 0.16, 0x9dff7a, { flat: 1 }), 0.345, -0.18, 0); // 원거리 좀비: 초록 침이 고인 입
  if (Z.bomb) { // 폭탄 좀비: 등에 붉은 통과 불붙은 심지
    add(g, cyl(0.17, 0.42, 0xe03131), -0.27 * f, 0.6, 0); add(g, cyl(0.175, 0.06, 0xffd43b), -0.27 * f, 0.6, 0);
    add(g, cyl(0.02, 0.16, 0x3b3030), -0.27 * f, 0.88, 0); add(g, ell(0.06, 0.06, 0.06, 0xffe45c, { flat: 1 }), -0.27 * f, 0.98, 0);
  }
  g.scale.setScalar(Z.s || 1);
  return g;
}
