-- 每条播放一行，同一时刻同一首歌只记一次
CREATE TABLE IF NOT EXISTS plays (
  played_at TEXT NOT NULL,
  track_id TEXT NOT NULL,
  track TEXT NOT NULL,
  context_type TEXT,
  PRIMARY KEY (played_at, track_id)
);
-- 每天一份榜单快照（三个时段的艺人和歌曲）
CREATE TABLE IF NOT EXISTS snapshots (date TEXT PRIMARY KEY, data TEXT NOT NULL);
-- 短期艺人榜的名次，画名次走势用
CREATE TABLE IF NOT EXISTS ranks (date TEXT NOT NULL, artist_id TEXT NOT NULL, rank INTEGER NOT NULL, PRIMARY KEY (date, artist_id));
-- MusicBrainz 流派缓存；checked 为空表示还没查
CREATE TABLE IF NOT EXISTS genres (artist_id TEXT PRIMARY KEY, name TEXT NOT NULL, isrc TEXT, mbid TEXT, via TEXT, genres TEXT, checked TEXT);
-- 生成好的 listen.json / read.json，以及轮换后的 Spotify refresh token
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated TEXT NOT NULL);
-- 运行记录，/status 用
CREATE TABLE IF NOT EXISTS runs (at TEXT NOT NULL, task TEXT NOT NULL, ok INTEGER NOT NULL, note TEXT);
