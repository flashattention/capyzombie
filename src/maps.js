// 전장 정의: 색, 소품, 그리고 맵마다 다른 좀비 3종 (기본 / 러너 / 탱커 순서)
import * as T from 'three';
import { add, ell, box, cyl, cone } from './kit.js';

const ROLE = {
  basic: { role: '기본', s: 1, hp: 3, speed: 1.7, radius: 0.42, dps: 8 },
  runner: { role: '러너', s: 0.7, hp: 2, speed: 3.1, radius: 0.3, dps: 6 },
  tank: { role: '탱커', s: 1.45, fat: 1.25, hp: 14, speed: 1.1, radius: 0.65, dps: 16 },
};
const z = (name, role, look) => ({ name, ...ROLE[role], ...look });

// 소품: (부모, x, z)에 놓는다
const tuft = c => (g, x, zz) => add(g, cone(0.14, 0.3, c), x, 0.15, zz);
const rock = c => (g, x, zz) => add(g, box(0.5, 0.3, 0.4, c), x, 0.15, zz);
const hay = (g, x, zz) => add(g, cyl(0.38, 0.6, 0xe2b64f, { axis: 'z' }), x, 0.38, zz);
const tree = (g, x, zz) => { add(g, cyl(0.12, 0.9, 0x7a5a3c), x, 0.45, zz); add(g, ell(0.7, 0.6, 0.7, 0x4f8a3c), x, 1.25, zz); add(g, ell(0.1, 0.1, 0.1, 0xf7931e), x + 0.45, 1.2, zz + 0.45); add(g, ell(0.1, 0.1, 0.1, 0xf7931e), x - 0.2, 1.5, zz + 0.5); };
const trafficCone = (g, x, zz) => { add(g, cyl(0.2, 0.05, 0xff6b1a), x, 0.03, zz); add(g, cone(0.15, 0.42, 0xff6b1a), x, 0.25, zz); };
const lamp = (g, x, zz) => { add(g, cyl(0.06, 2.4, 0x2a2f3a), x, 1.2, zz); add(g, box(0.6, 0.06, 0.06, 0x2a2f3a), x + 0.27, 2.4, zz); add(g, ell(0.14, 0.14, 0.14, 0xfff3a0, { flat: 1 }), x + 0.55, 2.3, zz); };
const mailbox = (g, x, zz) => { add(g, box(0.5, 0.7, 0.4, 0x3b5bdb), x, 0.35, zz); add(g, box(0.52, 0.08, 0.42, 0x8fd3ff), x, 0.74, zz); };
const hydrant = (g, x, zz) => { add(g, cyl(0.13, 0.45, 0xe03131), x, 0.22, zz); add(g, ell(0.15, 0.1, 0.15, 0xe03131), x, 0.47, zz); };
const dash = (g, x, zz) => add(g, box(0.9, 0.02, 0.16, 0xffd43b), x, 0.01, zz);
const cactus = (g, x, zz) => { add(g, cyl(0.17, 1.4, 0x4f9d57), x, 0.7, zz); add(g, cyl(0.1, 0.4, 0x4f9d57, { axis: 'x' }), x + 0.3, 0.8, zz); add(g, cyl(0.1, 0.5, 0x4f9d57), x + 0.5, 1.0, zz); add(g, cyl(0.1, 0.35, 0x4f9d57, { axis: 'x' }), x - 0.28, 0.55, zz); add(g, cyl(0.1, 0.4, 0x4f9d57), x - 0.45, 0.72, zz); };
const pillar = (g, x, zz) => { add(g, cyl(0.3, 1.3, 0xd9c08a), x, 0.65, zz); add(g, box(0.8, 0.2, 0.8, 0xc9ae76), x, 1.4, zz); add(g, box(0.8, 0.14, 0.8, 0xc9ae76), x, 0.07, zz); };
const gumdrop = c => (g, x, zz) => add(g, ell(0.28, 0.3, 0.28, c), x, 0.05, zz);
const lollipop = c => (g, x, zz) => { add(g, cyl(0.05, 1.4, 0xffffff), x, 0.7, zz); add(g, cyl(0.36, 0.12, c, { axis: 'z' }), x, 1.7, zz); add(g, cyl(0.2, 0.14, 0xffffff, { axis: 'z' }), x, 1.7, zz); };

