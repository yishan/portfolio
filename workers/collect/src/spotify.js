// Spotify：每小时存最近播放，每天存一份榜单快照。
// refresh token 先读 D1 里轮换过的那个，没有再用 secret 里的初始值。
import { kvGet, kvSet, beijingDay } from './db.js';

const API = 'https://api.spotify.com/v1';
const TERMS = ['short_term', 'medium_term', 'long_term'];

export class AuthError extends Error {}

async function accessToken(env) {
  const refresh = (await kvGet(env.DB, 'spotify_refresh_token')) ?? env.SPOTIFY_REFRESH_TOKEN;
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET || !refresh) throw new AuthError('Spotify credentials missing');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const why = body.error_description || body.error || `HTTP ${res.status}`;
    if (res.status === 400 || res.status === 401) throw new AuthError(`token refresh rejected: ${why}`);
    throw new Error(`token refresh failed: ${why}`);
  }
  // Spotify 有时会换一个新的 refresh token，存下最新的
  if (body.refresh_token && body.refresh_token !== refresh) await kvSet(env.DB, 'spotify_refresh_token', body.refresh_token);
  return body.access_token;
}

async function api(token, endpoint) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}${endpoint}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 429 && attempt < 2) {
      await new Promise((r) => setTimeout(r, Number(res.headers.get('retry-after') || 5) * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`GET ${endpoint}: HTTP ${res.status}`);
    return res.json();
  }
}

const artistsOf = (list) => list.map((a) => ({ id: a.id, name: a.name }));

export const trimTrack = (t) => ({
  id: t.id,
  name: t.name,
  artists: artistsOf(t.artists),
  album: { id: t.album.id, name: t.album.name, release_date: t.album.release_date, type: t.album.album_type },
  duration_ms: t.duration_ms,
  explicit: t.explicit,
  isrc: t.external_ids?.isrc ?? null,
});

export const insertPlay = (db, p) =>
  db
    .prepare('INSERT OR IGNORE INTO plays (played_at, track_id, track, context_type) VALUES (?, ?, ?, ?)')
    .bind(p.played_at, p.track.id, JSON.stringify(p.track), p.context?.type ?? null);

// 最近 50 条播放，已有的跳过。返回新增条数
export async function fetchPlays(env) {
  const token = await accessToken(env);
  const recent = await api(token, '/me/player/recently-played?limit=50');
  const plays = recent.items
    .filter((i) => i.track?.id)
    .map((i) => ({ played_at: i.played_at, track: trimTrack(i.track), context: i.context }));
  if (!plays.length) return { added: 0 };
  const newest = await env.DB.prepare('SELECT max(played_at) AS t FROM plays').first('t');
  const results = await env.DB.batch(plays.map((p) => insertPlay(env.DB, p)));
  const added = results.reduce((s, r) => s + (r.meta.changes ?? 0), 0);
  // 50 条全是新的、而且都比已存的最新一条晚：中间有播放没抓到
  const oldest = plays.reduce((m, p) => (p.played_at < m ? p.played_at : m), plays[0].played_at);
  const gap = Boolean(newest) && plays.length === 50 && added === 50 && oldest > newest;
  return { added, gap };
}

export const snapshotRows = (db, date, snap) => [
  db.prepare('INSERT OR REPLACE INTO snapshots (date, data) VALUES (?, ?)').bind(date, JSON.stringify(snap)),
  ...snap.artists.short_term.map((a) =>
    db.prepare('INSERT OR REPLACE INTO ranks (date, artist_id, rank) VALUES (?, ?, ?)').bind(date, a.id, a.rank),
  ),
  // 新上榜的艺人排进流派查询队列；记下一首他署名在第一位的歌的 ISRC
  ...(() => {
    const isrc = new Map();
    for (const list of Object.values(snap.tracks)) {
      for (const t of list) if (t.isrc && !isrc.has(t.artists[0].id)) isrc.set(t.artists[0].id, t.isrc);
    }
    const seen = new Map();
    for (const list of Object.values(snap.artists)) for (const a of list) seen.set(a.id, a.name);
    return [...seen].map(([id, name]) =>
      db
        .prepare('INSERT INTO genres (artist_id, name, isrc) VALUES (?, ?, ?) ON CONFLICT (artist_id) DO UPDATE SET isrc = coalesce(genres.isrc, excluded.isrc)')
        .bind(id, name, isrc.get(id) ?? null),
    );
  })(),
];

// 今天的榜单快照；今天已经存过就跳过
export async function snapshotTop(env) {
  const date = beijingDay();
  if (await env.DB.prepare('SELECT 1 FROM snapshots WHERE date = ?').bind(date).first()) return { date, saved: false };
  const token = await accessToken(env);
  const snap = { fetched_at: new Date().toISOString(), artists: {}, tracks: {} };
  for (const term of TERMS) {
    const a = await api(token, `/me/top/artists?limit=50&time_range=${term}`);
    snap.artists[term] = a.items.map((x, i) => ({ rank: i + 1, id: x.id, name: x.name }));
    const t = await api(token, `/me/top/tracks?limit=50&time_range=${term}`);
    snap.tracks[term] = t.items.map((x, i) => ({
      rank: i + 1,
      id: x.id,
      name: x.name,
      artists: artistsOf(x.artists),
      release_date: x.album.release_date,
      duration_ms: x.duration_ms,
      explicit: x.explicit,
      isrc: x.external_ids?.isrc ?? null,
    }));
  }
  await env.DB.batch(snapshotRows(env.DB, date, snap));
  return { date, saved: true };
}
