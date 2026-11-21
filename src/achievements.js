// 업적, 메달, 칭호.
// 업적은 누적 통계(progress.stats)에서 계산한다. 업적마다 메달 등급(동·은·금·백금)이 있고,
// 칭호는 메달 수, 특정 업적, 전체 랭킹 순위로 얻는다.
import { MAPS } from './maps.js';
import { RIDERS } from './models/riders.js';
import { FUSIONS } from './upgrades.js';
import { loadProgress, saveProgress } from './save.js';
import { t, num as fmtNum } from './i18n.js';

export const TIER = [{ id: 'b', name: t('동') }, { id: 's', name: t('은') }, { id: 'g', name: t('금') }, { id: 'p', name: t('백금') }];
const ROLES = ['기본', '러너', '탱커', '폭탄', '원거리', '도약', '방패', '치유', '분열', '돌격', '떼', '맹독'];

export const blankStats = () => ({
  kills: 0, boss: 0, elite: 0, ram: 0, rocket: 0, bestCombo: 0, bestLevel: 0, roles: {},
  time: 0, runs: 0, deaths: 0, bestTime: 0, clears: 0,
  fusions: 0, crates: 0, potions: 0, hearts: 0, pads: 0, gems: 0,
  clearedMaps: [], riders: [], fusionSet: [], diffClears: {},
});
const diffMaps = (s, d) => (s.diffClears && s.diffClears[d]) || [];
const num = n => fmtNum(n);

// 단계형 업적: 같은 통계를 네 단계로 나눠 동·은·금·백금 메달을 준다
const fam = (id, cat, names, get, steps, text, show = num) => steps.map((n, i) => ({
  id: `${id}_${i}`, fam: id, cat, tier: i, name: names[i], desc: text(show(n)), goal: n, get,
}));
// 단일 업적
const one = (id, cat, tier, name, desc, ok) => ({ id, cat, tier, name, desc, goal: 1, get: s => (ok(s) ? 1 : 0) });
const mins = n => num(Math.round(n / 60));