export const MAPS = [
  { id: 'farm', name: '유자 농장', blurb: '귤나무와 건초 더미 사이로 농부들이 일어납니다.',
    ground: 0x8fbf5a, soil: 0x7a5a3c, sky: 0xcfe8dc, bg: ['#bfe3e0', '#f6e9c9'],
    props: [[0.55, tuft(0x5f9e3f)], [0.15, hay], [0.15, tree], [0.15, rock(0x9a8f80)]],
    zombies: [
      z('농부 좀비', 'basic', { skin: 0x8fb86a, shirt: 0xc95f4a, pants: 0x4f6a8f, acc: 'straw' }),
      z('꼬마 좀비', 'runner', { skin: 0xa9cf7a, shirt: 0xf2c14e, pants: 0x7a5a3c, brain: 1 }),
      z('호박머리', 'tank', { skin: 0x8fb86a, headCol: 0xe8862e, shirt: 0x6b5a45, pants: 0x4a3d30, acc: 'pumpkin' }),
    ] },
  { id: 'city', name: '네온 도심', blurb: '퇴근하지 못한 회사원들이 차선을 넘어옵니다.',
    ground: 0x5a5e78, soil: 0x3a3c55, sky: 0xe7c4cf, bg: ['#34306b', '#ff9aa2'],
    props: [[0.3, trafficCone], [0.3, dash], [0.12, lamp], [0.14, mailbox], [0.14, hydrant]],
    zombies: [
      z('회사원 좀비', 'basic', { skin: 0x7ee081, shirt: 0xf1f3f5, pants: 0x364fc7, acc: 'tie', brain: 1 }),
      z('배달 러너', 'runner', { skin: 0x9af09c, shirt: 0x20c997, pants: 0x343a40, acc: 'cap', capCol: 0xff4d4d }),
      z('공사장 반장', 'tank', { skin: 0x69c96c, shirt: 0xff922b, pants: 0x495057, acc: 'hardhat' }),
    ] },
  { id: 'desert', name: '사막 유적', blurb: '무너진 기둥 아래에서 붕대 감은 것들이 깨어납니다.',
    ground: 0xe3c27a, soil: 0xb8904f, sky: 0xf3e2b8, bg: ['#8fd0ff', '#ffe9a8'],
    props: [[0.4, rock(0xb8904f)], [0.25, cactus], [0.12, pillar], [0.23, tuft(0xb9a25a)]],
    zombies: [
      z('미라 좀비', 'basic', { skin: 0xd9cfb0, shirt: 0xd9cfb0, pants: 0xc4b998, acc: 'bandage' }),
      z('카우보이 좀비', 'runner', { skin: 0x86b86b, shirt: 0x9c4f2e, pants: 0x3d5a80, acc: 'cowboy' }),
      z('선인장 좀비', 'tank', { skin: 0x4f9d57, shirt: 0x4f9d57, pants: 0x3d7d45, acc: 'cactus' }),
    ] },
  { id: 'candy', name: '캔디 놀이공원', blurb: '사탕 색 좀비들이 풍선껌을 불며 다가옵니다.',
    ground: 0xffbfd0, soil: 0xe08aa6, sky: 0xffe3ec, bg: ['#ffe3ec', '#cdeaff'],
    props: [[0.25, gumdrop(0xc9b6f2)], [0.2, gumdrop(0x9be3c9)], [0.2, gumdrop(0xffe066)], [0.18, lollipop(0xff8fab)], [0.17, lollipop(0x8ecae6)]],
    zombies: [
      z('파티모자 좀비', 'basic', { skin: 0xa8e6cf, shirt: 0xffe066, pants: 0x8ecae6, acc: 'party' }),
      z('토끼 머리띠', 'runner', { skin: 0xb8f0dc, shirt: 0xffffff, pants: 0xffb3c6, acc: 'bunny' }),
      z('풍선껌 뚱보', 'tank', { skin: 0xc9b6f2, shirt: 0xff8fab, pants: 0x9d8ad6, acc: 'gum', fat: 1.35 }),
    ] },
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
