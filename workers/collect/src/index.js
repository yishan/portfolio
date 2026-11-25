// yishan.li 的数据收集 Worker。
// 定时任务（见 wrangler.jsonc）：
//   hourly          最近播放 + 补几位艺人的流派 + 重算 listen.json
//   spotify-daily   榜单快照，生成 listen.json
//   weread-daily    微信读书，生成 read.json
// HTTP：
//   GET  /health                    健康检查（公开）
//   GET  /listen.json、/read.json   公开，主站 SSR 按需读取
//   GET  /status                    最近的运行记录（需要 token）
//   POST /run/<任务名>               手动跑一次（需要 token）
//   GET  /export/plays.jsonl         完整播放历史，备份用（需要 token）
import { kvGet, kvSet, logRun } from './db.js';
import { fetchPlays, snapshotTop, AuthError } from './spotify.js';
import { lookupGenres } from './genres.js';
import { buildListen } from './listen.js';
import { buildRead } from './weread.js';

const TASKS = {
  async hourly(env) {
    const plays = await fetchPlays(env);
    // MusicBrainz 偶尔出错不影响播放记录
    const genres = await lookupGenres(env).catch((e) => ({ error: e.message }));
    const listen = await buildListen(env);
    await kvSet(env.DB, 'listen.json', JSON.stringify(listen));
    return { ...plays, genres, total_plays: listen.plays };
  },
  async 'spotify-daily'(env) {
    const snap = await snapshotTop(env);
    const listen = await buildListen(env);
    await kvSet(env.DB, 'listen.json', JSON.stringify(listen));
    return { ...snap, plays: listen.plays, days: listen.daily.length, snapshots: listen.trend.dates.length };
  },
  async 'weread-daily'(env) {
    const read = await buildRead(env);
    await kvSet(env.DB, 'read.json', JSON.stringify(read));
    return { hours: Math.round(read.total_s / 3600), days: read.daily.length };
  },
};

const CRONS = { '10 * * * *': 'hourly', '20 16 * * *': 'spotify-daily', '30 16 * * *': 'weread-daily' };

async function run(env, task) {
  try {
    const result = await TASKS[task](env);
    await logRun(env.DB, task, true, JSON.stringify(result));
    return { ok: true, task, result };
  } catch (e) {
    const note = `${e instanceof AuthError ? 'AUTH ' : ''}${e.message}`;
    await logRun(env.DB, task, false, note);
    return { ok: false, task, error: note };
  }
}

const json = (body, status = 200, extra = {}) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body, null, 1), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra },
  });

const authorized = (req, env) => Boolean(env.ADMIN_TOKEN) && req.headers.get('Authorization') === `Bearer ${env.ADMIN_TOKEN}`;

export default {
  async scheduled(event, env, ctx) {
    const task = CRONS[event.cron];
    if (task) ctx.waitUntil(run(env, task));
  },

  async fetch(req, env) {
    const { pathname } = new URL(req.url);

    if (req.method === 'GET' && pathname === '/health') {
      return json({ ok: true });
    }

    if (req.method === 'GET' && (pathname === '/listen.json' || pathname === '/read.json')) {
      const body = await kvGet(env.DB, pathname.slice(1));
      if (!body) return json({ error: 'not built yet' }, 404);
      return json(body, 200, { 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*' });
    }

    if (!authorized(req, env)) return json({ error: 'not found' }, 404);

    if (req.method === 'POST' && pathname.startsWith('/run/')) {
      const task = pathname.slice(5);
      if (!TASKS[task]) return json({ error: `unknown task, one of: ${Object.keys(TASKS).join(', ')}` }, 400);
      const result = await run(env, task);
      return json(result, result.ok ? 200 : 500);
    }

    if (req.method === 'GET' && pathname === '/status') {
      const { results } = await env.DB.prepare('SELECT * FROM runs ORDER BY at DESC LIMIT 30').all();
      const counts = await env.DB.prepare(
        'SELECT (SELECT count(*) FROM plays) AS plays, (SELECT max(played_at) FROM plays) AS last_play, (SELECT count(*) FROM snapshots) AS snapshots, (SELECT count(*) FROM genres WHERE checked IS NULL) AS genres_pending',
      ).first();
      return json({ ...counts, runs: results });
    }

    if (req.method === 'GET' && pathname === '/export/plays.jsonl') {
      const { results } = await env.DB.prepare('SELECT played_at, track, context_type FROM plays ORDER BY played_at').all();
      const lines = results.map((r) =>
        JSON.stringify({ played_at: r.played_at, track: JSON.parse(r.track), context: r.context_type ? { type: r.context_type } : null }),
      );
      return new Response(lines.join('\n') + '\n', { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' } });
    }

    return json({ error: 'not found' }, 404);
  },
};
