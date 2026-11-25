// 艺人流派：Spotify 不再给，按队列从 MusicBrainz 查。MusicBrainz 要求每秒最多一次请求，
// 每次运行只查几位，免得超出 Worker 的子请求数；查不到的 30 天后再试。
//   1. 用这位艺人一首歌的 ISRC 找录音 → 艺人（准）
//   2. 找不到再按名字精确搜，同名不止一位就不认
import { now } from './db.js';

const MB = 'https://musicbrainz.org/ws/2';
const HEADERS = { 'User-Agent': 'yishan.li-listen/0.2 ( https://yishan.li )', Accept: 'application/json' };
const PER_RUN = 6;

let last = 0;
async function mb(endpoint) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const wait = last + 1100 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    const res = await fetch(`${MB}${endpoint}`, { headers: HEADERS });
    if (res.status === 404) return null;
    if (res.ok) return res.json();
    if (res.status === 503 || res.status === 429) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }
    throw new Error(`MusicBrainz ${endpoint}: HTTP ${res.status}`);
  }
  throw new Error(`MusicBrainz ${endpoint}: still rate-limited`);
}

const norm = (s) => s.normalize('NFKC').toLowerCase().trim();

async function viaIsrc(isrc, name) {
  const j = await mb(`/isrc/${isrc}?inc=artist-credits&fmt=json`);
  for (const rec of j?.recordings ?? []) {
    const a = rec['artist-credit']?.find((c) => norm(c.artist.name) === norm(name) || norm(c.name) === norm(name))?.artist;
    if (a) return a.id;
  }
  return null;
}

async function viaName(name) {
  const q = encodeURIComponent(`artist:"${name.replace(/"/g, '')}"`);
  const j = await mb(`/artist?query=${q}&limit=5&fmt=json`);
  const exact = (j?.artists ?? []).filter((a) => a.score === 100 && norm(a.name) === norm(name));
  return exact.length === 1 ? exact[0].id : null;
}

export async function lookupGenres(env) {
  const { results: todo } = await env.DB.prepare(
    "SELECT artist_id, name, isrc FROM genres WHERE checked IS NULL OR (mbid IS NULL AND checked < datetime('now', '-30 days')) LIMIT ?",
  )
    .bind(PER_RUN)
    .all();
  let found = 0;
  for (const a of todo) {
    let mbid = a.isrc ? await viaIsrc(a.isrc, a.name) : null;
    let via = mbid && 'isrc';
    if (!mbid) {
      mbid = await viaName(a.name);
      via = mbid && 'name';
    }
    const j = mbid ? await mb(`/artist/${mbid}?inc=genres&fmt=json`) : null;
    const genres = (j?.genres ?? []).map((g) => ({ name: g.name, count: g.count })).sort((x, y) => y.count - x.count);
    if (genres.length) found++;
    await env.DB.prepare('UPDATE genres SET mbid = ?, via = ?, genres = ?, checked = ? WHERE artist_id = ?')
      .bind(mbid, via, JSON.stringify(genres), now(), a.artist_id)
      .run();
  }
  return { looked_up: todo.length, found };
}
