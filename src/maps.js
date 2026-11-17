// 전장 정의: 색, 하늘, 소품, 대형 지형지물, 그리고 맵마다 다른 좀비 (기본 / 러너 / 탱커 / 폭탄 순서)
import * as T from 'three';
import { add, ell, box, cyl, cone } from './kit.js';

const PI = Math.PI;
const ROLE = {
  basic: { role: '기본', s: 1, hp: 3, speed: 1.7, radius: 0.42, dps: 8, xp: 1 },
  runner: { role: '러너', s: 0.7, hp: 2, speed: 3.1, radius: 0.3, dps: 6, xp: 1 },
  tank: { role: '탱커', s: 1.45, fat: 1.25, hp: 14, speed: 1.1, radius: 0.65, dps: 16, xp: 5, heavy: true },
  bomber: { role: '폭탄', s: 0.95, hp: 2, speed: 2.2, radius: 0.4, dps: 6, xp: 2, bomb: true },
};
const z = (name, role, look) => ({ name, ...ROLE[role], ...look });
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// ── 작은 소품: (부모, x, z)에 놓는다 ──
const tuft = c => (g, x, zz) => add(g, cone(0.14, 0.3, c), x, 0.15, zz);
const rock = c => (g, x, zz) => { const s = rnd(0.7, 1.6); const m = add(g, box(0.5 * s, 0.3 * s, 0.4 * s, c), x, 0.15 * s, zz); m.rotation.y = rnd(0, 3); };
const hay = (g, x, zz) => add(g, cyl(0.38, 0.6, 0xe2b64f, { axis: 'z' }), x, 0.38, zz);
const tree = (g, x, zz) => { const s = rnd(0.9, 1.7); add(g, cyl(0.12 * s, 0.9 * s, 0x7a5a3c), x, 0.45 * s, zz); add(g, ell(0.7 * s, 0.6 * s, 0.7 * s, 0x4f8a3c), x, 1.25 * s, zz); add(g, ell(0.45 * s, 0.4 * s, 0.45 * s, 0x5f9e3f), x + 0.3 * s, 1.7 * s, zz); add(g, ell(0.1, 0.1, 0.1, 0xf7931e), x + 0.45 * s, 1.2 * s, zz + 0.45 * s); add(g, ell(0.1, 0.1, 0.1, 0xf7931e), x - 0.2 * s, 1.5 * s, zz + 0.5 * s); };
const flower = c => (g, x, zz) => { add(g, cyl(0.02, 0.3, 0x4f8a3c), x, 0.15, zz); add(g, ell(0.09, 0.05, 0.09, c), x, 0.32, zz); };
const trafficCone = (g, x, zz) => { add(g, cyl(0.2, 0.05, 0xff6b1a), x, 0.03, zz); add(g, cone(0.15, 0.42, 0xff6b1a), x, 0.25, zz); };
const lamp = (g, x, zz) => { add(g, cyl(0.06, 3.4, 0x2a2f3a), x, 1.7, zz); add(g, box(0.7, 0.06, 0.06, 0x2a2f3a), x + 0.3, 3.4, zz); add(g, ell(0.18, 0.18, 0.18, 0xfff3a0, { flat: 1 }), x + 0.62, 3.3, zz); };
const mailbox = (g, x, zz) => { add(g, box(0.5, 0.7, 0.4, 0x3b5bdb), x, 0.35, zz); add(g, box(0.52, 0.08, 0.42, 0x8fd3ff), x, 0.74, zz); };
const hydrant = (g, x, zz) => { add(g, cyl(0.13, 0.45, 0xe03131), x, 0.22, zz); add(g, ell(0.15, 0.1, 0.15, 0xe03131), x, 0.47, zz); };
const trash = (g, x, zz) => { add(g, cyl(0.25, 0.6, 0x495057), x, 0.3, zz); add(g, cyl(0.28, 0.06, 0x343a40), x, 0.62, zz); };
const cactus = (g, x, zz) => { const s = rnd(0.8, 1.6); add(g, cyl(0.17 * s, 1.4 * s, 0x4f9d57), x, 0.7 * s, zz); add(g, cyl(0.1 * s, 0.4 * s, 0x4f9d57, { axis: 'x' }), x + 0.3 * s, 0.8 * s, zz); add(g, cyl(0.1 * s, 0.5 * s, 0x4f9d57), x + 0.5 * s, 1.0 * s, zz); add(g, cyl(0.1 * s, 0.35 * s, 0x4f9d57, { axis: 'x' }), x - 0.28 * s, 0.55 * s, zz); add(g, cyl(0.1 * s, 0.4 * s, 0x4f9d57), x - 0.45 * s, 0.72 * s, zz); };
const pillar = (g, x, zz) => { const h = rnd(1, 2.6); add(g, cyl(0.3, h, 0xd9c08a), x, h / 2, zz); add(g, box(0.8, 0.2, 0.8, 0xc9ae76), x, h + 0.1, zz); add(g, box(0.8, 0.14, 0.8, 0xc9ae76), x, 0.07, zz); };
const bones = (g, x, zz) => { const m = add(g, cyl(0.04, 0.6, 0xf4f0d0, { axis: 'x' }), x, 0.05, zz); m.rotation.y = rnd(0, 3); add(g, ell(0.14, 0.12, 0.12, 0xf4f0d0), x + 0.4, 0.1, zz + 0.2); };
const gumdrop = c => (g, x, zz) => { const s = rnd(0.7, 1.5); add(g, ell(0.28 * s, 0.3 * s, 0.28 * s, c), x, 0.05, zz); };
const lollipop = c => (g, x, zz) => { const h = rnd(1.2, 2.4); add(g, cyl(0.05, h, 0xffffff), x, h / 2, zz); add(g, cyl(0.36, 0.12, c, { axis: 'z' }), x, h + 0.3, zz); add(g, cyl(0.2, 0.14, 0xffffff, { axis: 'z' }), x, h + 0.3, zz); };
const cupcake = (g, x, zz) => { add(g, cyl(0.3, 0.35, 0xc98a6b), x, 0.18, zz); add(g, ell(0.36, 0.26, 0.36, pick([0xff8fab, 0x9be3c9, 0xffffff])), x, 0.5, zz); add(g, ell(0.08, 0.08, 0.08, 0xe03131), x, 0.78, zz); };

