// 随手试验数据：构建时从 li.yishan.app/demos.json 拉取。
// 格式：{ demos: [{ slug, title, desc, thumb, thumbDark?, date: 'YYYY-MM-DD', url? }] }
// thumbDark 是暗色主题下的截图，没有暗色版本的 demo 为 null。
// 拉取失败时返回空数组，首页对应区块自动隐藏，不阻塞构建。
// 本地调试可用环境变量 DEMOS_URL 指向其他 http(s) 地址。

const SITE = 'https://li.yishan.app/';
const SOURCE = process.env.DEMOS_URL || new URL('demos.json', SITE).href;

async function load() {
  try {
    const res = await fetch(SOURCE, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.demos ?? [])
      .filter((d) => d.slug && d.title && d.date)
      .map((d) => ({
        ...d,
        url: d.url ?? new URL(`${d.slug}/`, SITE).href,
        thumb: d.thumb ? new URL(d.thumb, SITE).href : null,
        thumbDark: d.thumbDark ? new URL(d.thumbDark, SITE).href : null,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch (err) {
    console.warn(`[demos] 未能读取 ${SOURCE}：${err.message}，跳过随手试验区块`);
    return [];
  }
}

export const demos = await load();
