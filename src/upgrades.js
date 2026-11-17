// 레벨업 때 고르는 강화. S는 전투 수치, P는 플레이어 상태.
// 후반 스테이지 무기(강화 수트·제트팩·레이저)는 여기에 available 조건을 달아 추가한다.
export const BASE_STATS = () => ({
  fireCd: 0.075, dmg: 1, shots: 1, pierce: 0,
  rocketCd: 2.2, rocketR: 2.8, rockets: 1,
  speed: 1, maxHp: 100, magnet: 7, stReg: 0.22, ramDmg: 6,
  laser: 0, jet: 0, armor: 0,
  orbit: 0, drone: 0, chain: 0, fire: 0, frost: 0, leech: 0, crit: 0, critMul: 2.5, jump: 1, stompCd: 7, xpMul: 1,
  ricochet: 0, explosive: 0, explosiveR: 1, thorns: 0, ultRate: 1, stompR: 1, stompDmg: 1, decoyUp: 0,
  homing: 0, freeze: 0, sun: 0, droneN: 1, chainAlways: 0, rushCost: 1, rushWave: 0, regen: 0, laserCdMul: 1, laserW: 1,
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
  { id: 'ricochet', group: '게틀링건', name: '도탄', desc: '탄이 맞은 뒤 근처의 다른 좀비에게 한 번 더 튑니다.', max: 3, apply: S => { S.ricochet += 1; } },
  { id: 'explosive', group: '게틀링건', name: '폭발탄', desc: '탄이 맞을 때 12% 확률로 작은 폭발을 일으킵니다. 방패도 뚫습니다.', max: 3, apply: S => { S.explosive += 1; } },
  { id: 'thorns', group: '카피바라', name: '가시 갑옷', desc: '몸에 닿은 좀비가 계속 피해를 입습니다.', max: 3, apply: S => { S.thorns += 1; } },
  { id: 'ultcharge', group: '카피바라', name: '귤 저장고', desc: '궁극기가 34% 더 빨리 충전됩니다.', max: 3, apply: S => { S.ultRate += 0.34; } },
  { id: 'stompUp', group: '카피바라', name: '지진 발굽', desc: '발 구르기의 반경이 20%, 피해가 60% 늘어납니다.', max: 3, apply: S => { S.stompR += 0.2; S.stompDmg += 0.6; } },
  { id: 'decoyUp', group: '카피바라', name: '왕귤 미끼', desc: '미끼 귤이 더 오래 버티고 더 크게 터집니다.', max: 3, apply: S => { S.decoyUp += 1; } },
  // 후반 장비: 클리어한 전장 수(ctx.cleared)에 따라 카드에 등장한다
  { id: 'laser', group: '후반 장비', gear: 'laser', name: '레이저', desc: '사격 중 주기적으로 조준선 위의 좀비를 일렬로 꿰뚫습니다. 올릴수록 자주, 세게 쏩니다.', max: 3, available: c => c.cleared >= 1, apply: S => { S.laser += 1; } },
  { id: 'jet', group: '후반 장비', gear: 'jet', name: '제트팩', desc: '공중에서 Space를 누르고 있으면 스태미나로 날아오릅니다.', max: 1, available: c => c.cleared >= 2, apply: S => { S.jet = 1; } },
  { id: 'suit', group: '후반 장비', gear: 'suit', name: '강화 수트', desc: '기계 갑옷을 입어 받는 피해가 30% 줄고 들이받기 피해가 12 늘어납니다.', max: 1, available: c => c.cleared >= 3, apply: S => { S.armor = 0.3; S.ramDmg += 12; } },
];

// 합성: 재료 두 가지가 필요한 레벨에 닿으면 합성 카드가 나온다. 재료는 그대로 남고 합성 효과가 더해진다.
export const FUSIONS = [
  { id: 'f_storm', name: '폭풍 게틀링', need: { rate: 3, crit: 2 }, desc: '발사 간격이 40% 더 줄고 탄이 1마리 더 꿰뚫습니다.', apply: S => { S.fireCd *= 0.6; S.pierce += 1; } },
  { id: 'f_shotgun', name: '산탄 포격', need: { multi: 2, pierce: 2 }, desc: '한 번에 쏘는 탄이 2발 늘고, 탄이 좀비를 끝없이 꿰뚫습니다.', apply: S => { S.shots += 2; S.pierce += 99; } },
  { id: 'f_cluster', name: '집속탄', need: { explosive: 2, ricochet: 2 }, desc: '폭발탄 확률이 두 배가 되고 폭발이 60% 커집니다.', apply: S => { S.explosive *= 2; S.explosiveR = 1.6; } },
  { id: 'f_missile', name: '미사일 폭풍', need: { reload: 3, salvo: 2 }, desc: '로켓이 좀비를 쫓아가고, 한 번에 2발 더 나갑니다.', apply: S => { S.homing = 1; S.rockets += 2; } },
  { id: 'f_glacier', name: '빙하 탄두', need: { radius: 2, frost: 2 }, desc: '폭발에 휩쓸린 좀비가 완전히 얼어붙고, 폭발 반경이 30% 넓어집니다.', apply: S => { S.freeze = 1; S.rocketR *= 1.3; } },
  { id: 'f_sun', name: '태양 귤', need: { orbit: 3, fire: 2 }, desc: '맴도는 귤이 불타는 태양이 됩니다. 더 넓게 돌고 피해가 3배입니다.', apply: S => { S.sun = 1; } },
  { id: 'f_squad', name: '번개 편대', need: { drone: 3, chain: 2 }, desc: '드론이 3발씩 쏘고, 드론의 탄은 항상 번개를 옮깁니다.', apply: S => { S.droneN = 3; S.chainAlways = 1; } },
  { id: 'f_tank', name: '카피바라 전차', need: { speed: 3, ram: 2 }, desc: '돌진 스태미나 소모가 절반이 되고, 들이받기 피해가 3배, 달리는 동안 충격파가 퍼집니다.', apply: S => { S.ramDmg *= 3; S.rushCost = 0.5; S.rushWave = 1; } },
  { id: 'f_immortal', name: '불사의 가죽', need: { hp: 3, leech: 2 }, desc: '최대 체력이 50 늘고 초당 2씩 저절로 회복합니다.', apply: (S, P) => { S.maxHp += 50; S.regen = 2; P.hp = Math.min(S.maxHp, P.hp + 50); } },
  { id: 'f_feast', name: '귤 회오리', need: { magnet: 2, stamina: 2 }, desc: '전장의 모든 귤이 날아오고 경험치를 25% 더 얻습니다.', apply: S => { S.magnet = 999; S.xpMul *= 1.25; } },
  { id: 'f_quake', name: '지진 가시', need: { stompUp: 2, thorns: 2 }, desc: '발 구르기 대기 시간이 절반이 되고 가시 피해가 2배가 됩니다.', apply: S => { S.stompCd *= 0.5; S.thorns *= 2; } },
  { id: 'f_sunbeam', name: '태양 광선', need: { laser: 2, dmg: 3 }, desc: '레이저 대기 시간이 절반이 되고 굵기가 2배가 됩니다.', apply: S => { S.laserCdMul = 0.5; S.laserW = 2; } },
];
export const nameOf = id => (UPGRADES.find(u => u.id === id) || FUSIONS.find(f => f.id === id) || { name: id }).name;
export const recipesWith = id => FUSIONS.filter(f => id in f.need);
export const recipeText = f => Object.entries(f.need).map(([k, v]) => `${nameOf(k)} ${v}`).join(' + ');

// 카드 3장을 뽑는다. 합성할 수 있는 것이 있으면 첫 장은 반드시 합성 카드다.
export function rollChoices(levels, ctx = { cleared: 0 }, n = 3) {
  const pool = UPGRADES.filter(u => (levels[u.id] || 0) < u.max && (!u.available || u.available(ctx)));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const out = pool.slice(0, n);
  const fus = FUSIONS.filter(f => !levels[f.id] && Object.entries(f.need).every(([k, v]) => (levels[k] || 0) >= v));
  if (fus.length) out[0] = { ...fus[0], group: '합성', max: 1, fusion: true };
  return out;
}
export const xpForLevel = level => Math.round(10 + level * 9 + level * level * 0.5);