export const ACHS = [
  // ── 전투 ──
  ...fam('kills', t('전투'), [t('좀비 사냥 입문'), t('좀비 사냥꾼'), t('만 마리 사냥꾼'), t('오만 마리의 악몽')], s => s.kills, [100, 1000, 10000, 50000], n => t('좀비를 누적 {n}마리 처치', { n })),
  ...fam('boss', t('전투'), [t('첫 보스'), t('보스 사냥꾼'), t('보스 킬러'), t('보스들의 천적')], s => s.boss, [1, 10, 50, 200], n => t('보스를 누적 {n}마리 처치', { n })),
  ...fam('elite', t('전투'), [t('금빛 사냥'), t('정예 사냥꾼'), t('정예 학살자'), t('황금 수집가')], s => s.elite, [5, 50, 300, 1500], n => t('금빛 정예 좀비를 누적 {n}마리 처치', { n })),
  ...fam('ram', t('전투'), [t('들이받기 입문'), t('볼링 선수'), t('볼링의 신'), t('카피바라 불도저')], s => s.ram, [20, 200, 1500, 8000], n => t('돌진으로 좀비를 누적 {n}마리 날려 버리기', { n })),
  ...fam('rocket', t('전투'), [t('첫 폭발'), t('폭파 전문가'), t('폭파광'), t('걸어 다니는 무기고')], s => s.rocket, [20, 200, 1500, 8000], n => t('로켓으로 좀비를 누적 {n}마리 처치', { n })),
  ...fam('combo', t('전투'), [t('손이 풀렸다'), t('끊기지 않는 연속'), t('멈추지 않는 자'), t('연속의 화신')], s => s.bestCombo, [50, 150, 400, 1000], n => t('한 판에서 {n} 연속 처치', { n })),
  ...fam('level', t('전투'), [t('쑥쑥 자라는 중'), t('성장의 맛'), t('귤 먹는 하마'), t('끝없는 성장')], s => s.bestLevel, [10, 20, 30, 45], n => t('한 판에서 레벨 {n} 달성', { n })),
  // ── 좀비 도감: 역할별 처치 ──
  ...ROLES.flatMap(r => fam('role_' + r, t('좀비 도감'), [t('{role} 좀비 관찰', { role: t(r) }), t('{role} 좀비 연구', { role: t(r) }), t('{role} 좀비 전문가', { role: t(r) }), t('{role} 좀비 박사', { role: t(r) })], s => s.roles[r] || 0, r === '기본' || r === '러너' || r === '떼' ? [50, 500, 4000, 20000] : [25, 250, 2000, 10000], n => t('{role} 좀비를 누적 {n}마리 처치', { role: t(r), n }))),
  // ── 생존 ──
  ...fam('time', t('생존'), [t('몸풀기'), t('전장의 단골'), t('전장의 터줏대감'), t('전장에 사는 자')], s => s.time, [600, 3600, 18000, 72000], n => t('누적 {n}분 생존', { n }), mins),
  ...fam('best', t('생존'), [t('2분 버티기'), t('4분 버티기'), t('8분 버티기'), t('15분 버티기')], s => s.bestTime, [120, 240, 480, 900], n => t('한 판에서 {n}분 생존', { n }), mins),
  ...fam('runs', t('생존'), [t('출근 도장'), t('성실한 라이더'), t('출근왕'), t('개근상')], s => s.runs, [5, 25, 100, 400], n => t('{n}판 플레이', { n })),
  ...fam('deaths', t('생존'), [t('처음 쓰러진 날'), t('칠전팔기'), t('오뚝이'), t('불굴의 카피바라')], s => s.deaths, [1, 10, 50, 200], n => t('{n}번 쓰러지고도 다시 도전', { n })),
  // ── 수집 ──
  ...fam('fusions', t('수집'), [t('첫 합성'), t('합성 견습생'), t('합성 장인'), t('합성의 대가')], s => s.fusions, [1, 10, 40, 150], n => t('무기 합성 누적 {n}회', { n })),
  ...fam('crates', t('수집'), [t('보급 받기'), t('보급 담당'), t('보급 대장'), t('보급의 신')], s => s.crates, [3, 20, 80, 300], n => t('보급 상자 누적 {n}개 획득', { n })),
  ...fam('potions', t('수집'), [t('한 모금'), t('물약 애호가'), t('물약 중독'), t('물약 감별사')], s => s.potions, [3, 25, 100, 400], n => t('체력 물약 누적 {n}개 사용', { n })),
  ...fam('hearts', t('수집'), [t('붉은 귤 한 알'), t('붉은 귤 바구니'), t('붉은 귤 과수원'), t('붉은 귤 농장주')], s => s.hearts, [10, 80, 400, 1500], n => t('체력 귤 누적 {n}개 획득', { n })),
  ...fam('gems', t('수집'), [t('귤 한 봉지'), t('귤 한 상자'), t('귤 부자'), t('귤 재벌')], s => s.gems, [200, 2000, 15000, 80000], n => t('경험치 귤 누적 {n}개 획득', { n })),
  ...fam('pads', t('수집'), [t('폴짝'), t('점프 중독'), t('점프왕'), t('하늘을 나는 카피바라')], s => s.pads, [10, 80, 400, 1500], n => t('점프대 누적 {n}번 사용', { n })),
  // ── 정복 ──
  ...fam('clears', t('정복'), [t('첫 클리어'), t('클리어 수집가'), t('전장의 지배자'), t('클리어의 화신')], s => s.clears, [1, 6, 20, 60], n => t('전장 클리어 누적 {n}회', { n })),
  ...MAPS.map(m => one('clear_' + m.id, t('정복'), 2, t('{map} 클리어', { map: m.name }), t('{map}의 보스 셋을 모두 처치', { map: m.name }), s => s.clearedMaps.includes(m.id))),
  one('clear_all', t('정복'), 3, t('여섯 전장의 정복자'), t('모든 전장을 클리어'), s => MAPS.every(m => s.clearedMaps.includes(m.id))),
  one('diff_easy', t('정복'), 0, t('이지 클리어'), t('이지 난이도로 전장 하나를 클리어'), s => diffMaps(s, 'easy').length > 0),
  one('diff_normal', t('정복'), 1, t('노말 클리어'), t('노말 난이도로 전장 하나를 클리어'), s => diffMaps(s, 'normal').length > 0),
  one('diff_hard', t('정복'), 2, t('하드 클리어'), t('하드 난이도로 전장 하나를 클리어'), s => diffMaps(s, 'hard').length > 0),
  one('diff_extreme', t('정복'), 3, t('익스트림 클리어'), t('익스트림 난이도로 전장 하나를 클리어'), s => diffMaps(s, 'extreme').length > 0),
  one('all_normal', t('정복'), 2, t('노말 완전 정복'), t('노말 난이도로 모든 전장을 클리어'), s => MAPS.every(m => diffMaps(s, 'normal').includes(m.id))),
  one('all_hard', t('정복'), 3, t('하드 완전 정복'), t('하드 난이도로 모든 전장을 클리어'), s => MAPS.every(m => diffMaps(s, 'hard').includes(m.id))),
  one('all_extreme', t('정복'), 3, t('익스트림 완전 정복'), t('익스트림 난이도로 모든 전장을 클리어'), s => MAPS.every(m => diffMaps(s, 'extreme').includes(m.id))),
  // ── 라이더 ──
  ...RIDERS.map(r => one('rider_' + r.id, t('라이더'), 0, t('{rider}와 함께', { rider: r.label }), t('{rider} 라이더로 한 판 플레이', { rider: r.label }), s => s.riders.includes(r.id))),
  one('rider_all', t('라이더'), 2, t('동물 애호가'), t('모든 라이더로 한 판씩 플레이'), s => RIDERS.every(r => s.riders.includes(r.id))),
  // ── 합성 도감 ──
  ...FUSIONS.map(f => one('fusion_' + f.id, t('합성 도감'), 1, t('{fusion} 완성', { fusion: f.name }), t('{fusion}을(를) 합성', { fusion: f.name }), s => s.fusionSet.includes(f.id))),
  one('fusion_all', t('합성 도감'), 3, t('합성 박사'), t('모든 합성을 한 번씩 완성'), s => FUSIONS.every(f => s.fusionSet.includes(f.id))),
];
export const CATS = [...new Set(ACHS.map(a => a.cat))];

