import { newsletter } from './content.js';

// 首页「有所启发」列表：构建时读 Substack RSS，标题形如 "有所启发 #012: 标题"（分隔符也可能是空格或 💡）。
// 拉取或解析失败时用 content.js 里的 fallback；RSS 只保留最近若干期，更早的期目也从 fallback 补齐。
// 设置 NEWSLETTER_FEED 可以换一个 feed 地址（比如用坏地址测试兜底）。
const REF = 'e6ngw';

const decode = (s) =>
  s
    .replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]) : '';
};

function parse(xml) {
  const issues = [];
  for (const [, item] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const m = tag(item, 'title').match(/#\s*(\d+)\s*[:：💡]?\s*(.*)$/u);
    const link = tag(item, 'link');
    if (!m || !link) continue;
    const url = new URL(link);
    url.searchParams.set('r', REF);
    issues.push({ no: m[1].padStart(3, '0'), title: m[2].trim(), href: url.href });
  }
  return issues;
}

let cached;

export async function getNewsletter() {
  cached ??= load();
  return { ...newsletter, issues: await cached };
}

async function load() {
  const feed = process.env.NEWSLETTER_FEED || newsletter.feed;
  try {
    const res = await fetch(feed, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const fromFeed = parse(await res.text());
    if (fromFeed.length === 0) throw new Error('no issues found in feed');
    const seen = new Set(fromFeed.map((i) => i.no));
    return [...fromFeed, ...newsletter.fallback.filter((i) => !seen.has(i.no))].sort((a, b) =>
      b.no.localeCompare(a.no),
    );
  } catch (err) {
    console.warn(`[newsletter] 读取 ${feed} 失败，使用 content.js 里的兜底列表：${err.message}`);
    return newsletter.fallback;
  }
}
