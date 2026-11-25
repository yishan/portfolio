// 把本机 ~/Data/spotify 里已有的数据（播放历史、每日榜单快照、流派缓存）转成 SQL，导入 D1：
//   node scripts/import-local.mjs [数据目录] > /tmp/import.sql
//   npx wrangler d1 execute yishan-collect --remote --file /tmp/import.sql
// 全部用 INSERT OR IGNORE / ON CONFLICT，重复导入不会产生重复记录，也不会覆盖 Worker 已经查到的新数据。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DATA = process.argv[2] || path.join(os.homedir(), 'Data', 'spotify');
const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replaceAll("'", "''")}'`);
const out = [];

const plays = fs.readFileSync(path.join(DATA, 'history.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
for (const p of plays) {
  out.push(`INSERT OR IGNORE INTO plays (played_at, track_id, track, context_type) VALUES (${q(p.played_at)}, ${q(p.track.id)}, ${q(JSON.stringify(p.track))}, ${q(p.context?.type ?? null)});`);
}

const topDir = path.join(DATA, 'top');
const files = fs.readdirSync(topDir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
for (const f of files) {
  const date = f.slice(0, 10);
  const snap = JSON.parse(fs.readFileSync(path.join(topDir, f), 'utf8'));
  out.push(`INSERT OR IGNORE INTO snapshots (date, data) VALUES (${q(date)}, ${q(JSON.stringify(snap))});`);
  for (const a of snap.artists.short_term) out.push(`INSERT OR IGNORE INTO ranks (date, artist_id, rank) VALUES (${q(date)}, ${q(a.id)}, ${a.rank});`);
}

const cacheFile = path.join(DATA, 'genres.json');
const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {};
for (const [id, g] of Object.entries(cache)) {
  out.push(
    `INSERT INTO genres (artist_id, name, mbid, via, genres, checked) VALUES (${q(id)}, ${q(g.name)}, ${q(g.mbid)}, ${q(g.via)}, ${q(JSON.stringify(g.genres ?? []))}, ${q(g.checked)}) ON CONFLICT (artist_id) DO NOTHING;`,
  );
}

process.stdout.write(out.join('\n') + '\n');
console.error(`import.sql: ${plays.length} plays, ${files.length} snapshots, ${Object.keys(cache).length} genre entries`);
