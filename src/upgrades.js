// 레벨업 때 고르는 강화. S는 전투 수치, P는 플레이어 상태.
// 후반 스테이지 무기(강화 수트·제트팩·레이저)는 여기에 available 조건을 달아 추가한다.
export const BASE_STATS = () => ({
  fireCd: 0.075, dmg: 1, shots: 1, pierce: 0,
  rocketCd: 2.2, rocketR: 2.8, rockets: 1,
  speed: 1, maxHp: 100, magnet: 7, stReg: 0.22, ramDmg: 6,
  laser: 0, jet: 0, armor: 0,
  orbit: 0, drone: 0, chain: 0, fire: 0, frost: 0, leech: 0, crit: 0, critMul: 2.5, jump: 1, stompCd: 7, xpMul: 1,
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
  { id: 'orbit', group: '새 무기', name: '맴도는 귤', desc: '귤이 카피바라 주위를 돌며 닿는 좀비를 때립니다. 올릴수록 귤이 늘어납니다.', max: 4, apply: S => { S.orbit += 1; } },
  { id: 'drone', group: '새 무기', name: '오리 드론', desc: '작은 드론이 따라다니며 가까운 좀비를 알아서 쏩니다.', max: 4, apply: S => { S.drone += 1; } },
  { id: 'chain', group: '새 무기', name: '연쇄 번개', desc: '탄이 맞을 때 확률로 번개가 주변 좀비에게 옮겨붙습니다.', max: 4, apply: S => { S.chain += 1; } },
  { id: 'fire', group: '새 무기', name: '불타는 발자국', desc: '돌진한 자리에 불길이 남아 좀비를 태웁니다.', max: 3, apply: S => { S.fire += 1; } },
  { id: 'frost', group: '로켓 포드', name: '냉동 탄두', desc: '폭발에 휩쓸린 좀비가 얼어 느려집니다.', max: 3, apply: S => { S.frost += 1; } },
  { id: 'crit', group: '게틀링건', name: '급소 사격', desc: '치명타 확률이 12% 늘어납니다. 치명타는 2.5배 피해입니다.', max: 4, apply: S => { S.crit += 0.12; } },
  { id: 'leech', group: '카피바라', name: '귤즙 흡수', desc: '좀비를 처치할 때 가끔 체력을 2 회복합니다.', max: 3, apply: S => { S.leech += 1; } },
  // 후반 장비: 클리어한 전장 수(ctx.cleared)에 따라 카드에 등장한다
  { id: 'laser', group: '후반 장비', gear: 'laser', name: '레이저', desc: '사격 중 주기적으로 조준선 위의 좀비를 일렬로 꿰뚫습니다. 올릴수록 자주, 세게 쏩니다.', max: 3, available: c => c.cleared >= 1, apply: S => { S.laser += 1; } },
  { id: 'jet', group: '후반 장비', gear: 'jet', name: '제트팩', desc: '공중에서 Space를 누르고 있으면 스태미나로 날아오릅니다.', max: 1, available: c => c.cleared >= 2, apply: S => { S.jet = 1; } },
  { id: 'suit', group: '후반 장비', gear: 'suit', name: '강화 수트', desc: '기계 갑옷을 입어 받는 피해가 30% 줄고 들이받기 피해가 12 늘어납니다.', max: 1, available: c => c.cleared >= 3, apply: S => { S.armor = 0.3; S.ramDmg += 12; } },
];

export function rollChoices(levels, ctx = { cleared: 0 }, n = 3) {
  const pool = UPGRADES.filter(u => (levels[u.id] || 0) < u.max && (!u.available || u.available(ctx)));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, n);
}
export const xpForLevel = level => 8 + level * 8;
