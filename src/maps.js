// 전장 정의: 색, 조명, 하늘, 소품, 대형 지형지물, 보스, 그리고 맵마다 다른 좀비 6종
// 좀비 순서는 고정: 기본 / 러너 / 탱커 / 폭탄 / 원거리 / 도약
import * as T from 'three';
import { add, ell, box, cyl, cone } from './kit.js';

const PI = Math.PI;
const ROLE = {
  basic: { role: '기본', s: 1, hp: 5, speed: 1.95, radius: 0.42, dps: 11, xp: 1 },
  runner: { role: '러너', s: 0.7, hp: 3, speed: 3.5, radius: 0.3, dps: 9, xp: 1 },
  tank: { role: '탱커', s: 1.45, fat: 1.25, hp: 28, speed: 1.3, radius: 0.65, dps: 22, xp: 5, heavy: true },
  bomber: { role: '폭탄', s: 0.95, hp: 3, speed: 2.6, radius: 0.4, dps: 6, xp: 2, bomb: true },
  spitter: { role: '원거리', s: 1, hp: 5, speed: 1.7, radius: 0.42, dps: 6, xp: 2, spit: true },
  leaper: { role: '도약', s: 0.85, hp: 5, speed: 2.3, radius: 0.36, dps: 12, xp: 2, leap: true },
};
Object.assign(ROLE, {
  shield: { role: '방패', s: 1.1, hp: 8, speed: 1.6, radius: 0.45, dps: 11, xp: 3, shield: true },
  healer: { role: '치유', s: 1, hp: 6, speed: 1.6, radius: 0.42, dps: 6, xp: 4, heal: true },
  splitter: { role: '분열', s: 1.25, fat: 1.2, hp: 12, speed: 1.5, radius: 0.55, dps: 12, xp: 3, split: true },
  charger: { role: '돌격', s: 1.1, hp: 8, speed: 1.8, radius: 0.48, dps: 16, xp: 3, charge: true },
  mini: { role: '떼', s: 0.5, hp: 1.5, speed: 3.8, radius: 0.24, dps: 5, xp: 0.5, mini: true },
  toxic: { role: '맹독', s: 1, hp: 6, speed: 1.8, radius: 0.42, dps: 9, xp: 3, toxic: true },
});
const z = (name, role, look) => ({ name, ...ROLE[role], ...look });
// 전장의 기본 좀비 모습에 역할 장식을 얹어 만드는 6종. 손으로 만든 6종과 합쳐 전장마다 12종이 된다.
const EXTRA = [
  ['방패병', 'shield', { shirt: 0x8a949c }], ['주술사', 'healer', { shirt: 0xf1f3f5, pants: 0x5ab06a }], ['분열체', 'splitter', {}],
  ['돌격병', 'charger', { shirt: 0x9c2b2b }], ['떼거리', 'mini', {}], ['맹독 좀비', 'toxic', { skin: 0x9adf5a, shirt: 0x6a3fa0 }],
];
// 순서 고정: 0 기본, 1 러너, 2 탱커, 3 폭탄, 4 원거리, 5 도약, 6 방패, 7 치유, 8 분열, 9 돌격, 10 떼, 11 맹독
export function mapMobs(map) {
  if (!map._mobs) {
    const b = map.zombies[0];
    map._mobs = [...map.zombies, ...EXTRA.map(([n, role, look]) => z(`${map.tag} ${n}`, role, { skin: b.skin, shirt: b.shirt, pants: b.pants, acc: b.acc, capCol: b.capCol, ...look }))];
  }
  return map._mobs;
}
// 보스 3종: 1웨이브 근접형, 2웨이브 원거리형(거리를 두고 쏜다), 3웨이브 복합형
const bosses = (n1, a1, n2, n3) => [
  { name: n1, base: 2, scale: 2.6, abilities: a1 },
  { name: n2, base: 4, scale: 2.5, ranged: true, abilities: ['snipe', 'mortar', 'spiral'] },
  { name: n3, base: 5, scale: 3.1, abilities: ['spiral', 'slam', 'summon', 'mortar', 'volley'] },
];
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const F = { flat: 1 };

