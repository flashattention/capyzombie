// 전체 랭킹: /api/scores 와 통신한다. 서버가 없거나(로컬 개발) 연결 전이면 null을 돌려준다.
// 웹에서는 같은 출처의 /api를 쓰고, 모바일 앱은 VITE_API_BASE(예: https://<배포 주소>)로 부른다.
import { t, num } from './i18n.js';
import { titleLabel } from './achievements.js';

const API = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '') + '/api/scores';
async function call(url, opts) {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 5000);
  try {
    const r = await fetch(url, { ...opts, signal: ctl.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; } finally { clearTimeout(timer); }
}
export const fetchTop = map => call(API + '?map=' + encodeURIComponent(map)).then(d => (d && d.top) || null);
export const submitRun = run => call(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(run) });

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DIFF_NAME = { easy: t('이지'), normal: t('노말'), hard: t('하드'), extreme: t('익스트림') };
const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
// 랭킹 목록을 host에 그린다. top이 null이면 연결 안내를 보여준다.
export function renderRank(host, top, limit = 5, me) {
  if (!top) { host.innerHTML = `<li class="none">${t('랭킹 서버에 연결할 수 없습니다.')}</li>`; return; }
  if (!top.length) { host.innerHTML = `<li class="none">${t('아직 기록이 없습니다. 첫 번째 주인공이 되어 보세요.')}</li>`; return; }
  // 1위 금, 2위 은, 3위 동 메달. 닉네임 앞에 그 유저가 고른 칭호를 붙인다.
  host.innerHTML = top.slice(0, limit).map((r, i) => {
    const title = titleLabel(r.titleId, r.title), name = r.name || t('이름 없음');
    const info = [DIFF_NAME[r.diff] || DIFF_NAME.normal, t('{n}마리', { n: r.kills }), fmt(r.time)];
    if (r.cleared) info.push(t('클리어'));
    return `<li${me && r.name === me ? ' class="me"' : ''}><span class="no${i < 3 ? ' medal m' + i : ''}">${i + 1}</span><span class="nm">${title ? `<i class="ttl">${esc(title)}</i> ` : ''}${esc(name)}</span><span class="sc">${t('{n}점', { n: num(r.score) })}</span><span class="dt">${info.join(' · ')}</span></li>`;
  }).join('');
}
