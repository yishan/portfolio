// /listen 页的数据（listen.json）：只放汇总——每天的播放数、星期 × 小时的格子、计数和名次，
// 不放精确到分钟的播放时间和账号信息。统计尽量交给 D1 的 SQL，Worker 自己少算。
import { beijingDay } from './db.js';

const TERMS = ['short_term', 'medium_term', 'long_term'];
const BJ = "'+8 hours'";

// 细分流派按关键词归到大类，先匹配先得
const FAMILIES = [
  ['rock', '摇滚', /rock|punk|grunge|metal|shoegaze|emo\b|post-hardcore|psychedel|new wave/],
  ['hiphop', '嘻哈', /hip hop|rap|trap|drill|grime/],
  ['rnb', '节奏布鲁斯 · 灵魂', /r&b|soul|funk|motown|gospel|neo soul/],
  ['blues', '布鲁斯', /blues/],
  ['jazz', '爵士', /jazz|swing|bebop|bossa nova/],
  ['folk', '民谣 · 乡村', /folk|country|americana|bluegrass|singer-songwriter/],
  ['latin', '拉丁', /latin|reggaeton|cumbia|salsa|bachata|samba|mpb|dembow|merengue|tango|corrido|regional mexican/],
  ['electronic', '电子', /house|techno|electro|edm|dance|trance|dubstep|drum and bass|ambient|downtempo|synth|disco|breakbeat|idm|folktronica|chillout|trip hop/],
  ['pop', '流行', /pop/],
  ['world', '各地音乐', /arab|raï|dabke|afro|canzone|chanson|flamenco|celtic|fado|mizrahi|gnawa|maghreb|balkan|klezmer|reggae|ska\b|world|chinese|cantonese/],
  ['classical', '古典 · 配乐', /classical|orchestral|baroque|opera|soundtrack|score|minimalism|symphon/],
];
// 以 pop 结尾的（dance-pop、synth-pop、electropop）算流行，不算电子
const familyOf = (genre) =>
  FAMILIES.find(([key, , re]) => (key === 'electronic' && /pop$/.test(genre) ? false : re.test(genre)))?.[0] ?? 'other';

// 每位艺人取票数够多的前几个标签，按票数分摊，合计算一位艺人
function artistFamilies(tags) {
  if (!tags?.length) return null;
  const keep = tags.filter((g) => g.count >= Math.max(1, tags[0].count * 0.25)).slice(0, 4);
  const total = keep.reduce((s, g) => s + g.count, 0);
  const w = {};
  for (const g of keep) {
    const f = familyOf(g.name);
    w[f] = (w[f] ?? 0) + g.count / total;
  }
  return w;
}

const year = (date) => (date ? Number(date.slice(0, 4)) : null);
const isrcCC = (isrc) => (isrc ? isrc.slice(0, 2).toUpperCase() : null);