export const MAPS = [
  { id: 'farm', name: '유자 농장', blurb: '귤나무와 헛간, 풍차 사이로 농부들이 일어납니다.',
    ground: 0x8fbf5a, soil: 0x7a5a3c, sky: 0xcfe8dc, skyTop: 0x7ec3e6, bg: ['#bfe3e0', '#f6e9c9'],
    hill: { side: [0x7a5a3c, 0x8a6a45], top: 0x7fb04e }, wall: 0x9a7447, far: { kind: 'cone', colors: [0x6fa64a, 0x5f9e3f, 0x86b85a], h: [10, 28], w: [18, 40] },
    props: [[0.42, tuft(0x5f9e3f)], [0.1, hay], [0.2, tree], [0.1, rock(0x9a8f80)], [0.09, flower(0xffe066)], [0.09, flower(0xff8fab)]],
    zombies: [
      z('농부 좀비', 'basic', { skin: 0x8fb86a, shirt: 0xc95f4a, pants: 0x4f6a8f, acc: 'straw' }),
      z('꼬마 좀비', 'runner', { skin: 0xa9cf7a, shirt: 0xf2c14e, pants: 0x7a5a3c, brain: 1 }),
      z('호박머리', 'tank', { skin: 0x8fb86a, headCol: 0xe8862e, shirt: 0x6b5a45, pants: 0x4a3d30, acc: 'pumpkin' }),
      z('농약통 좀비', 'bomber', { skin: 0xb8c26a, shirt: 0x5d7a3a, pants: 0x4a3d30 }),
    ],
    build({ g, A, solid, spots, avoid }) {
      spots(4, 14, (x, zz) => { // 헛간과 사일로
        solid(x, zz, 9, 7, 5, 0xb5443a);
        [-1, 1].forEach(s => { const r = add(g, box(9.6, 0.4, 4.6, 0x7a2e27), x, 5.9, zz + s * 1.75); r.rotation.x = s * 0.6; });
        add(g, box(2.4, 3, 0.2, 0xfff1d6), x, 1.5, zz + 3.55); add(g, box(9.1, 0.3, 7.1, 0xfff1d6), x, 4.9, zz);
        solid(x + 7.5, zz, 3.2, 3.2, 7, 0xcfd4d8); add(g, cone(2.1, 1.8, 0x9aa5ad), x + 7.5, 7.9, zz);
      });
      spots(3, 9, (x, zz) => { // 풍차
        solid(x, zz, 2.6, 2.6, 8, 0xf2e6d0); add(g, cone(2.1, 1.8, 0xb5443a), x, 8.9, zz);
        [0.4, 0.4 + PI / 2].forEach(a => { const b = add(g, box(0.6, 11, 0.12, 0xfff8ea), x, 7.4, zz + 1.5); b.rotation.z = a; });
        add(g, cyl(0.3, 0.5, 0x7a5a3c, { axis: 'z' }), x, 7.4, zz + 1.4);
      });
      spots(9, 9, (x, zz) => { // 밭고랑
        add(g, box(10, 0.05, 13, 0x8a6a45), x, 0.025, zz);
        const c = pick([0x6aa84f, 0xe8862e, 0xc9d94a]);
        for (let i = 0; i < 6; i++) for (let j = 0; j < 10; j++) add(g, cone(0.24, 0.5, c), x + i * 1.6 - 4, 0.28, zz + j * 1.25 - 5.6);
      }, true);
      spots(5, 8, (x, zz) => { add(g, cyl(5.2, 0.03, 0x7a9a4a), x, 0.015, zz); add(g, cyl(4.6, 0.05, 0x6ec3d9), x, 0.03, zz); [[4.8, 0], [-3.5, 3.6], [1, -5]].forEach(q => add(g, ell(0.5, 0.35, 0.5, 0x9a8f80), x + q[0], 0.2, zz + q[1])); }, true);
      spots(14, 6, (x, zz) => { // 울타리
        const rot = Math.random() < 0.5;
        for (let i = 0; i < 6; i++) add(g, box(0.14, 0.9, 0.14, 0x9a7447), x + (rot ? 0 : i * 1.6 - 4), 0.45, zz + (rot ? i * 1.6 - 4 : 0));
        [0.72, 0.4].forEach(h => add(g, rot ? box(0.08, 0.1, 8.2, 0x9a7447) : box(8.2, 0.1, 0.08, 0x9a7447), x, h, zz));
      });
    } },
  { id: 'city', name: '네온 도심', blurb: '퇴근하지 못한 회사원들이 빌딩 숲 사이 차선을 넘어옵니다.',
    ground: 0x5a5e78, soil: 0x3a3c55, sky: 0xf2b8c0, skyTop: 0x3a3470, bg: ['#34306b', '#ff9aa2'],
    hill: { side: [0xd9523a, 0x3b5bdb, 0xff922b, 0x20c997], top: 0x2f3348 }, wall: 0x2e3048, far: { kind: 'box', colors: [0x4a4770, 0x5a5488, 0x3d3a66], h: [22, 75], w: [10, 22] },
    props: [[0.24, trafficCone], [0.14, lamp], [0.16, mailbox], [0.16, hydrant], [0.18, trash], [0.12, rock(0x777b93)]],
    zombies: [
      z('회사원 좀비', 'basic', { skin: 0x7ee081, shirt: 0xf1f3f5, pants: 0x364fc7, acc: 'tie', brain: 1 }),
      z('배달 러너', 'runner', { skin: 0x9af09c, shirt: 0x20c997, pants: 0x343a40, acc: 'cap', capCol: 0xff4d4d }),
      z('공사장 반장', 'tank', { skin: 0x69c96c, shirt: 0xff922b, pants: 0x495057, acc: 'hardhat' }),
      z('가스통 좀비', 'bomber', { skin: 0x8fe0a0, shirt: 0x868e96, pants: 0x343a40 }),
    ],
    build({ g, A, solid, spots, avoid }) {
      const roads = [-A * 0.5, 0, A * 0.5]; // 도로망
      avoid((x, zz, r) => roads.some(c => Math.abs(x - c) < 4.2 + r || Math.abs(zz - c) < 4.2 + r));
      roads.forEach(c => {
        add(g, box(A * 2, 0.04, 8, 0x3a3c4e), 0, 0.02, c); add(g, box(8, 0.04, A * 2, 0x3a3c4e), c, 0.021, 0);
        for (let i = -A + 3; i < A; i += 6) { add(g, box(2.4, 0.02, 0.2, 0xffd43b), i, 0.05, c); add(g, box(0.2, 0.02, 2.4, 0xffd43b), c, 0.05, i); }
      });
      const cols = [0x8d93b8, 0xa7a0c9, 0x7f86a8, 0xb9a5b5, 0x6f7696], neon = [0xff4d8d, 0x4dd4ff, 0xffe066, 0x9dff7a];
      spots(30, 11, (x, zz) => { // 빌딩: 창문과 네온 간판
        const w = rnd(8, 14), d = rnd(8, 14), h = rnd(8, 26), c = pick(cols);
        solid(x, zz, w, d, h, c, 0x4a4e68);
        for (let fy = 2; fy < h - 1; fy += 3) for (let k = -1; k <= 1; k++) {
          if (Math.random() < 0.55) add(g, box(1.3, 1.5, 0.08, Math.random() < 0.6 ? 0xfff3a0 : 0x3a3c55, { flat: 1 }), x + k * w * 0.3, fy, zz + d / 2 + 0.03);
          if (Math.random() < 0.55) add(g, box(1.3, 1.5, 0.08, Math.random() < 0.6 ? 0xfff3a0 : 0x3a3c55, { flat: 1 }), x + k * w * 0.3, fy, zz - d / 2 - 0.03);
          if (Math.random() < 0.55) add(g, box(0.08, 1.5, 1.3, Math.random() < 0.6 ? 0xfff3a0 : 0x3a3c55, { flat: 1 }), x + w / 2 + 0.03, fy, zz + k * d * 0.3);
          if (Math.random() < 0.55) add(g, box(0.08, 1.5, 1.3, Math.random() < 0.6 ? 0xfff3a0 : 0x3a3c55, { flat: 1 }), x - w / 2 - 0.03, fy, zz + k * d * 0.3);
        }
        add(g, box(w * 0.6, 1.1, 0.14, pick(neon), { flat: 1 }), x, 4.4, zz + d / 2 + 0.1);
        add(g, box(0.14, 3.4, 1.1, pick(neon), { flat: 1 }), x + w / 2 + 0.1, Math.min(h - 2.5, 7), zz - d * 0.25);
      });
      // 도로 위 자동차: 지붕에 올라설 수 있다
      for (let i = 0; i < 46; i++) {
        const c = pick(roads), along = rnd(-A + 6, A - 6), horiz = Math.random() < 0.5, off = pick([-2, 2]);
        const x = horiz ? along : c + off, zz = horiz ? c + off : along;
        if (Math.hypot(x, zz) < 9) continue;
        const col = pick([0xe03131, 0x3b5bdb, 0xffd43b, 0xf1f3f5, 0x20c997, 0x212529]);
        solid(x, zz, horiz ? 3.8 : 1.9, horiz ? 1.9 : 3.8, 1.2, col);
        add(g, horiz ? box(2, 0.7, 1.7, 0x2a2f3a) : box(1.7, 0.7, 2, 0x2a2f3a), x, 1.5, zz);
        [-1, 1].forEach(a => [-1, 1].forEach(b => add(g, cyl(0.36, 0.3, 0x212529, { axis: horiz ? 'z' : 'x' }), x + (horiz ? a * 1.2 : b * 0.95), 0.36, zz + (horiz ? b * 0.95 : a * 1.2))));
      }
    } },
  { id: 'desert', name: '사막 유적', blurb: '계단식 피라미드와 무너진 기둥 아래에서 붕대 감은 것들이 깨어납니다.',
    ground: 0xe3c27a, soil: 0xb8904f, sky: 0xf6e3b4, skyTop: 0x5fb6f0, bg: ['#8fd0ff', '#ffe9a8'],
    hill: { side: [0xc98a4b, 0xb8904f], top: 0xdba15e }, wall: 0xc9ae76, far: { kind: 'cone', colors: [0xdfb96e, 0xd1a55c, 0xc98a4b], h: [8, 22], w: [24, 55] },
    props: [[0.34, rock(0xb8904f)], [0.2, cactus], [0.16, pillar], [0.2, tuft(0xb9a25a)], [0.1, bones]],
    zombies: [
      z('미라 좀비', 'basic', { skin: 0xd9cfb0, shirt: 0xd9cfb0, pants: 0xc4b998, acc: 'bandage' }),
      z('카우보이 좀비', 'runner', { skin: 0x86b86b, shirt: 0x9c4f2e, pants: 0x3d5a80, acc: 'cowboy' }),
      z('선인장 좀비', 'tank', { skin: 0x4f9d57, shirt: 0x4f9d57, pants: 0x3d7d45, acc: 'cactus' }),
      z('다이너마이트 좀비', 'bomber', { skin: 0xa8c080, shirt: 0x7a4a26, pants: 0x3d5a80 }),
    ],
    build({ g, A, solid, spots }) {
      spots(4, 17, (x, zz) => { // 계단식 피라미드: 한 단씩 점프해 꼭대기까지 오른다
        for (let k = 0; k < 6; k++) { const s = 26 - k * 4.4; solid(x, zz, s, s, 1.2, k % 2 ? 0xd9b46a : 0xcfa558, 0xe3c27a, k * 1.2); }
        add(g, cone(1.6, 1.8, 0xf2c14e), x, 8.1, zz);
      });
      spots(8, 7, (x, zz) => { // 돌 아치
        const rot = Math.random() < 0.5;
        [-1, 1].forEach(s => solid(x + (rot ? 0 : s * 3.4), zz + (rot ? s * 3.4 : 0), 1.8, 1.8, 5.2, 0xc9ae76));
        add(g, rot ? box(2.2, 1.4, 9.4, 0xd9c08a) : box(9.4, 1.4, 2.2, 0xd9c08a), x, 5.9, zz);
      });
      spots(5, 9, (x, zz) => { // 오아시스
        add(g, cyl(6, 0.03, 0x9fbf6a), x, 0.015, zz); add(g, cyl(4.4, 0.05, 0x4fc3d9), x, 0.03, zz);
        for (let i = 0; i < 6; i++) {
          const a = i * 1.05 + rnd(0, 0.4), px = x + Math.cos(a) * 5.2, pz = zz + Math.sin(a) * 5.2, h = rnd(3, 5);
          const t = add(g, cyl(0.2, h, 0x9a7447), px, h / 2, pz); t.rotation.z = rnd(-0.15, 0.15);
          for (let k = 0; k < 6; k++) { const l = add(g, ell(1.5, 0.1, 0.45, 0x3d9d57), px + Math.cos(k * 1.05) * 1.1, h + 0.1, pz + Math.sin(k * 1.05) * 1.1); l.rotation.y = -k * 1.05; l.rotation.z = -0.35; }
        }
      }, true);
      spots(12, 8, (x, zz) => { const w = rnd(5, 10), d = rnd(5, 10), h = rnd(3.5, 7); solid(x, zz, w, d, h, 0xc98a4b, 0xdba15e); solid(x + w * 0.3, zz + d * 0.3, w * 0.55, d * 0.55, 1.2, 0xb8904f, 0xdba15e); }); // 바위산
      spots(8, 6, (x, zz) => { for (let i = 0; i < 5; i++) { const h = i === 2 ? 1.2 : rnd(2.5, 5.5); add(g, cyl(0.45, h, 0xd9c08a), x + i * 2.4 - 4.8, h / 2, zz); add(g, box(1.2, 0.3, 1.2, 0xc9ae76), x + i * 2.4 - 4.8, h + 0.15, zz); } });
    } },
  { id: 'candy', name: '캔디 놀이공원', blurb: '케이크 탑과 대관람차 사이로 사탕 색 좀비들이 풍선껌을 불며 다가옵니다.',
    ground: 0xffbfd0, soil: 0xe08aa6, sky: 0xffe3ec, skyTop: 0x9fd8ff, bg: ['#ffe3ec', '#cdeaff'],
    hill: { side: [0xf7b2c4, 0xc98a6b, 0x9be3c9, 0xffe066], top: 0xfff1d6 }, wall: 0xffffff, far: { kind: 'cone', colors: [0xffc9d9, 0xc9b6f2, 0x9be3c9, 0xffe9a8], h: [12, 34], w: [14, 34] },
    props: [[0.2, gumdrop(0xc9b6f2)], [0.16, gumdrop(0x9be3c9)], [0.16, gumdrop(0xffe066)], [0.16, lollipop(0xff8fab)], [0.16, lollipop(0x8ecae6)], [0.16, cupcake]],
    zombies: [
      z('파티모자 좀비', 'basic', { skin: 0xa8e6cf, shirt: 0xffe066, pants: 0x8ecae6, acc: 'party' }),
      z('토끼 머리띠', 'runner', { skin: 0xb8f0dc, shirt: 0xffffff, pants: 0xffb3c6, acc: 'bunny' }),
      z('풍선껌 뚱보', 'tank', { skin: 0xc9b6f2, shirt: 0xff8fab, pants: 0x9d8ad6, acc: 'gum', fat: 1.35 }),
      z('팝핑캔디 좀비', 'bomber', { skin: 0xffd6a5, shirt: 0xff8fab, pants: 0x8ecae6 }),
    ],
    build({ g, A, solid, spots, avoid }) {
      const river = -A * 0.35; // 초콜릿 강
      avoid((x, zz, r) => Math.abs(zz - river) < 5 + r);
      add(g, box(A * 2, 0.05, 9, 0x8a5a3c), 0, 0.025, river); add(g, box(A * 2, 0.04, 10.4, 0xfff1d6), 0, 0.02, river);
      for (let x = -A + 20; x < A; x += 44) { solid(x, river, 6, 10.5, 1.2, 0xd9a05b, 0xfff1d6); } // 비스킷 다리
      spots(6, 12, (x, zz) => { // 3단 케이크 탑
        [[16, 0xf7b2c4], [10.5, 0xfff1d6], [5.5, 0xc98a6b]].forEach((t, k) => {
          solid(x, zz, t[0], t[0], 1.2, t[1], 0xffffff, k * 1.2);
          for (let i = 0; i < 4; i++) add(g, ell(0.5, 0.5, 0.5, 0xffffff), x + (i % 2 ? 1 : -1) * t[0] / 2, k * 1.2 + 1.1, zz + (i < 2 ? 1 : -1) * t[0] / 2);
        });
        add(g, ell(0.7, 0.7, 0.7, 0xe03131), x, 4.2, zz); add(g, cyl(0.04, 0.8, 0x4f8a3c), x, 5.1, zz);
      });
      spots(3, 13, (x, zz) => { // 대관람차
        solid(x, zz, 10, 3, 1.2, 0x9d8ad6, 0xffffff);
        [-1, 1].forEach(s => { const l = add(g, box(0.5, 11.5, 0.5, 0xffffff), x + s * 3, 6, zz); l.rotation.z = s * 0.3; });
        for (let i = 0; i < 16; i++) {
          const a = i / 16 * PI * 2, seg = add(g, box(3.6, 0.3, 0.3, 0xff8fab), x + Math.cos(a) * 8.6, 11 + Math.sin(a) * 8.6, zz); seg.rotation.z = a + PI / 2;
          if (i % 2 === 0) { const sp = add(g, box(8.6, 0.14, 0.14, 0xffffff), x + Math.cos(a) * 4.3, 11 + Math.sin(a) * 4.3, zz); sp.rotation.z = a; add(g, box(1.4, 1.3, 1.4, pick([0xffe066, 0x9be3c9, 0x8ecae6, 0xc9b6f2])), x + Math.cos(a) * 8.6, 10 + Math.sin(a) * 8.6, zz); }
        }
        add(g, cyl(0.7, 0.8, 0xffe066, { axis: 'z' }), x, 11, zz);
      });
      spots(14, 5, (x, zz) => { // 지팡이 사탕
        solid(x, zz, 0.9, 0.9, 6, 0xffffff);
        for (let k = 0; k < 5; k++) add(g, box(0.95, 0.5, 0.95, 0xe03131), x, 0.6 + k * 1.2, zz);
        add(g, box(2.2, 0.8, 0.9, 0xffffff), x + 0.7, 6.3, zz); add(g, box(0.9, 1.4, 0.9, 0xe03131), x + 1.5, 5.6, zz);
      });
      spots(8, 6, (x, zz) => { // 거대 아이스크림
        solid(x, zz, 2.4, 2.4, 3.4, 0xd9a05b);
        add(g, ell(2, 1.7, 2, pick([0xff8fab, 0x9be3c9, 0xfff1d6])), x, 4.4, zz); add(g, ell(1.5, 1.3, 1.5, pick([0xc9b6f2, 0xffe066, 0xc98a6b])), x, 6.2, zz);
        add(g, ell(0.4, 0.4, 0.4, 0xe03131), x, 7.6, zz);
      });
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
