// 레벨업 때 고르는 강화. S는 전투 수치, P는 플레이어 상태.
// 후반 스테이지 무기(강화 수트·제트팩·레이저)는 여기에 available 조건을 달아 추가한다.
export const BASE_STATS = () => ({
  fireCd: 0.075, dmg: 1, shots: 1, pierce: 0,
  rocketCd: 2.2, rocketR: 2.8, rockets: 1,
  speed: 1, maxHp: 100, magnet: 2.5, stReg: 0.22, ramDmg: 6,
});

export const UPGRADES = [
  { id: 'rate', group: '게틀링건', name: '연사 속도', desc: '발사 간격이 18% 짧아집니다.', max: 5, apply: S => { S.fireCd *= 0.82; } },
  { id: 'dmg', group: '게틀링건', name: '대구경 탄', desc: '탄 피해가 1 늘어납니다.', max: 5, apply: S => { S.dmg += 1; } },
  { id: 'multi', group: '게틀링건', name: '부채꼴 사격', desc: '한 번에 쏘는 탄이 1발 늘어납니다.', max: 3, apply: S => { S.shots += 1; } },
  { id: 'pierce', group: '게틀링건', name: '관통탄', desc: '탄이 좀비를 1마리 더 꿰뚫습니다.', max: 3, apply: S => { S.pierce += 1; } },
  { id: 'reload', group: '로켓 포드', name: '빠른 재장전', desc: 'Q 로켓 대기 시간이 15% 짧아집니다.', max: 5, apply: S => { S.rocketCd *= 0.85; } },
  { id: 'radius', group: '로켓 포드', name: '넓은 폭발', desc: '폭발 반경이 20% 넓어집니다.', max: 4, apply: S => { S.rocketR *= 1.2; } },
  { id: 'salvo', group: '로켓 포드', name: '연발 로켓', desc: '한 번에 쏘는 로켓이 1발 늘어납니다.', max: 3, apply: S => { S.rockets += 1; } },
  { id: 'speed', group: '카피바라', name: '튼튼한 다리', desc: '이동과 돌진이 8% 빨라집니다.', max: 5, apply: S => { S.speed += 0.08; } },
  { id: 'hp', group: '카피바라', name: '두꺼운 가죽', desc: '최대 체력이 20 늘고 체력을 40 회복합니다.', max: 5, apply: (S, P) => { S.maxHp += 20; P.hp = Math.min(S.maxHp, P.hp + 40); } },
  { id: 'magnet', group: '카피바라', name: '귤 냄새 맡기', desc: '귤을 끌어오는 범위가 35% 넓어집니다.', max: 4, apply: S => { S.magnet *= 1.35; } },
  { id: 'stamina', group: '카피바라', name: '깊은 호흡', desc: '스태미나가 30% 빨리 찹니다.', max: 4, apply: S => { S.stReg *= 1.3; } },
  { id: 'ram', group: '카피바라', name: '단단한 머리', desc: '들이받기 피해가 6 늘어 탱커도 쉽게 날립니다.', max: 4, apply: S => { S.ramDmg += 6; } },
];

export function rollChoices(levels, n = 3) {
  const pool = UPGRADES.filter(u => (levels[u.id] || 0) < u.max && (!u.available || u.available(levels)));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, n);
}
export const xpForLevel = level => 4 + level * 3;
