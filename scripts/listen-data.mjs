// /listen 页的数据：读本机的 Spotify 播放历史和每日榜单快照（~/Data/spotify，由 ~/bin/spotify-fetch.mjs 每小时更新），
// 汇总成 src/data/listen.json。只写汇总：每天的播放数、星期 × 小时的格子、计数和名次，不写精确到分钟的播放时间和账号信息。
//   node scripts/listen-data.mjs [数据目录]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA = process.argv[2] || path.join(os.homedir(), 'Data', 'spotify');
const OUT = fileURLToPath(new URL('../src/data/listen.json', import.meta.url));
const TERMS = ['short_term', 'medium_term', 'long_term'];

const plays = fs
  .readFileSync(path.join(DATA, 'history.jsonl'), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((l) => JSON.parse(l));

const topDir = path.join(DATA, 'top');
const snapshots = fs
  .readdirSync(topDir)
  .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
  .sort()
  .map((f) => ({ date: f.slice(0, 10), ...JSON.parse(fs.readFileSync(path.join(topDir, f), 'utf8')) }));
const latest = snapshots.at(-1);

// 按本机时区切日期和小时
const localDay = (d) => d.toLocaleDateString('sv-SE');
const year = (date) => (date ? Number(date.slice(0, 4)) : null);
const isrcCC = (isrc) => (isrc ? isrc.slice(0, 2).toUpperCase() : null);

// 每天的播放数：从第一条记录到今天逐日排开，没听的日子记 0
const byDay = new Map();
for (const p of plays) {
  const k = localDay(new Date(p.played_at));
  byDay.set(k, (byDay.get(k) ?? 0) + 1);
}
const today = localDay(new Date());
const daily = [];
if (plays.length) {
  for (let d = new Date(`${localDay(new Date(plays[0].played_at))}T12:00:00`); localDay(d) <= today; d.setDate(d.getDate() + 1)) {
    daily.push({ date: localDay(d), count: byDay.get(localDay(d)) ?? 0 });
  }
}

// 星期（周一 = 0）× 小时
const week = Array.from({ length: 7 }, () => Array(24).fill(0));
for (const p of plays) {
  const d = new Date(p.played_at);
  week[(d.getDay() + 6) % 7][d.getHours()] += 1;
}

// 实际播放次数：合作曲目给每位署名艺人各记一次
const artistPlays = new Map();
for (const p of plays) {
  for (const a of p.track.artists) {
    const e = artistPlays.get(a.id) ?? { id: a.id, name: a.name, count: 0 };
    e.count += 1;
    artistPlays.set(a.id, e);
  }
}
const sources = {};
for (const p of plays) {
  const k = p.context?.type ?? 'direct';
  sources[k] = (sources[k] ?? 0) + 1;
}

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

// 名次走势：每天快照里短期艺人榜的名次，只留最新一天前 10 名的艺人
const trendIds = latest ? latest.artists.short_term.slice(0, 10).map((a) => a.id) : [];
const trend = {
  dates: snapshots.map((s) => s.date),
  artists: trendIds.map((id) => ({
    id,
    name: latest.artists.short_term.find((a) => a.id === id).name,
    ranks: snapshots.map((s) => s.artists.short_term.find((a) => a.id === id)?.rank ?? null),
  })),
};

// 流派：Spotify 不再提供，genres.json 是 ~/bin/spotify-genres.mjs 从 MusicBrainz 查来的标签。
// 细分标签按关键词归到大类，先匹配先得；每位艺人取票数够多的前几个标签，按票数分摊，合计算一位艺人
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
const genreFile = path.join(DATA, 'genres.json');
const genreCache = fs.existsSync(genreFile) ? JSON.parse(fs.readFileSync(genreFile, 'utf8')) : {};
function artistFamilies(id) {
  const tags = genreCache[id]?.genres ?? [];
  if (!tags.length) return null;
  const keep = tags.filter((g) => g.count >= Math.max(1, tags[0].count * 0.25)).slice(0, 4);
  const total = keep.reduce((s, g) => s + g.count, 0);
  const w = {};
  for (const g of keep) {
    const f = familyOf(g.name);
    w[f] = (w[f] ?? 0) + g.count / total;
  }
  return w;
}
const genres = latest && {
  families: [...FAMILIES.map(([key, label]) => ({ key, label })), { key: 'other', label: '其他' }],
  terms: Object.fromEntries(
    TERMS.map((t) => {
      const share = {};
      const examples = {};
      let covered = 0;
      for (const a of latest.artists[t]) {
        const w = artistFamilies(a.id);
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

const out = {
  generated_at: new Date().toISOString(),
  since: daily[0]?.date ?? null,
  until: today,
  plays: plays.length,
  tracks: new Set(plays.map((p) => p.track.id)).size,
  artists: artistPlays.size,
  sources,
  daily,
  week,
  artist_plays: [...artistPlays.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 15),
  top,
  genres,
  trend,
};

fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`listen.json: ${out.plays} plays, ${daily.length} days, ${snapshots.length} snapshots`);