export const unlockedIds = stats => ACHS.filter(a => a.get(stats) >= a.goal).map(a => a.id);
export function medalCount(ids) {
  const set = new Set(ids), c = [0, 0, 0, 0];
  ACHS.forEach(a => { if (set.has(a.id)) c[a.tier]++; });
  return c; // [동, 은, 금, 백금]
}

// ── 칭호 ──
// ok(ctx): ctx = { has(업적 id), medals: [동,은,금,백금], total: 메달 합, rank: { 전장 id: 최고 순위 } }
const byMedals = (n, name) => ({ id: 't_m' + n, name, how: t('메달 {n}개 획득', { n }), ok: c => c.total >= n });
const byAch = (ach, name) => { const a = ACHS.find(x => x.id === ach); return { id: 't_' + ach, name, how: t('업적 「{ach}」 달성', { ach: a.name }), ok: c => c.has(ach) }; };
export const TITLES = [
  { id: 't_new', name: t('새내기 라이더'), how: t('처음부터 가진 칭호'), ok: () => true },
  byMedals(5, t('귤 수집가')), byMedals(15, t('좀비 청소부')), byMedals(30, t('카피바라 기수')), byMedals(50, t('전장의 베테랑')),
  byMedals(80, t('학살의 달인')), byMedals(110, t('전설의 라이더')), byMedals(ACHS.length, t('카피좀비 마스터')),
  { id: 't_gold10', name: t('황금 귤'), how: t('금메달 10개 획득'), ok: c => c.medals[2] >= 10 },
  { id: 't_plat5', name: t('백금 발굽'), how: t('백금메달 5개 획득'), ok: c => c.medals[3] >= 5 },
  { id: 't_plat20', name: t('백금 군주'), how: t('백금메달 20개 획득'), ok: c => c.medals[3] >= 20 },
  byAch('kills_2', t('만 마리 사냥꾼')), byAch('kills_3', t('오만 마리의 악몽')), byAch('boss_2', t('보스 킬러')), byAch('boss_3', t('보스들의 천적')),
  byAch('elite_2', t('정예 학살자')), byAch('ram_2', t('볼링의 신')), byAch('ram_3', t('카피바라 불도저')), byAch('rocket_2', t('폭파광')),
  byAch('combo_2', t('멈추지 않는 자')), byAch('combo_3', t('연속의 화신')), byAch('level_3', t('끝없는 성장')),
  byAch('time_2', t('전장의 터줏대감')), byAch('best_3', t('15분의 기적')), byAch('runs_2', t('출근왕')), byAch('deaths_2', t('오뚝이')),
  byAch('fusions_2', t('합성 장인')), byAch('potions_2', t('물약 중독')), byAch('pads_2', t('점프왕')), byAch('gems_3', t('귤 재벌')),
  byAch('diff_hard', t('하드 돌파자')), byAch('all_hard', t('하드의 지배자')), byAch('diff_extreme', t('익스트림 생존자')), byAch('all_extreme', t('익스트림 정복자')),
  byAch('rider_all', t('동물 애호가')), byAch('fusion_all', t('합성 박사')), byAch('clear_all', t('여섯 전장의 정복자')),
  ...MAPS.map(m => ({ id: 't_clear_' + m.id, name: t('{map} 해방자', { map: m.name }), how: t('{map} 클리어', { map: m.name }), ok: c => c.has('clear_' + m.id) })),
  // 전체 랭킹 순위로 얻는 칭호 (기록을 올렸을 때의 순위 기준, 한 번 얻으면 유지)
  ...MAPS.flatMap(m => [
    { id: 't_r10_' + m.id, name: t('{map} 십걸', { map: m.name }), how: t('{map} 전체 랭킹 10위 안', { map: m.name }), rank: true, ok: c => (c.rank[m.id] || 99) <= 10 },
    { id: 't_r3_' + m.id, name: t('{map} 삼대장', { map: m.name }), how: t('{map} 전체 랭킹 3위 안', { map: m.name }), rank: true, ok: c => (c.rank[m.id] || 99) <= 3 },
    { id: 't_r1_' + m.id, name: t('{map}의 전설', { map: m.name }), how: t('{map} 전체 랭킹 1위', { map: m.name }), rank: true, ok: c => (c.rank[m.id] || 99) <= 1 },
  ]),
];

