import { getEntry } from 'astro:content';

// notes.md 里每条短记以 "## YY-MM-DD"（早期是 ###）开头：按日期标题切成条目，写作方式不变。
// 首页「灵光」和 /notes 共用这一份解析结果，新增短记两处同时出现。
const heading = /<h([23])[^>]*>\s*(\d{2})-(\d{2})-(\d{2})\s*<\/h\1>/g;

export async function getNotes() {
  const entry = await getEntry('pages', 'notes');
  const html = entry.rendered?.html ?? '';
  const marks = [...html.matchAll(heading)];
  // 第一个日期标题之前的内容作为开头说明，留空则不显示
  const intro = (marks.length ? html.slice(0, marks[0].index) : html).trim();
  const notes = marks.map((m, i) => {
    const [, , yy, mm, dd] = m;
    const end = i + 1 < marks.length ? marks[i + 1].index : html.length;
    return {
      id: `${yy}-${mm}-${dd}`,
      year: `20${yy}`,
      month: `20${yy}-${mm}`,
      label: `${mm}.${dd}`,
      date: `20${yy}-${mm}-${dd}`,
      body: html.slice(m.index + m[0].length, end).trim(),
    };
  });
  notes.sort((a, b) => b.date.localeCompare(a.date));
  return { entry, intro, notes };
}