export async function buildListen(env) {
  const db = env.DB;
  const [totals, artistCount, days, week, artistPlays, sources, latestRow, dates] = await db.batch([
    db.prepare('SELECT count(*) AS plays, count(DISTINCT track_id) AS tracks FROM plays'),
    db.prepare("SELECT count(DISTINCT json_extract(a.value, '$.id')) AS n FROM plays, json_each(plays.track, '$.artists') AS a"),
    db.prepare(`SELECT date(played_at, ${BJ}) AS d, count(*) AS c FROM plays GROUP BY d ORDER BY d`),
    // 星期（周一 = 0）× 小时
    db.prepare(
      `SELECT (CAST(strftime('%w', played_at, ${BJ}) AS INTEGER) + 6) % 7 AS w, CAST(strftime('%H', played_at, ${BJ}) AS INTEGER) AS h, count(*) AS c FROM plays GROUP BY w, h`,
    ),
    // 合作曲目给每位署名艺人各记一次
    db.prepare(
      "SELECT json_extract(a.value, '$.id') AS id, json_extract(a.value, '$.name') AS name, count(*) AS count FROM plays, json_each(plays.track, '$.artists') AS a GROUP BY id ORDER BY count DESC, name LIMIT 15",
    ),
    db.prepare("SELECT coalesce(context_type, 'direct') AS k, count(*) AS c FROM plays GROUP BY k"),
    db.prepare('SELECT date, data FROM snapshots ORDER BY date DESC LIMIT 1'),
    db.prepare('SELECT date FROM snapshots ORDER BY date'),
  ]);

  // 每天的播放数：从第一条记录到今天逐日排开，没听的日子记 0
  const byDay = new Map(days.results.map((r) => [r.d, r.c]));
  const today = beijingDay();
  const daily = [];
  if (days.results.length) {
    for (let d = new Date(`${days.results[0].d}T00:00:00Z`); d.toISOString().slice(0, 10) <= today; d.setUTCDate(d.getUTCDate() + 1)) {
      const k = d.toISOString().slice(0, 10);
      daily.push({ date: k, count: byDay.get(k) ?? 0 });
    }
  }
  const weekGrid = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const r of week.results) weekGrid[r.w][r.h] = r.c;

  const latest = latestRow.results[0] && JSON.parse(latestRow.results[0].data);
  const top = latest && {
    artists: Object.fromEntries(TERMS.map((t) => [t, latest.artists[t].map(({ rank, id, name }) => ({ rank, id, name }))])),
    tracks: Object.fromEntries(
      TERMS.map((t) => [
        t,
        latest.tracks[t].map((x) => ({
          rank: x.rank,
          id: x.id,
          name: x.name,
          artists: x.artists.map((a) => a.name),
          year: year(x.release_date),
          cc: isrcCC(x.isrc),
        })),
      ]),
    ),
  };

  // 名次走势：每天短期艺人榜的名次，只留最新一天前 10 名的艺人
  const trendDates = dates.results.map((r) => r.date);
  const trendArtists = latest ? latest.artists.short_term.slice(0, 10) : [];
  let trend = { dates: trendDates, artists: [] };
  if (trendArtists.length) {
    const ids = trendArtists.map((a) => a.id);
    const { results } = await db
      .prepare(`SELECT date, artist_id, rank FROM ranks WHERE artist_id IN (${ids.map(() => '?').join(',')})`)
      .bind(...ids)
      .all();
    const rank = new Map(results.map((r) => [`${r.date}|${r.artist_id}`, r.rank]));
    trend.artists = trendArtists.map((a) => ({ id: a.id, name: a.name, ranks: trendDates.map((d) => rank.get(`${d}|${a.id}`) ?? null) }));
  }

  // 流派：三个时段里每一类艺人的占比
  let genres = null;
  if (latest) {
    const ids = [...new Set(TERMS.flatMap((t) => latest.artists[t].map((a) => a.id)))];
    const { results } = await db
      .prepare(`SELECT artist_id, genres FROM genres WHERE genres IS NOT NULL AND artist_id IN (${ids.map(() => '?').join(',')})`)
      .bind(...ids)
      .all();
    const tagsOf = new Map(results.map((r) => [r.artist_id, JSON.parse(r.genres)]));
    genres = {
      families: [...FAMILIES.map(([key, label]) => ({ key, label })), { key: 'other', label: '其他' }],
      terms: Object.fromEntries(
        TERMS.map((t) => {
          const share = {};
          const examples = {};
          let covered = 0;
          for (const a of latest.artists[t]) {
            const w = artistFamilies(tagsOf.get(a.id));
            if (!w) continue;
            covered += 1;
            for (const [f, v] of Object.entries(w)) {
              share[f] = (share[f] ?? 0) + v;
              // 例子：这位艺人主要归在这一类时才列出
              if (v >= 0.5) (examples[f] ??= []).push(a.name);
            }
          }
          for (const f of Object.keys(share)) share[f] = Number((share[f] / covered).toFixed(4));
          for (const f of Object.keys(examples)) examples[f] = examples[f].slice(0, 4);
          return [t, { covered, total: latest.artists[t].length, share, examples }];
        }),
      ),
    };
  }

  return {
    generated_at: new Date().toISOString(),
    since: daily[0]?.date ?? null,
    until: today,
    plays: totals.results[0].plays,
    tracks: totals.results[0].tracks,
    artists: artistCount.results[0].n,
    sources: Object.fromEntries(sources.results.map((r) => [r.k, r.c])),
    daily,
    week: weekGrid,
    artist_plays: artistPlays.results,
    top,
    genres,
    trend,
  };
}
