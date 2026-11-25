// D1 的小工具：kv 读写、运行记录、北京时间
export const now = () => new Date().toISOString();

// 北京时间的日期（YYYY-MM-DD）；中国不用夏令时，固定 +8
export const beijingDay = (d = new Date()) => new Date(d.getTime() + 8 * 3600e3).toISOString().slice(0, 10);

export async function kvGet(db, key) {
  const row = await db.prepare('SELECT value FROM kv WHERE key = ?').bind(key).first();
  return row?.value ?? null;
}

export async function kvSet(db, key, value) {
  await db
    .prepare('INSERT INTO kv (key, value, updated) VALUES (?, ?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated = excluded.updated')
    .bind(key, value, now())
    .run();
}

export async function logRun(db, task, ok, note) {
  await db.batch([
    db.prepare('INSERT INTO runs (at, task, ok, note) VALUES (?, ?, ?, ?)').bind(now(), task, ok ? 1 : 0, note),
    db.prepare("DELETE FROM runs WHERE at < datetime('now', '-30 days')"),
  ]);
}