// ── 작은 소품: (부모, x, z)에 놓는다 ──
const tuft = c => (g, x, zz) => { const s = rnd(0.7, 1.5); add(g, cone(0.14 * s, 0.3 * s, c), x, 0.15 * s, zz); add(g, cone(0.1 * s, 0.22 * s, c), x + 0.16, 0.11 * s, zz + 0.1); };
const rock = c => (g, x, zz) => { const s = rnd(0.7, 1.9); const m = add(g, box(0.5 * s, 0.3 * s, 0.4 * s, c), x, 0.15 * s, zz); m.rotation.y = rnd(0, 3); };
const hay = (g, x, zz) => add(g, cyl(0.38, 0.6, 0xe2b64f, { axis: 'z' }), x, 0.38, zz);
const tree = (g, x, zz) => { const s = rnd(0.9, 1.9); add(g, cyl(0.12 * s, 0.9 * s, 0x7a5a3c), x, 0.45 * s, zz); add(g, ell(0.7 * s, 0.6 * s, 0.7 * s, 0x4f8a3c), x, 1.25 * s, zz); add(g, ell(0.45 * s, 0.4 * s, 0.45 * s, 0x5f9e3f), x + 0.3 * s, 1.7 * s, zz); add(g, ell(0.1, 0.1, 0.1, 0xf7931e), x + 0.45 * s, 1.2 * s, zz + 0.45 * s); add(g, ell(0.1, 0.1, 0.1, 0xf7931e), x - 0.2 * s, 1.5 * s, zz + 0.5 * s); };
const flower = c => (g, x, zz) => { add(g, cyl(0.02, 0.3, 0x4f8a3c), x, 0.15, zz); add(g, ell(0.09, 0.05, 0.09, c), x, 0.32, zz); };
const scarecrow = (g, x, zz) => { add(g, cyl(0.05, 1.8, 0x7a5a3c), x, 0.9, zz); add(g, box(1.3, 0.08, 0.08, 0x7a5a3c), x, 1.3, zz); add(g, ell(0.24, 0.24, 0.24, 0xe2b64f), x, 1.85, zz); add(g, cyl(0.38, 0.03, 0x9a7447), x, 2.02, zz); add(g, box(0.5, 0.6, 0.2, 0xc95f4a), x, 1.1, zz); };
const trafficCone = (g, x, zz) => { add(g, cyl(0.2, 0.05, 0xff6b1a), x, 0.03, zz); add(g, cone(0.15, 0.42, 0xff6b1a), x, 0.25, zz); };
const lamp = (g, x, zz) => { add(g, cyl(0.06, 3.4, 0x2a2f3a), x, 1.7, zz); add(g, box(0.7, 0.06, 0.06, 0x2a2f3a), x + 0.3, 3.4, zz); add(g, ell(0.2, 0.2, 0.2, 0xfff3a0, F), x + 0.62, 3.3, zz); };
const mailbox = (g, x, zz) => { add(g, box(0.5, 0.7, 0.4, 0x3b5bdb), x, 0.35, zz); add(g, box(0.52, 0.08, 0.42, 0x8fd3ff), x, 0.74, zz); };
const hydrant = (g, x, zz) => { add(g, cyl(0.13, 0.45, 0xe03131), x, 0.22, zz); add(g, ell(0.15, 0.1, 0.15, 0xe03131), x, 0.47, zz); };
const trash = (g, x, zz) => { add(g, cyl(0.25, 0.6, 0x495057), x, 0.3, zz); add(g, cyl(0.28, 0.06, 0x343a40), x, 0.62, zz); };
const bench = (g, x, zz) => { add(g, box(1.4, 0.08, 0.4, 0x9a7447), x, 0.45, zz); add(g, box(1.4, 0.4, 0.06, 0x9a7447), x, 0.7, zz - 0.2); [-0.55, 0.55].forEach(o => add(g, box(0.08, 0.45, 0.36, 0x2a2f3a), x + o, 0.22, zz)); };
const vending = (g, x, zz) => { add(g, box(0.9, 1.8, 0.7, pick([0xe03131, 0x3b5bdb, 0x20c997])), x, 0.9, zz); add(g, box(0.7, 0.9, 0.04, 0xbff3ff, F), x, 1.2, zz + 0.36); };
const cactus = (g, x, zz) => { const s = rnd(0.8, 1.8); add(g, cyl(0.17 * s, 1.4 * s, 0x4f9d57), x, 0.7 * s, zz); add(g, cyl(0.1 * s, 0.4 * s, 0x4f9d57, { axis: 'x' }), x + 0.3 * s, 0.8 * s, zz); add(g, cyl(0.1 * s, 0.5 * s, 0x4f9d57), x + 0.5 * s, 1.0 * s, zz); add(g, cyl(0.1 * s, 0.35 * s, 0x4f9d57, { axis: 'x' }), x - 0.28 * s, 0.55 * s, zz); add(g, cyl(0.1 * s, 0.4 * s, 0x4f9d57), x - 0.45 * s, 0.72 * s, zz); add(g, ell(0.08, 0.06, 0.08, 0xff6fa5), x, 1.42 * s, zz); };
const pillar = (g, x, zz) => { const h = rnd(1, 2.8); add(g, cyl(0.3, h, 0xd9c08a), x, h / 2, zz); add(g, box(0.8, 0.2, 0.8, 0xc9ae76), x, h + 0.1, zz); add(g, box(0.8, 0.14, 0.8, 0xc9ae76), x, 0.07, zz); };
const bones = (g, x, zz) => { const m = add(g, cyl(0.04, 0.6, 0xf4f0d0, { axis: 'x' }), x, 0.05, zz); m.rotation.y = rnd(0, 3); add(g, ell(0.14, 0.12, 0.12, 0xf4f0d0), x + 0.4, 0.1, zz + 0.2); };
const pot = (g, x, zz) => { add(g, cyl(0.26, 0.5, 0xc0703a), x, 0.25, zz); add(g, cyl(0.2, 0.12, 0xa85a2a), x, 0.56, zz); };
const gumdrop = c => (g, x, zz) => { const s = rnd(0.7, 1.6); add(g, ell(0.28 * s, 0.3 * s, 0.28 * s, c), x, 0.05, zz); };
const lollipop = c => (g, x, zz) => { const h = rnd(1.2, 2.6); add(g, cyl(0.05, h, 0xffffff), x, h / 2, zz); add(g, cyl(0.36, 0.12, c, { axis: 'z' }), x, h + 0.3, zz); add(g, cyl(0.2, 0.14, 0xffffff, { axis: 'z' }), x, h + 0.3, zz); };
const cupcake = (g, x, zz) => { add(g, cyl(0.3, 0.35, 0xc98a6b), x, 0.18, zz); add(g, ell(0.36, 0.26, 0.36, pick([0xff8fab, 0x9be3c9, 0xffffff])), x, 0.5, zz); add(g, ell(0.08, 0.08, 0.08, 0xe03131), x, 0.78, zz); };
const donut = (g, x, zz) => { for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2; add(g, ell(0.22, 0.2, 0.22, i % 2 ? 0xff8fab : 0xd9a05b), x + Math.cos(a) * 0.5, 0.22, zz + Math.sin(a) * 0.5); } };
const pine = (g, x, zz) => { const s = rnd(0.9, 2); add(g, cyl(0.12 * s, 0.6 * s, 0x6b4a2f), x, 0.3 * s, zz); [[0.8, 0.9, 0.9], [0.62, 0.8, 1.5], [0.42, 0.7, 2.05]].forEach((q, i) => { add(g, cone(q[0] * s, q[1] * s, 0x3f7a55), x, q[2] * s, zz); add(g, cone(q[0] * s * 0.72, q[1] * s * 0.5, 0xffffff), x, (q[2] + 0.24) * s, zz); }); };
const snowman = (g, x, zz) => { add(g, ell(0.38, 0.36, 0.38, 0xffffff), x, 0.34, zz); add(g, ell(0.27, 0.26, 0.27, 0xffffff), x, 0.86, zz); add(g, cone(0.05, 0.2, 0xf7931e, { axis: 'x' }), x + 0.3, 0.88, zz); add(g, cyl(0.18, 0.16, 0x3b5bdb), x, 1.14, zz); };
const stoneLantern = (g, x, zz) => { add(g, cyl(0.12, 0.8, 0x8a949c), x, 0.4, zz); add(g, box(0.5, 0.36, 0.5, 0x8a949c), x, 0.98, zz); add(g, box(0.3, 0.2, 0.52, 0xffd88a, F), x, 0.98, zz); add(g, cone(0.46, 0.3, 0x6f7880), x, 1.3, zz); add(g, ell(0.3, 0.1, 0.3, 0xffffff), x, 1.44, zz); };
const bucket = (g, x, zz) => { add(g, cyl(0.22, 0.34, 0xc9a06a), x, 0.17, zz); add(g, cyl(0.24, 0.04, 0x6b4a2f), x, 0.3, zz); };
const tomb = (g, x, zz) => { const h = rnd(0.7, 1.2), m = add(g, box(0.6, h, 0.16, 0x8a8f9c), x, h / 2, zz); m.rotation.z = rnd(-0.12, 0.12); add(g, cyl(0.3, 0.16, 0x8a8f9c, { axis: 'z' }), x, h, zz); add(g, box(0.8, 0.1, 0.5, 0x5f6470), x, 0.05, zz); };
const cross = (g, x, zz) => { add(g, box(0.14, 1.3, 0.14, 0x9aa0ad), x, 0.65, zz); add(g, box(0.7, 0.14, 0.14, 0x9aa0ad), x, 0.95, zz); };
const deadTree = (g, x, zz) => { const s = rnd(1, 2.2); add(g, cyl(0.14 * s, 1.8 * s, 0x3a2f33), x, 0.9 * s, zz); [[0.5, 1.5, 0.7], [-0.45, 1.8, -0.8], [0.2, 2.1, 0.4]].forEach(q => { const b = add(g, box(0.9 * s, 0.09 * s, 0.09 * s, 0x3a2f33), x + q[0] * s * 0.6, q[1] * s, zz); b.rotation.z = q[2]; }); };
const jackLantern = (g, x, zz) => { add(g, ell(0.3, 0.26, 0.3, 0xe8862e), x, 0.24, zz); add(g, box(0.3, 0.08, 0.04, 0xffe45c, F), x, 0.26, zz + 0.29); add(g, cyl(0.04, 0.1, 0x4f8a3c), x, 0.52, zz); };
const graveLamp = (g, x, zz) => { add(g, cyl(0.05, 2.2, 0x23252f), x, 1.1, zz); add(g, box(0.3, 0.4, 0.3, 0xb6f09c, F), x, 2.3, zz); add(g, cone(0.26, 0.2, 0x23252f), x, 2.6, zz); };

