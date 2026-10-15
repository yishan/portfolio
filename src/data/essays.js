import { getCollection } from 'astro:content';
import { essays } from './content.js';

// 首页「但说无妨」列表：站内文章直接读 src/content/essays/（文件名 "NNN 标题.md"，日期取 frontmatter），
// 站外文章来自 content.js。按年份分组，年份新的在前；同一年里站内文章按编号倒序，站外文章按日期插入。
export async function getEssays() {
  const entries = await getCollection('essays');
  const local = entries
    .map((entry) => {
      const date = entry.data.date ?? entry.data.created ?? entry.data.latest;
      return {
        no: entry.id.slice(0, 3),
        title: entry.data.title,
        date: date ? date.toISOString().slice(0, 10) : '',
        href: encodeURI(`/essays/${entry.id}`),
        external: false,
      };
    })
    .sort((a, b) => b.no.localeCompare(a.no));
  const external = essays.external
    .map((e) => ({ ...e, date: e.date, label: e.date.slice(5), external: true }))
    .sort((a, b) => b.date.localeCompare(a.date));

  // 站外文章插到第一篇比它旧的站内文章前面
  const items = [...local];
  for (const e of external) {
    const at = items.findIndex((x) => !x.external && x.date < e.date);
    items.splice(at === -1 ? items.length : at, 0, e);
  }

  const years = [...new Set(items.map((e) => e.date.slice(0, 4)))].sort().reverse();
  const groups = years.map((year) => ({ year, items: items.filter((e) => e.date.startsWith(year)) }));
  return { ...essays, groups };
}
