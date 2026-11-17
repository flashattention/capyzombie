// 전장별 전체 랭킹 API (Vercel 서버리스 함수).
// 저장소는 Upstash Redis(REST)를 쓴다. Vercel 프로젝트에 Upstash Redis(KV) 연동을 추가하면
// KV_REST_API_URL / KV_REST_API_TOKEN 환경 변수가 자동으로 들어온다. 없으면 503을 돌려준다.
const MAPS = ['farm', 'city', 'desert', 'candy', 'onsen', 'grave'];
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(commands) {
  const r = await fetch(`${URL_}/pipeline`, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(commands) });
  if (!r.ok) throw new Error('redis ' + r.status);
  return (await r.json()).map(x => x.result);
}
// 점수는 서버에서 계산한다: 처치 10점, 생존 1초 2점, 클리어 500점
const scoreOf = (kills, time, cleared) => kills * 10 + Math.floor(time) * 2 + (cleared ? 500 : 0);
const cleanName = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12);

async function top(map, n = 20) {
  const [ids] = await redis([['ZRANGE', `lb:${map}`, 0, n - 1, 'REV', 'WITHSCORES']]);
  if (!ids || !ids.length) return [];
  const keys = ids.filter((_, i) => i % 2 === 0);
  const [details] = await redis([['HMGET', `lbd:${map}`, ...keys]]);
  return keys.map((id, i) => { let d = {}; try { d = JSON.parse(details[i]) || {}; } catch (e) { /* 무시 */ } return { name: d.name || '이름 없음', score: +ids[i * 2 + 1], kills: d.kills || 0, time: d.time || 0, level: d.level || 1, animal: d.animal || 'duck', cleared: !!d.cleared }; });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!URL_ || !TOKEN) return res.status(503).json({ error: 'not_configured' });
  try {
    if (req.method === 'GET') {
      const map = String(req.query.map || '');
      if (!MAPS.includes(map)) return res.status(400).json({ error: 'bad_map' });
      return res.status(200).json({ top: await top(map) });
    }
    if (req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const map = String(b.map || ''), id = String(b.id || ''), name = cleanName(b.name);
      const kills = Math.floor(+b.kills), time = +b.time, level = Math.floor(+b.level) || 1;
      // 말이 안 되는 기록은 받지 않는다 (초당 처치 수 상한 등). 클라이언트가 보내는 값이라 완전한 부정 방지는 아니다.
      if (!MAPS.includes(map) || !/^[a-z0-9-]{8,40}$/i.test(id) || name.length < 2 || !(kills >= 0) || !(time > 0) || time > 36000 || kills > time * 25 + 50 || level > 400) return res.status(400).json({ error: 'bad_run' });
      const score = scoreOf(kills, time, !!b.cleared);
      const [old] = await redis([['ZSCORE', `lb:${map}`, id]]);
      const detail = JSON.stringify({ name, kills, time: Math.floor(time), level, animal: String(b.animal || 'duck').slice(0, 12), cleared: !!b.cleared });
      if (old == null || score > +old) await redis([['ZADD', `lb:${map}`, score, id], ['HSET', `lbd:${map}`, id, detail]]);
      else await redis([['HGET', `lbd:${map}`, id]]).then(async ([d]) => { // 닉네임만 바뀐 경우 반영
        try { const o = JSON.parse(d); if (o && o.name !== name) { o.name = name; await redis([['HSET', `lbd:${map}`, id, JSON.stringify(o)]]); } } catch (e) { /* 무시 */ }
      });
      const [rank] = await redis([['ZREVRANK', `lb:${map}`, id]]);
      return res.status(200).json({ rank: rank == null ? null : rank + 1, score, best: Math.max(score, +old || 0), top: await top(map, 10) });
    }
    return res.status(405).json({ error: 'method' });
  } catch (e) {
    return res.status(500).json({ error: 'server' });
  }
}