export const MAPS = [
  { id: 'farm', name: '유자 농장', blurb: '귤나무와 헛간, 풍차 사이로 농부들이 일어납니다.',
    ground: 0x8fbf5a, tones: [0x7fae4c, 0x9cc866], soil: 0x7a5a3c, sky: 0xcfe8dc, skyTop: 0x7ec3e6, bg: ['#bfe3e0', '#f6e9c9'],
    light: { sky: 0xfff4dc, ground: 0x8a7a5a, hemi: 2.4, sun: 3.0, sunColor: 0xfff2d8, fog: [50, 160] },
    air: { colors: [0xffffff, 0xffc9d9, 0xc9e88a], n: 140, fall: 0.8, drift: 0.9, size: 0.07 },
    hill: { side: [0x7a5a3c, 0x8a6a45], top: 0x7fb04e }, pad: [0xe2b64f, 0xc95f4a], wall: 0x9a7447, far: { kind: 'cone', colors: [0x6fa64a, 0x5f9e3f, 0x86b85a], h: [10, 28], w: [18, 40] },
    props: [[0.38, tuft(0x5f9e3f)], [0.08, hay], [0.2, tree], [0.1, rock(0x9a8f80)], [0.09, flower(0xffe066)], [0.09, flower(0xff8fab)], [0.03, scarecrow], [0.03, flower(0xffffff)]],
    tag: '농장', bosses: bosses('호박 대왕', ['summon', 'volley'], '허수아비 포수', '메뚜기 여왕'),
    zombies: [
      z('농부 좀비', 'basic', { skin: 0x8fb86a, shirt: 0xc95f4a, pants: 0x4f6a8f, acc: 'straw' }),
      z('꼬마 좀비', 'runner', { skin: 0xa9cf7a, shirt: 0xf2c14e, pants: 0x7a5a3c, brain: 1 }),
      z('호박머리', 'tank', { skin: 0x8fb86a, headCol: 0xe8862e, shirt: 0x6b5a45, pants: 0x4a3d30, acc: 'pumpkin' }),
      z('농약통 좀비', 'bomber', { skin: 0xb8c26a, shirt: 0x5d7a3a, pants: 0x4a3d30 }),
      z('침 뱉는 허수아비', 'spitter', { skin: 0xe2c98a, shirt: 0x7a5a3c, pants: 0x4f6a8f, acc: 'straw' }),
      z('메뚜기 좀비', 'leaper', { skin: 0x9bd35a, shirt: 0x6aa84f, pants: 0x4f8a3c, acc: 'antenna' }),
    ],
    build({ g, A, solid, spots, spinner }) {
      spots(5, 14, (x, zz) => { // 헛간과 사일로
        solid(x, zz, 9, 7, 5, 0xb5443a);
        [-1, 1].forEach(s => { const r = add(g, box(9.6, 0.4, 4.6, 0x7a2e27), x, 5.9, zz + s * 1.75); r.rotation.x = s * 0.6; });
        add(g, box(2.4, 3, 0.2, 0xfff1d6), x, 1.5, zz + 3.55); add(g, box(9.1, 0.3, 7.1, 0xfff1d6), x, 4.9, zz);
        [-3, 3].forEach(o => add(g, box(1.2, 1.2, 0.1, 0xfff1d6), x + o, 3.2, zz + 3.55));
        solid(x + 7.5, zz, 3.2, 3.2, 7, 0xcfd4d8); add(g, cone(2.1, 1.8, 0x9aa5ad), x + 7.5, 7.9, zz);
        for (let i = 0; i < 3; i++) solid(x - 7 + (i % 2) * 1.6, zz + 2 + i * 1.3, 1.5, 1.2, 1.2, 0xe2b64f, 0xd1a23f); // 건초 더미
      });
      spots(4, 9, (x, zz) => { // 풍차 (날개가 돈다)
        solid(x, zz, 2.6, 2.6, 8, 0xf2e6d0); add(g, cone(2.1, 1.8, 0xb5443a), x, 8.9, zz);
        const blades = new T.Group(); blades.position.set(x, 7.4, zz + 1.5);
        [0, PI / 2].forEach(a => { const b = add(blades, box(0.6, 11, 0.12, 0xfff8ea)); b.rotation.z = a; });
        add(blades, cyl(0.3, 0.5, 0x7a5a3c, { axis: 'z' }), 0, 0, -0.1); spinner(blades, 'z', 0.7);
      });
      spots(10, 9, (x, zz) => { // 밭고랑
        add(g, box(10, 0.05, 13, 0x8a6a45), x, 0.025, zz);
        const c = pick([0x6aa84f, 0xe8862e, 0xc9d94a]);
        for (let i = 0; i < 6; i++) for (let j = 0; j < 10; j++) add(g, cone(0.24, 0.5, c), x + i * 1.6 - 4, 0.28, zz + j * 1.25 - 5.6);
      }, true);
      spots(6, 10, (x, zz) => { // 귤 과수원
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) tree(g, x + i * 5 - 5, zz + j * 5 - 5);
      }, true);
      spots(5, 8, (x, zz) => { add(g, cyl(5.2, 0.03, 0x7a9a4a), x, 0.015, zz); add(g, cyl(4.6, 0.05, 0x6ec3d9), x, 0.03, zz); [[4.8, 0], [-3.5, 3.6], [1, -5]].forEach(q => add(g, ell(0.5, 0.35, 0.5, 0x9a8f80), x + q[0], 0.2, zz + q[1])); add(g, ell(0.3, 0.18, 0.2, 0xfdf6e3), x + 1, 0.2, zz + 0.5); add(g, ell(0.3, 0.18, 0.2, 0xfdf6e3), x - 1.2, 0.2, zz - 1); }, true);
      spots(6, 5, (x, zz) => { // 트랙터: 올라설 수 있다
        solid(x, zz, 3.2, 1.8, 1.2, 0xd9523a); add(g, box(1.3, 1.1, 1.6, 0xd9523a), x - 0.8, 1.75, zz); add(g, box(1.2, 0.7, 1.5, 0xbff3ff, F), x - 0.8, 1.85, zz);
        [-1, 1].forEach(s => { add(g, cyl(0.8, 0.4, 0x2f363c, { axis: 'z' }), x - 0.8, 0.8, zz + s * 1.05); add(g, cyl(0.5, 0.35, 0x2f363c, { axis: 'z' }), x + 1.1, 0.5, zz + s * 1.0); });
      });
      spots(16, 6, (x, zz) => { // 울타리
        const rot = Math.random() < 0.5;
        for (let i = 0; i < 6; i++) add(g, box(0.14, 0.9, 0.14, 0x9a7447), x + (rot ? 0 : i * 1.6 - 4), 0.45, zz + (rot ? i * 1.6 - 4 : 0));
        [0.72, 0.4].forEach(h => add(g, rot ? box(0.08, 0.1, 8.2, 0x9a7447) : box(8.2, 0.1, 0.08, 0x9a7447), x, h, zz));
      });
    } },
  { id: 'city', name: '네온 도심', blurb: '퇴근하지 못한 회사원들이 빌딩 숲 사이 차선을 넘어옵니다.',
    ground: 0x5a5e78, tones: [0x51556e, 0x636782], soil: 0x3a3c55, sky: 0xf2b8c0, skyTop: 0x3a3470, bg: ['#34306b', '#ff9aa2'],
    light: { sky: 0xffc9d6, ground: 0x4a4770, hemi: 2.0, sun: 2.6, sunColor: 0xffb48a, fog: [45, 150] },
    air: { colors: [0xff8fd0, 0x7df9ff, 0xffe066], n: 110, fall: -0.25, drift: 0.3, size: 0.06, glow: true },
    hill: { side: [0xd9523a, 0x3b5bdb, 0xff922b, 0x20c997], top: 0x2f3348 }, pad: [0x495057, 0x7df9ff], wall: 0x2e3048, far: { kind: 'box', colors: [0x4a4770, 0x5a5488, 0x3d3a66], h: [22, 75], w: [10, 22] },
    props: [[0.2, trafficCone], [0.14, lamp], [0.12, mailbox], [0.14, hydrant], [0.16, trash], [0.1, rock(0x777b93)], [0.08, bench], [0.06, vending]],
    tag: '도심', bosses: bosses('현장 소장', ['slam', 'mortar'], '바리스타 저격수', '파쿠르 두목'),
    zombies: [
      z('회사원 좀비', 'basic', { skin: 0x7ee081, shirt: 0xf1f3f5, pants: 0x364fc7, acc: 'tie', brain: 1 }),
      z('배달 러너', 'runner', { skin: 0x9af09c, shirt: 0x20c997, pants: 0x343a40, acc: 'cap', capCol: 0xff4d4d }),
      z('공사장 반장', 'tank', { skin: 0x69c96c, shirt: 0xff922b, pants: 0x495057, acc: 'hardhat' }),
      z('가스통 좀비', 'bomber', { skin: 0x8fe0a0, shirt: 0x868e96, pants: 0x343a40 }),
      z('커피 뿜는 좀비', 'spitter', { skin: 0x86d98a, shirt: 0x7a4a26, pants: 0x212529, acc: 'cap', capCol: 0x3f6b5c }),
      z('파쿠르 좀비', 'leaper', { skin: 0x9af09c, shirt: 0x212529, pants: 0xe03131, acc: 'headband' }),
    ],
    build({ g, A, solid, spots, avoid }) {
      const roads = [-A * 0.6, -A * 0.2, A * 0.2, A * 0.6]; // 도로망
      avoid((x, zz, r) => roads.some(c => Math.abs(x - c) < 4.2 + r || Math.abs(zz - c) < 4.2 + r));
      roads.forEach(c => {
        add(g, box(A * 2, 0.04, 8, 0x3a3c4e), 0, 0.02, c); add(g, box(8, 0.04, A * 2, 0x3a3c4e), c, 0.021, 0);
        [-4.5, 4.5].forEach(o => { add(g, box(A * 2, 0.1, 1, 0x8a8fa8), 0, 0.05, c + o); add(g, box(1, 0.1, A * 2, 0x8a8fa8), c + o, 0.051, 0); }); // 인도
        for (let i = -A + 3; i < A; i += 6) { add(g, box(2.4, 0.02, 0.2, 0xffd43b), i, 0.05, c); add(g, box(0.2, 0.02, 2.4, 0xffd43b), c, 0.05, i); }
        roads.forEach(d => { for (let k = -3; k <= 3; k++) add(g, box(0.5, 0.02, 2.2, 0xf1f3f5), c + k * 1, 0.055, d + 5.6); }); // 횡단보도
      });
      const cols = [0x8d93b8, 0xa7a0c9, 0x7f86a8, 0xb9a5b5, 0x6f7696, 0x9aa8c4], neon = [0xff4d8d, 0x4dd4ff, 0xffe066, 0x9dff7a];
      spots(38, 11, (x, zz) => { // 빌딩: 창문과 네온 간판, 옥상 설비
        const w = rnd(8, 14), d = rnd(8, 14), h = rnd(8, 30), c = pick(cols);
        solid(x, zz, w, d, h, c, 0x4a4e68);
        for (let fy = 2; fy < h - 1; fy += 3) for (let k = -1; k <= 1; k++) {
          const wc = () => (Math.random() < 0.6 ? 0xfff3a0 : 0x3a3c55);
          if (Math.random() < 0.6) add(g, box(1.3, 1.5, 0.08, wc(), F), x + k * w * 0.3, fy, zz + d / 2 + 0.03);
          if (Math.random() < 0.6) add(g, box(1.3, 1.5, 0.08, wc(), F), x + k * w * 0.3, fy, zz - d / 2 - 0.03);
          if (Math.random() < 0.6) add(g, box(0.08, 1.5, 1.3, wc(), F), x + w / 2 + 0.03, fy, zz + k * d * 0.3);
          if (Math.random() < 0.6) add(g, box(0.08, 1.5, 1.3, wc(), F), x - w / 2 - 0.03, fy, zz + k * d * 0.3);
        }
        add(g, box(w * 0.6, 1.1, 0.14, pick(neon), F), x, 4.4, zz + d / 2 + 0.1);
        add(g, box(0.14, 3.4, 1.1, pick(neon), F), x + w / 2 + 0.1, Math.min(h - 2.5, 7), zz - d * 0.25);
        add(g, box(w * 0.7, 0.3, 0.3, pick(neon), F), x, 3.2, zz - d / 2 - 0.2);
        add(g, box(2, 1.2, 2, 0x6a6e86), x - w * 0.2, h + 0.6, zz); add(g, cyl(0.05, 3, 0x2a2f3a), x + w * 0.3, h + 1.5, zz + d * 0.3); add(g, ell(0.14, 0.14, 0.14, 0xff4d4d, F), x + w * 0.3, h + 3, zz + d * 0.3);
        add(g, box(w + 0.6, 0.2, 2.2, 0x3a3c55), x, 3, zz + d / 2 + 1); // 차양
      });
      spots(7, 12, (x, zz) => { // 작은 공원과 분수
        add(g, box(20, 0.06, 20, 0x5f9e5f), x, 0.03, zz);
        add(g, cyl(3, 0.5, 0x8a8fa8), x, 0.25, zz); add(g, cyl(2.6, 0.52, 0x6ec3d9), x, 0.27, zz); add(g, cyl(0.3, 1.6, 0x8a8fa8), x, 0.8, zz); add(g, ell(0.7, 0.3, 0.7, 0xbff3ff), x, 1.7, zz);
        [[7, 7], [-7, 7], [7, -7], [-7, -7], [0, 8], [8, 0]].forEach(q => { add(g, cyl(0.16, 1.2, 0x6b4a2f), x + q[0], 0.6, zz + q[1]); add(g, ell(1.1, 1, 1.1, 0x4f9a5a), x + q[0], 1.9, zz + q[1]); });
        [[4.5, 0], [-4.5, 0]].forEach(q => bench(g, x + q[0], zz + q[1]));
      }, true);
      for (let i = 0; i < 70; i++) { // 도로 위 자동차와 버스: 자동차 지붕에 올라설 수 있다
        const c = pick(roads), along = rnd(-A + 6, A - 6), horiz = Math.random() < 0.5, off = pick([-2, 2]);
        const x = horiz ? along : c + off, zz = horiz ? c + off : along;
        if (Math.hypot(x, zz) < 9 || roads.some(r => Math.abs((horiz ? x : zz) - r) < 7)) continue;
        const bus = Math.random() < 0.15, L = bus ? 8 : 3.8, H = bus ? 2.4 : 1.2;
        const col = bus ? 0xffc21f : pick([0xe03131, 0x3b5bdb, 0xffd43b, 0xf1f3f5, 0x20c997, 0x212529, 0xff8fab]);
        solid(x, zz, horiz ? L : 1.9, horiz ? 1.9 : L, H, col);
        if (bus) add(g, horiz ? box(L * 0.9, 0.8, 1.95, 0xbff3ff, F) : box(1.95, 0.8, L * 0.9, 0xbff3ff, F), x, 1.6, zz);
        else add(g, horiz ? box(2, 0.7, 1.7, 0x2a2f3a) : box(1.7, 0.7, 2, 0x2a2f3a), x, 1.5, zz);
        [-1, 1].forEach(a => [-1, 1].forEach(b => add(g, cyl(0.36, 0.3, 0x212529, { axis: horiz ? 'z' : 'x' }), x + (horiz ? a * L * 0.32 : b * 0.95), 0.36, zz + (horiz ? b * 0.95 : a * L * 0.32))));
        [-1, 1].forEach(b => add(g, box(0.1, 0.2, 0.3, 0xfff3a0, F), x + (horiz ? L / 2 : b * 0.6), 0.75, zz + (horiz ? b * 0.6 : L / 2)));
      }
      spots(8, 5, (x, zz) => { // 광고탑
        solid(x, zz, 0.8, 0.8, 7, 0x2a2f3a); add(g, box(6, 3, 0.3, pick(neon), F), x, 8, zz); add(g, box(6.4, 3.4, 0.2, 0x2a2f3a), x, 8, zz - 0.1);
      });
    } },
  { id: 'desert', name: '사막 유적', blurb: '계단식 피라미드와 무너진 기둥 아래에서 붕대 감은 것들이 깨어납니다.',
    ground: 0xe3c27a, tones: [0xd6b268, 0xedd08c], soil: 0xb8904f, sky: 0xf6e3b4, skyTop: 0x5fb6f0, bg: ['#8fd0ff', '#ffe9a8'],
    light: { sky: 0xfff6dc, ground: 0xc9a06a, hemi: 2.5, sun: 3.5, sunColor: 0xfff0c8, fog: [55, 170] },
    air: { colors: [0xf2dca0, 0xe3c27a], n: 150, fall: 0.15, drift: 3.2, size: 0.05 },
    hill: { side: [0xc98a4b, 0xb8904f], top: 0xdba15e }, pad: [0xb8904f, 0x4fc3d9], wall: 0xc9ae76, far: { kind: 'cone', colors: [0xdfb96e, 0xd1a55c, 0xc98a4b], h: [8, 22], w: [24, 55] },
    props: [[0.3, rock(0xb8904f)], [0.2, cactus], [0.14, pillar], [0.18, tuft(0xb9a25a)], [0.1, bones], [0.08, pot]],
    tag: '사막', bosses: bosses('선인장 군주', ['volley', 'snipe'], '코브라 파라오', '전갈 왕'),
    zombies: [
      z('미라 좀비', 'basic', { skin: 0xd9cfb0, shirt: 0xd9cfb0, pants: 0xc4b998, acc: 'bandage' }),
      z('카우보이 좀비', 'runner', { skin: 0x86b86b, shirt: 0x9c4f2e, pants: 0x3d5a80, acc: 'cowboy' }),
      z('선인장 좀비', 'tank', { skin: 0x4f9d57, shirt: 0x4f9d57, pants: 0x3d7d45, acc: 'cactus' }),
      z('다이너마이트 좀비', 'bomber', { skin: 0xa8c080, shirt: 0x7a4a26, pants: 0x3d5a80 }),
      z('코브라 좀비', 'spitter', { skin: 0x9bbf4a, shirt: 0x6b8a2e, pants: 0x4f6a2a, acc: 'hood', hoodCol: 0x6b8a2e }),
      z('전갈 좀비', 'leaper', { skin: 0xc98a4b, shirt: 0x8a552b, pants: 0x6b4a2f, acc: 'antenna' }),
    ],
    build({ g, A, solid, spots }) {
      spots(5, 17, (x, zz) => { // 계단식 피라미드: 한 단씩 점프해 꼭대기까지 오른다
        for (let k = 0; k < 6; k++) { const s = 26 - k * 4.4; solid(x, zz, s, s, 1.2, k % 2 ? 0xd9b46a : 0xcfa558, 0xe3c27a, k * 1.2); }
        add(g, cone(1.6, 1.8, 0xf2c14e), x, 8.1, zz);
        add(g, box(2.6, 3, 0.4, 0x6b4a2f), x, 1.5, zz + 13.1); // 입구
      });
      spots(4, 10, (x, zz) => { // 사자 석상
        solid(x, zz, 9, 4, 2.4, 0xd9b46a, 0xe3c27a); solid(x + 3, zz, 3, 3, 2.6, 0xcfa558, 0xe3c27a, 2.4);
        add(g, box(3.4, 1.2, 4.4, 0xd9b46a), x + 5.6, 0.6, zz); add(g, box(1.4, 1.6, 2.2, 0xe3c27a), x + 4.6, 3.6, zz); add(g, box(0.5, 0.3, 0.5, 0x3a2a1c, F), x + 5.32, 4, zz + 0.5); add(g, box(0.5, 0.3, 0.5, 0x3a2a1c, F), x + 5.32, 4, zz - 0.5);
      });
      spots(10, 7, (x, zz) => { // 돌 아치
        const rot = Math.random() < 0.5;
        [-1, 1].forEach(s => solid(x + (rot ? 0 : s * 3.4), zz + (rot ? s * 3.4 : 0), 1.8, 1.8, 5.2, 0xc9ae76));
        add(g, rot ? box(2.2, 1.4, 9.4, 0xd9c08a) : box(9.4, 1.4, 2.2, 0xd9c08a), x, 5.9, zz);
      });
      spots(6, 9, (x, zz) => { // 오아시스
        add(g, cyl(6, 0.03, 0x9fbf6a), x, 0.015, zz); add(g, cyl(4.4, 0.05, 0x4fc3d9), x, 0.03, zz);
        for (let i = 0; i < 6; i++) {
          const a = i * 1.05 + rnd(0, 0.4), px = x + Math.cos(a) * 5.2, pz = zz + Math.sin(a) * 5.2, h = rnd(3, 5);
          const t = add(g, cyl(0.2, h, 0x9a7447), px, h / 2, pz); t.rotation.z = rnd(-0.15, 0.15);
          for (let k = 0; k < 6; k++) { const l = add(g, ell(1.5, 0.1, 0.45, 0x3d9d57), px + Math.cos(k * 1.05) * 1.1, h + 0.1, pz + Math.sin(k * 1.05) * 1.1); l.rotation.y = -k * 1.05; l.rotation.z = -0.35; }
        }
      }, true);
      spots(6, 8, (x, zz) => { // 대상 야영지: 천막과 모닥불
        [[-3, 0, 0xd9523a], [3, 1, 0x3b5bdb], [0, -3.5, 0xf2c14e]].forEach(q => { add(g, cone(2, 2.4, q[2]), x + q[0], 1.2, zz + q[1]); add(g, cone(2.05, 0.5, 0xfff1d6), x + q[0], 2.3, zz + q[1]); });
        add(g, cyl(0.6, 0.12, 0x6b4a2f), x, 0.06, zz); add(g, cone(0.3, 0.7, 0xff922b, F), x, 0.45, zz); add(g, cone(0.16, 0.45, 0xffe066, F), x, 0.4, zz);
        [[1.6, 1.8], [-1.4, 2]].forEach(q => pot(g, x + q[0], zz + q[1]));
      }, true);
      spots(14, 8, (x, zz) => { const w = rnd(5, 10), d = rnd(5, 10), h = rnd(3.5, 7); solid(x, zz, w, d, h, 0xc98a4b, 0xdba15e); solid(x + w * 0.3, zz + d * 0.3, w * 0.55, d * 0.55, 1.2, 0xb8904f, 0xdba15e); }); // 바위산
      spots(8, 4, (x, zz) => { solid(x, zz, 1.2, 1.2, 8, 0xd9c08a); add(g, cone(0.9, 1.4, 0xf2c14e), x, 8.7, zz); }); // 오벨리스크
      spots(10, 6, (x, zz) => { for (let i = 0; i < 5; i++) { const h = i === 2 ? 1.2 : rnd(2.5, 5.5); add(g, cyl(0.45, h, 0xd9c08a), x + i * 2.4 - 4.8, h / 2, zz); add(g, box(1.2, 0.3, 1.2, 0xc9ae76), x + i * 2.4 - 4.8, h + 0.15, zz); } });
    } },
  { id: 'candy', name: '캔디 놀이공원', blurb: '케이크 탑과 대관람차 사이로 사탕 색 좀비들이 풍선껌을 불며 다가옵니다.',
    ground: 0xffbfd0, tones: [0xffb0c6, 0xffd0dc], soil: 0xe08aa6, sky: 0xffe3ec, skyTop: 0x9fd8ff, bg: ['#ffe3ec', '#cdeaff'],
    light: { sky: 0xffffff, ground: 0xffc9d9, hemi: 2.6, sun: 2.6, sunColor: 0xfff0f5, fog: [55, 170] },
    air: { colors: [0xff8fab, 0xffe066, 0x8ecae6, 0x9be3c9, 0xc9b6f2], n: 170, fall: 1.0, drift: 0.6, size: 0.08 },
    hill: { side: [0xf7b2c4, 0xc98a6b, 0x9be3c9, 0xffe066], top: 0xfff1d6 }, pad: [0x9be3c9, 0xff8fab], wall: 0xffffff, far: { kind: 'cone', colors: [0xffc9d9, 0xc9b6f2, 0x9be3c9, 0xffe9a8], h: [12, 34], w: [14, 34] },
    props: [[0.18, gumdrop(0xc9b6f2)], [0.14, gumdrop(0x9be3c9)], [0.14, gumdrop(0xffe066)], [0.14, lollipop(0xff8fab)], [0.14, lollipop(0x8ecae6)], [0.14, cupcake], [0.12, donut]],
    tag: '캔디', bosses: bosses('풍선껌 여왕', ['bombs', 'spiral'], '솜사탕 마법사', '젤리 대마왕'),
    zombies: [
      z('파티모자 좀비', 'basic', { skin: 0xa8e6cf, shirt: 0xffe066, pants: 0x8ecae6, acc: 'party' }),
      z('토끼 머리띠', 'runner', { skin: 0xb8f0dc, shirt: 0xffffff, pants: 0xffb3c6, acc: 'bunny' }),
      z('풍선껌 뚱보', 'tank', { skin: 0xc9b6f2, shirt: 0xff8fab, pants: 0x9d8ad6, acc: 'gum', fat: 1.35 }),
      z('팝핑캔디 좀비', 'bomber', { skin: 0xffd6a5, shirt: 0xff8fab, pants: 0x8ecae6 }),
      z('솜사탕 좀비', 'spitter', { skin: 0xbfe8ff, shirt: 0xffffff, pants: 0xffb3c6, acc: 'puff', puffCol: 0xff9ac2 }),
      z('젤리 좀비', 'leaper', { skin: 0x7fe0b0, shirt: 0x5ad19a, pants: 0x3fb983, acc: 'antenna' }),
    ],
    build({ g, A, solid, spots, avoid, spinner }) {
      const river = -A * 0.35; // 초콜릿 강과 비스킷 다리
      avoid((x, zz, r) => Math.abs(zz - river) < 5 + r);
      add(g, box(A * 2, 0.05, 9, 0x8a5a3c), 0, 0.025, river); add(g, box(A * 2, 0.04, 10.4, 0xfff1d6), 0, 0.02, river);
      for (let x = -A + 20; x < A; x += 40) solid(x, river, 6, 10.5, 1.2, 0xd9a05b, 0xfff1d6);
      spots(8, 12, (x, zz) => { // 3단 케이크 탑
        const cs = pick([[0xf7b2c4, 0xfff1d6, 0xc98a6b], [0x9be3c9, 0xffffff, 0xff8fab], [0xc9b6f2, 0xfff1d6, 0xffe066]]);
        [16, 10.5, 5.5].forEach((s, k) => {
          solid(x, zz, s, s, 1.2, cs[k], 0xffffff, k * 1.2);
          for (let i = 0; i < 4; i++) add(g, ell(0.5, 0.5, 0.5, 0xffffff), x + (i % 2 ? 1 : -1) * s / 2, k * 1.2 + 1.1, zz + (i < 2 ? 1 : -1) * s / 2);
          for (let i = -1; i <= 1; i++) add(g, ell(0.4, 0.6, 0.2, 0xffffff), x + i * s * 0.3, k * 1.2 + 0.9, zz + s / 2 + 0.05); // 흘러내린 크림
        });
        add(g, ell(0.7, 0.7, 0.7, 0xe03131), x, 4.2, zz); add(g, cyl(0.04, 0.8, 0x4f8a3c), x, 5.1, zz);
        for (let i = 0; i < 4; i++) { add(g, cyl(0.06, 0.9, pick([0xff8fab, 0x8ecae6, 0xffe066])), x + (i % 2 ? 1.6 : -1.6), 4.05, zz + (i < 2 ? 1.6 : -1.6)); add(g, cone(0.08, 0.2, 0xffa94d, F), x + (i % 2 ? 1.6 : -1.6), 4.6, zz + (i < 2 ? 1.6 : -1.6)); } // 초
      });
      spots(4, 13, (x, zz) => { // 대관람차 (돈다)
        solid(x, zz, 10, 3, 1.2, 0x9d8ad6, 0xffffff);
        [-1, 1].forEach(s => { const l = add(g, box(0.5, 11.5, 0.5, 0xffffff), x + s * 3, 6, zz); l.rotation.z = s * 0.3; });
        const wheel = new T.Group(); wheel.position.set(x, 11, zz);
        for (let i = 0; i < 16; i++) {
          const a = i / 16 * PI * 2, seg = add(wheel, box(3.6, 0.3, 0.3, 0xff8fab), Math.cos(a) * 8.6, Math.sin(a) * 8.6, 0); seg.rotation.z = a + PI / 2;
          if (i % 2 === 0) { const sp = add(wheel, box(8.6, 0.14, 0.14, 0xffffff), Math.cos(a) * 4.3, Math.sin(a) * 4.3, 0); sp.rotation.z = a; add(wheel, box(1.4, 1.3, 1.4, pick([0xffe066, 0x9be3c9, 0x8ecae6, 0xc9b6f2])), Math.cos(a) * 8.6, Math.sin(a) * 8.6, 0); }
        }
        add(wheel, cyl(0.7, 0.8, 0xffe066, { axis: 'z' })); spinner(wheel, 'z', 0.18);
      });
      spots(5, 9, (x, zz) => { // 회전목마 (돈다)
        solid(x, zz, 9, 9, 0.6, 0xffe066, 0xff8fab);
        const top = new T.Group(); top.position.set(x, 0, zz);
        add(top, cone(5.2, 2.2, 0xff8fab), 0, 5.6, 0); add(top, cyl(5.2, 0.4, 0xffffff), 0, 4.4, 0); add(top, cyl(0.4, 4.4, 0xffffff), 0, 2.4, 0); add(top, ell(0.4, 0.4, 0.4, 0xffe066), 0, 6.9, 0);
        for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2, px = Math.cos(a) * 3.4, pz = Math.sin(a) * 3.4; add(top, cyl(0.06, 3.8, 0xffe066), px, 2.5, pz); add(top, ell(0.7, 0.4, 0.3, pick([0xffffff, 0xc9b6f2, 0x9be3c9])), px, 1.7 + (i % 2) * 0.5, pz); add(top, ell(0.24, 0.26, 0.2, 0xffffff), px + 0.6, 2.1 + (i % 2) * 0.5, pz); }
        spinner(top, 'y', 0.5);
      });
      spots(16, 5, (x, zz) => { // 지팡이 사탕
        solid(x, zz, 0.9, 0.9, 6, 0xffffff);
        for (let k = 0; k < 5; k++) add(g, box(0.95, 0.5, 0.95, 0xe03131), x, 0.6 + k * 1.2, zz);
        add(g, box(2.2, 0.8, 0.9, 0xffffff), x + 0.7, 6.3, zz); add(g, box(0.9, 1.4, 0.9, 0xe03131), x + 1.5, 5.6, zz);
      });
      spots(10, 6, (x, zz) => { // 거대 아이스크림
        solid(x, zz, 2.4, 2.4, 3.4, 0xd9a05b);
        add(g, ell(2, 1.7, 2, pick([0xff8fab, 0x9be3c9, 0xfff1d6])), x, 4.4, zz); add(g, ell(1.5, 1.3, 1.5, pick([0xc9b6f2, 0xffe066, 0xc98a6b])), x, 6.2, zz);
        add(g, ell(0.4, 0.4, 0.4, 0xe03131), x, 7.6, zz);
      });
      spots(8, 7, (x, zz) => { // 도넛 아치
        for (let i = 0; i <= 10; i++) { const a = i / 10 * PI; add(g, ell(0.9, 0.9, 0.7, i % 2 ? 0xff8fab : 0xd9a05b), x + Math.cos(a) * 4, 0.4 + Math.sin(a) * 4, zz); }
        [-4, 4].forEach(o => solid(x + o, zz, 1.4, 1.2, 1.2, 0xd9a05b));
      });
    } },
  { id: 'onsen', name: '눈꽃 온천', blurb: '김 오르는 탕에 몸을 담그면 체력이 돌아옵니다. 눈사람들이 그걸 가만두지 않지만요.',
    ground: 0xeef4f7, tones: [0xdde8ee, 0xffffff], soil: 0xb8c4cc, sky: 0xdfeaf2, skyTop: 0x8fb8dc, bg: ['#c7dcee', '#f7fbff'],
    light: { sky: 0xffffff, ground: 0xb8c8d8, hemi: 2.7, sun: 2.4, sunColor: 0xf0f6ff, fog: [40, 140] },
    air: { colors: [0xffffff], n: 220, fall: 1.6, drift: 0.8, size: 0.07 },
    hill: { side: [0x8a949c, 0x7a8a94], top: 0xffffff }, pad: [0x6b4a2f, 0xd9523a], wall: 0x6b4a2f, far: { kind: 'cone', colors: [0xffffff, 0xc7d6e4, 0xa9bccf], h: [26, 62], w: [26, 52] },
    props: [[0.34, pine], [0.2, rock(0xaab4bc)], [0.1, snowman], [0.12, stoneLantern], [0.1, bucket], [0.14, tuft(0xcfe0c9)]],
    tag: '온천', bosses: bosses('눈사람 장군', ['volley', 'slam'], '감기 대장', '눈원숭이 왕'),
    zombies: [
      z('목욕 좀비', 'basic', { skin: 0xa8d8c0, shirt: 0xfff1d6, pants: 0xfff1d6, acc: 'towel' }),
      z('스키 러너', 'runner', { skin: 0xb8e8d0, shirt: 0xe03131, pants: 0x3b5bdb, acc: 'beanie', capCol: 0xffd43b }),
      z('눈사람 좀비', 'tank', { skin: 0xffffff, shirt: 0xffffff, pants: 0xe8eef2, acc: 'snow' }),
      z('온천달걀 좀비', 'bomber', { skin: 0xf2e6d0, shirt: 0xd9a05b, pants: 0x8a6a45 }),
      z('감기 좀비', 'spitter', { skin: 0xc8e0b8, shirt: 0x8ecae6, pants: 0x495057, acc: 'beanie', capCol: 0x8ecae6 }),
      z('눈원숭이 좀비', 'leaper', { skin: 0xd9a08a, shirt: 0x9a8f80, pants: 0x8a7a6a, acc: 'ears', earCol: 0x9a8f80 }),
    ],
    build({ g, A, solid, spots, pool }) {
      spots(12, 9, (x, zz) => { // 노천탕: 들어가 있으면 체력이 찬다
        const r = rnd(4, 6); pool(x, zz, r);
        add(g, cyl(r + 0.9, 0.2, 0x8a949c), x, 0.1, zz); add(g, cyl(r, 0.24, 0x7fd6e0), x, 0.12, zz);
        for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2 + rnd(0, 0.2); add(g, ell(rnd(0.5, 0.9), rnd(0.35, 0.6), rnd(0.5, 0.9), 0x7a848c), x + Math.cos(a) * (r + 0.5), 0.3, zz + Math.sin(a) * (r + 0.5)); }
        for (let i = 0; i < 5; i++) add(g, ell(rnd(0.5, 1), rnd(0.3, 0.5), rnd(0.5, 1), 0xffffff), x + rnd(-r, r) * 0.6, rnd(1.2, 3), zz + rnd(-r, r) * 0.6); // 김
        add(g, ell(0.45, 0.3, 0.3, 0xb9824f), x + 1, 0.3, zz); add(g, ell(0.12, 0.1, 0.12, 0xf7931e), x + 1, 0.62, zz); // 먼저 온 카피바라
      }, true);
      spots(5, 13, (x, zz) => { // 온천 여관
        solid(x, zz, 14, 9, 4, 0x8a6a45); add(g, box(14.2, 0.3, 9.2, 0xfff1d6), x, 2.2, zz);
        [-1, 1].forEach(s => { const r = add(g, box(15.4, 0.4, 5.8, 0x3a3f4a), x, 5, zz + s * 2.5); r.rotation.x = s * 0.42; const sn = add(g, box(15.6, 0.3, 5, 0xffffff), x, 5.3, zz + s * 2.3); sn.rotation.x = s * 0.42; });
        for (let i = -2; i <= 2; i++) add(g, box(1.6, 1.4, 0.1, 0xffd88a, F), x + i * 2.6, 1.4, zz + 4.56);
        add(g, box(2, 2.4, 0.2, 0x3a2a1c), x, 1.2, zz + 4.6); add(g, box(2.4, 1, 0.1, 0x3b5bdb), x, 2.6, zz + 4.7);
        solid(x, zz + 6.5, 6, 3, 0.6, 0x6b4a2f, 0x8a6a45);
      });
      spots(8, 6, (x, zz) => { // 붉은 문
        const rot = Math.random() < 0.5;
        [-1, 1].forEach(s => solid(x + (rot ? 0 : s * 2.6), zz + (rot ? s * 2.6 : 0), 0.7, 0.7, 5, 0xd9523a));
        add(g, rot ? box(0.9, 0.6, 7.6, 0xd9523a) : box(7.6, 0.6, 0.9, 0xd9523a), x, 5.2, zz); add(g, rot ? box(0.7, 0.4, 6.2, 0xd9523a) : box(6.2, 0.4, 0.7, 0xd9523a), x, 4.2, zz);
        add(g, rot ? box(1, 0.3, 8.2, 0xffffff) : box(8.2, 0.3, 1, 0xffffff), x, 5.65, zz);
      });
      spots(6, 11, (x, zz) => { add(g, cyl(9, 0.04, 0xbfe6f5), x, 0.02, zz); add(g, cyl(7.5, 0.05, 0xd8f2fb), x + 0.6, 0.025, zz - 0.4); for (let i = 0; i < 4; i++) rock(0xaab4bc)(g, x + rnd(-8, 8), zz + rnd(-8, 8)); }, true); // 얼어붙은 호수
      spots(12, 8, (x, zz) => { const w = rnd(5, 9), d = rnd(5, 9), h = rnd(3, 6.5); solid(x, zz, w, d, h, 0x8a949c, 0xffffff); solid(x - w * 0.3, zz + d * 0.25, w * 0.5, d * 0.5, 1.2, 0x7a8a94, 0xffffff); }); // 눈 덮인 바위
      spots(10, 7, (x, zz) => { for (let i = 0; i < 7; i++) pine(g, x + rnd(-5, 5), zz + rnd(-5, 5)); }, true); // 소나무 숲
      spots(8, 5, (x, zz) => { // 대나무 울타리와 나무 다리
        solid(x, zz, 7, 2.4, 1.2, 0x8a6a45, 0xffffff); [-3.2, 3.2].forEach(o => { add(g, box(0.2, 1, 2.6, 0xd9523a), x + o, 1.7, zz); });
      });
    } },
  { id: 'grave', name: '달빛 묘지', blurb: '달이 뜨면 묘비 사이로 해골과 박쥐, 늑대인간이 기어 나옵니다.',
    ground: 0x4f6152, tones: [0x44554a, 0x5b6f5c], soil: 0x2e3a33, sky: 0x39407a, skyTop: 0x0e1233, bg: ['#151a44', '#5a5fa8'], night: true,
    light: { sky: 0x8fa4ff, ground: 0x2a3340, hemi: 1.5, sun: 2.0, sunColor: 0xb4c8ff, fog: [30, 120] },
    air: { colors: [0xd6ff8a, 0xfff3a0], n: 120, fall: -0.15, drift: 0.5, size: 0.07, glow: true },
    hill: { side: [0x4a4a5a, 0x3f4352], top: 0x566a58 }, pad: [0x3a3a4a, 0xb6f09c], wall: 0x30323e, far: { kind: 'cone', colors: [0x2a2f55, 0x343a66, 0x23284a], h: [14, 40], w: [16, 40] },
    props: [[0.26, tomb], [0.12, cross], [0.16, deadTree], [0.12, jackLantern], [0.1, graveLamp], [0.14, tuft(0x3f5a45)], [0.1, bones]],
    tag: '묘지', bosses: bosses('프랑켄 박사', ['slam', 'summon', 'mortar'], '대마녀', '늑대인간 군주'),
    zombies: [
      z('해골 좀비', 'basic', { skin: 0xf0ecdc, shirt: 0xe4dfcc, pants: 0xd6d0bc, noHands: 1 }),
      z('박쥐 좀비', 'runner', { skin: 0x9a7fc9, shirt: 0x4a3a66, pants: 0x3a2f55, acc: 'wings' }),
      z('프랑켄 좀비', 'tank', { skin: 0x86b88a, shirt: 0x3a3a4a, pants: 0x2a2a35, acc: 'bolts' }),
      z('도깨비불 좀비', 'bomber', { skin: 0x9be3ff, shirt: 0x5ab0e0, pants: 0x3a7ab0 }),
      z('마녀 좀비', 'spitter', { skin: 0x9fd18a, shirt: 0x4a2f66, pants: 0x2f2244, acc: 'witch' }),
      z('늑대인간 좀비', 'leaper', { skin: 0x8a6a55, shirt: 0x5a4a40, pants: 0x3f4a66, acc: 'ears', earCol: 0x6b4f3f }),
    ],
    build({ g, A, solid, spots }) {
      spots(5, 14, (x, zz) => { // 예배당
        solid(x, zz, 10, 14, 6, 0x6a6e80); solid(x, zz - 9, 5, 5, 11, 0x5f6375);
        [-1, 1].forEach(s => { const r = add(g, box(6.2, 0.4, 14.6, 0x2f3140), x + s * 2.5, 7.4, zz); r.rotation.z = -s * 0.55; });
        add(g, cone(3.6, 5, 0x2f3140), x, 13.5, zz - 9); add(g, box(0.2, 1.6, 0.2, 0xd6d0bc), x, 16.6, zz - 9); add(g, box(0.9, 0.2, 0.2, 0xd6d0bc), x, 16.9, zz - 9);
        for (let i = -2; i <= 2; i++) [-1, 1].forEach(s => add(g, box(0.1, 2.4, 1.1, pick([0xffe066, 0xb6f09c, 0x9be3ff]), F), x + s * 5.05, 3, zz + i * 2.6));
        add(g, box(2.2, 3.2, 0.2, 0x3a2a1c), x, 1.6, zz + 7.1); add(g, cyl(1, 0.12, 0xffe066, { axis: 'z', flat: 1 }), x, 4.8, zz + 7.08);
      });
      spots(8, 9, (x, zz) => { // 계단식 납골당: 올라설 수 있다
        solid(x, zz, 9, 9, 1.2, 0x7a7f90, 0x8a8f9c); solid(x, zz, 6, 6, 1.2, 0x6a6e80, 0x8a8f9c, 1.2); solid(x, zz, 3, 3, 1.2, 0x5f6375, 0x8a8f9c, 2.4);
        [[4, 4], [-4, 4], [4, -4], [-4, -4]].forEach(q => { add(g, cyl(0.25, 2.2, 0x8a8f9c), x + q[0], 2.3, zz + q[1]); add(g, box(0.4, 0.5, 0.4, 0xb6f09c, F), x + q[0], 3.6, zz + q[1]); });
      });
      spots(12, 9, (x, zz) => { // 묘비 밭
        add(g, box(12, 0.04, 12, 0x3f4f44), x, 0.02, zz);
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (Math.random() < 0.85) (Math.random() < 0.75 ? tomb : cross)(g, x + i * 3 - 4.5 + rnd(-0.3, 0.3), zz + j * 3 - 4.5);
      }, true);
      spots(8, 7, (x, zz) => { // 거대한 고목
        solid(x, zz, 2.2, 2.2, 7, 0x3a2f33);
        [[3, 6, 0.5], [-3.2, 7, -0.6], [1.5, 8.5, 1.1], [-1.6, 9, -1.2], [0, 5, 0.2]].forEach(q => { const b = add(g, box(5, 0.5, 0.5, 0x3a2f33), x + q[0] * 0.6, q[1], zz); b.rotation.z = q[2]; });
        add(g, ell(0.3, 0.3, 0.2, 0xffe066, F), x + 0.5, 4.2, zz + 1.12); add(g, ell(0.3, 0.3, 0.2, 0xffe066, F), x - 0.5, 4.2, zz + 1.12); // 올빼미 눈
      });
      spots(18, 6, (x, zz) => { // 쇠울타리
        const rot = Math.random() < 0.5;
        for (let i = 0; i < 9; i++) { add(g, box(0.08, 1.5, 0.08, 0x23252f), x + (rot ? 0 : i - 4), 0.75, zz + (rot ? i - 4 : 0)); add(g, cone(0.08, 0.2, 0x23252f), x + (rot ? 0 : i - 4), 1.6, zz + (rot ? i - 4 : 0)); }
        add(g, rot ? box(0.06, 0.08, 8.2, 0x23252f) : box(8.2, 0.08, 0.06, 0x23252f), x, 1.2, zz);
      });
      spots(10, 5, (x, zz) => { solid(x, zz, 2.6, 1.3, 1.2, 0x8a8f9c, 0x7a7f90); add(g, box(2.2, 0.2, 1, 0x5f6375), x, 1.3, zz); add(g, box(0.14, 1.1, 0.14, 0x9aa0ad), x, 1.9, zz); add(g, box(0.6, 0.14, 0.14, 0x9aa0ad), x, 2.1, zz); }); // 석관
      spots(8, 6, (x, zz) => { for (let i = 0; i < 5; i++) jackLantern(g, x + rnd(-2.5, 2.5), zz + rnd(-2.5, 2.5)); graveLamp(g, x, zz); }, true); // 호박 무더기
    } },
];
export const getMap = id => MAPS.find(m => m.id === id) || MAPS[0];

export function pickProp(map, r) {
  for (const [w, fn] of map.props) { if ((r -= w) <= 0) return fn; }
  return map.props[0][1];
}

// 선택창과 랜딩페이지에서 쓰는 원판 디오라마
export function buildDiorama(map, R) {
  const g = new T.Group();
  add(g, cyl(R, 0.5, map.ground), 0, -0.25, 0);
  add(g, cyl(R, 0.35, map.soil), 0, -0.67, 0);
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + 0.9, rad = R * (i % 2 ? 0.84 : 0.7);
    if (Math.sin(a) > 0.75) continue; // 카메라 쪽 앞자리는 비워 둔다
    map.props[i % map.props.length][1](g, Math.cos(a) * rad, Math.sin(a) * rad);
  }
  return g;
}