function normalize(p) {
  p.stats = Object.assign(blankStats(), p.stats); p.stats.roles = p.stats.roles || {};
  if (!p.stats.diffClears || typeof p.stats.diffClears !== 'object') p.stats.diffClears = {};
  ['clearedMaps', 'riders', 'fusionSet'].forEach(k => { if (!Array.isArray(p.stats[k])) p.stats[k] = []; });
  // 업적 시스템이 생기기 전에 클리어한 전장도 인정한다
  (p.cleared || []).forEach(id => { if (!p.stats.clearedMaps.includes(id)) p.stats.clearedMaps.push(id); });
  p.stats.clears = Math.max(p.stats.clears, p.stats.clearedMaps.length);
  p.ach = Array.isArray(p.ach) ? p.ach : [];
  p.rankBest = p.rankBest && typeof p.rankBest === 'object' ? p.rankBest : {};
  p.titlesSeen = Array.isArray(p.titlesSeen) ? p.titlesSeen : [];
  return p;
}
// 현재 상태: 업적, 메달, 칭호, 선택한 칭호
export function getState(p = loadProgress()) {
  normalize(p);
  const ids = unlockedIds(p.stats), set = new Set(ids), medals = medalCount(ids);
  const ctx = { has: id => set.has(id), medals, total: ids.length, rank: p.rankBest };
  const titles = TITLES.filter(t => t.ok(ctx));
  const chosen = titles.find(t => t.id === p.title) || titles[titles.length > 1 ? 0 : 0];
  return { progress: p, stats: p.stats, ids, set, medals, total: ids.length, titles, title: chosen, rankBest: p.rankBest };
}
export const titleName = () => getState().title.name;
export const titleId = () => getState().title.id;
// 랭킹에 저장된 칭호를 지금 언어로 보여 준다. 칭호 id가 없던 옛 기록은 저장된 이름 그대로.
export const titleLabel = (id, fallback) => (TITLES.find(x => x.id === id) || { name: fallback || '' }).name;
export function chooseTitle(id) { const p = loadProgress(); p.title = id; saveProgress(p); }

// 새로 달성한 업적과 칭호를 찾아 저장하고 돌려준다
function diff(p) {
  const st = getState(p);
  const newAch = st.ids.filter(id => !p.ach.includes(id)).map(id => ACHS.find(a => a.id === id));
  const newTitles = st.titles.filter(t => !p.titlesSeen.includes(t.id) && t.id !== 't_new');
  p.ach = st.ids; p.titlesSeen = st.titles.map(t => t.id);
  saveProgress(p);
  return { newAch, newTitles, state: st };
}
// 한 판(또는 그 일부)의 결과를 누적 통계에 더한다
export function commitRun(run) {
  const p = normalize(loadProgress()), s = p.stats;
  ['kills', 'boss', 'elite', 'ram', 'rocket', 'crates', 'potions', 'hearts', 'pads', 'gems', 'time'].forEach(k => { s[k] += Math.max(0, run[k] || 0); });
  Object.entries(run.roles || {}).forEach(([k, v]) => { s.roles[k] = (s.roles[k] || 0) + v; });
  s.fusions += (run.fusions || []).length; (run.fusions || []).forEach(id => { if (!s.fusionSet.includes(id)) s.fusionSet.push(id); });
  s.bestCombo = Math.max(s.bestCombo, run.combo || 0); s.bestLevel = Math.max(s.bestLevel, run.level || 0); s.bestTime = Math.max(s.bestTime, run.runTime || 0);
  if (run.first) { s.runs++; if (run.animal && !s.riders.includes(run.animal)) s.riders.push(run.animal); }
  if (run.died) s.deaths++;
  if (run.cleared) {
    s.clears++; if (!s.clearedMaps.includes(run.map)) s.clearedMaps.push(run.map);
    const d = run.diff || 'normal'; s.diffClears[d] = s.diffClears[d] || []; if (!s.diffClears[d].includes(run.map)) s.diffClears[d].push(run.map);
  }
  return diff(p);
}
// 랭킹 순위를 기록하고, 새로 얻은 순위 칭호를 돌려준다
export function awardRank(mapId, rank) {
  const p = normalize(loadProgress());
  if (rank && (!p.rankBest[mapId] || rank < p.rankBest[mapId])) p.rankBest[mapId] = rank;
  return diff(p);
}
// 순위 메달: 1위 금, 2~3위 은, 4~10위 동
export const rankMedal = rank => (rank === 1 ? 2 : rank <= 3 ? 1 : rank <= 10 ? 0 : -1);
