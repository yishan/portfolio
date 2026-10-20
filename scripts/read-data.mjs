// /read 页的数据：调微信读书 Agent API（https://weread.qq.com/r/weread-skills），汇总成 src/data/read.json。
// 只写汇总和公开的书：书架上标成私密阅读的书一律不出现，不写账号信息。
//   WEREAD_API_KEY=wrk-… node scripts/read-data.mjs
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const KEY = process.env.WEREAD_API_KEY;
if (!KEY) throw new Error('需要 WEREAD_API_KEY');
const OUT = fileURLToPath(new URL('../src/data/read.json', import.meta.url));
const VERSION = '1.0.3';

async function call(api_name, params = {}) {
  const res = await fetch('https://i.weread.qq.com/api/agent/gateway', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_name, ...params, skill_version: VERSION }),
  });
  const j = await res.json();
  if (j.errcode) throw new Error(`${api_name}: ${j.errcode} ${j.errmsg ?? ''}`);
  return j;
}

// 接口的时间戳按北京时间切周期
const day = (ts) => new Date((Number(ts) + 8 * 3600) * 1000).toISOString().slice(0, 10);
const ts = (date) => Math.floor(new Date(`${date}T12:00:00+08:00`).getTime() / 1000);

const [overall, shelf] = await Promise.all([call('/readdata/detail', { mode: 'overall', baseTime: 0 }), call('/shelf/sync')]);

// 私密阅读的书：不出现在页面上
const secret = new Set(shelf.books.filter((b) => b.secret).map((b) => b.bookId));
const open = (b) => b && !secret.has(b.bookId);
const link = (b) => b.deepLink ?? `https://weread.qq.com/web/search/books?keyword=${encodeURIComponent(b.title)}`;

// 每年、每月：从注册那年起逐年查 annually
const since = day(overall.registTime);
const today = day(Date.now() / 1000);
const years = [];
for (let y = Number(since.slice(0, 4)); y <= Number(today.slice(0, 4)); y++) {
  const a = await call('/readdata/detail', { mode: 'annually', baseTime: ts(`${y}-06-01`) });
  const months = Array(12).fill(0);
  for (const [k, v] of Object.entries(a.readTimes ?? {})) {
    const d = day(k);
    if (Number(d.slice(0, 4)) === y) months[Number(d.slice(5, 7)) - 1] = v;
  }
  years.push({ year: y, s: a.totalReadTime ?? 0, days: a.readDays ?? 0, months });
}

// 最近一年每天：逐月查 monthly，按天分桶
const byDay = new Map();
const start = new Date(`${today}T12:00:00+08:00`);
start.setDate(start.getDate() - 364);
const first = day(start.getTime() / 1000);
for (let m = new Date(`${first.slice(0, 7)}-01T12:00:00+08:00`); day(m.getTime() / 1000) <= today; m.setMonth(m.getMonth() + 1)) {
  const r = await call('/readdata/detail', { mode: 'monthly', baseTime: Math.floor(m.getTime() / 1000) });
  for (const [k, v] of Object.entries(r.readTimes ?? {})) byDay.set(day(k), v);
}
const daily = [];
for (let d = new Date(start); day(d.getTime() / 1000) <= today; d.setDate(d.getDate() + 1)) {
  const k = day(d.getTime() / 1000);
  daily.push({ date: k, s: byDay.get(k) ?? 0 });
}

// preferTime 从 6 点排起，转成从 0 点排起
const pt = overall.preferTime ?? [];
const hours = Array.from({ length: 24 }, (_, h) => pt[(h - 6 + 24) % 24] ?? 0);

const longest = (overall.readLongest ?? [])
  .filter((x) => open(x.book))
  .map((x) => ({ title: x.book.title, author: x.book.author, s: x.readTime, tags: x.tags ?? [], link: link(x.book) }));

// 笔记本：翻到底，按 划线 + 想法 + 书签 排
const notebooks = [];
let page = await call('/user/notebooks', { count: 100 });
const noteTotals = { books: page.totalBookCount, notes: page.totalNoteCount };
for (;;) {
  notebooks.push(...page.books);
  if (!page.hasMore || !page.books.length) break;
  page = await call('/user/notebooks', { count: 100, lastSort: page.books.at(-1).sort });
}
const noted = notebooks
  .filter((n) => open(n.book))
  .map((n) => ({
    title: n.book.title,
    author: n.book.author,
    highlights: n.noteCount,
    thoughts: n.reviewCount,
    bookmarks: n.bookmarkCount,
    total: n.noteCount + n.reviewCount + n.bookmarkCount,
    progress: n.readingProgress ?? null,
    link: link(n.book),
  }))
  .sort((a, b) => b.total - a.total)
  .slice(0, 12);

// 书架：只算公开的电子书
const pub = shelf.books.filter((b) => !b.secret);
const parents = {};
for (const b of pub) {
  const p = b.category ? b.category.split('-')[0] : '未分类';
  parents[p] = (parents[p] ?? 0) + 1;
}
const recent = pub
  .filter((b) => b.readUpdateTime)
  .sort((a, b) => b.readUpdateTime - a.readUpdateTime)
  .slice(0, 8)
  .map((b) => ({ title: b.title, author: b.author, date: day(b.readUpdateTime), finished: Boolean(b.finishReading), link: link(b) }));

const stat = Object.fromEntries((overall.readStat ?? []).map((x) => [x.stat, Number.parseInt(x.counts, 10) || 0]));

const out = {
  generated_at: new Date().toISOString(),
  since,
  until: today,
  total_s: overall.totalReadTime,
  days: overall.readDays,
  read: stat['读过'] ?? null,
  finished: stat['读完'] ?? null,
  notes: stat['笔记'] ?? noteTotals.notes,
  years,
  daily,
  hours,
  hours_word: overall.preferTimeWord ?? null,
  longest,
  categories: (overall.preferCategory ?? []).map((c) => ({
    parent: c.parentCategoryTitle,
    title: c.categoryTitle,
    s: c.readingTime,
    n: c.readingCount,
  })),
  authors: (overall.preferAuthor ?? []).map((a) => ({ name: a.name, n: a.count, time: a.readTime })),
  author_count: overall.authorCount ?? null,
  publishers: (overall.preferPublisher ?? []).map((p) => ({ name: p.name, n: p.count })),
  notebooks: { ...noteTotals, top: noted },
  shelf: {
    books: pub.length,
    finished: pub.filter((b) => b.finishReading).length,
    parents: Object.entries(parents)
      .map(([name, n]) => ({ name, n }))
      .sort((a, b) => b.n - a.n),
    recent,
  },
};

fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`read.json: ${Math.round(out.total_s / 3600)} h, ${years.length} years, ${daily.length} days, ${noted.length} notebooks, ${secret.size} private books skipped`);
