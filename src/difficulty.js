// 난이도 4단계. 좀비 체력·공격력·출현 수·정예 비율과 체력 물약 주기, 랭킹 점수 배율을 바꾼다.
// api/scores.js의 SCORE_MULT와 배율을 맞춰야 한다.
import { t } from './i18n.js';

export const DIFFS = [
  { id: 'easy', name: t('이지'), desc: t('가볍게 즐기는 난이도. 좀비가 약하고 적게 나오며 물약이 자주 생깁니다. 랭킹 점수 ×0.5'), hp: 0.55, dmg: 0.45, spawn: 0.65, elite: -0.02, potion: 9, bossCd: 1.4, score: 0.5 },
  { id: 'normal', name: t('노말'), desc: t('잘 해야 깨는 기본 난이도. 랭킹 점수 ×1'), hp: 1, dmg: 1, spawn: 1, elite: 0, potion: 16, bossCd: 1, score: 1 },
  { id: 'hard', name: t('하드'), desc: t('정말 잘해야 깨는 난이도. 좀비가 단단하고 아프고 많습니다. 랭킹 점수 ×1.5'), hp: 1.55, dmg: 1.45, spawn: 1.3, elite: 0.03, potion: 22, bossCd: 0.85, score: 1.5 },
  { id: 'extreme', name: t('익스트림'), desc: t('깨기 엄청 어려운 난이도. 정예가 쏟아지고 보스가 쉴 틈 없이 공격합니다. 랭킹 점수 ×2.5'), hp: 2.4, dmg: 2.1, spawn: 1.65, elite: 0.08, potion: 30, bossCd: 0.65, score: 2.5 },
];
export const getDiff = id => DIFFS.find(d => d.id === id) || DIFFS[1];
