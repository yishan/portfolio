# yishan.li

个人主页 — Astro，纯 ASCII 风格。字符作品来自 [ascii.rest](https://ascii.rest)（MIT），线稿图形来自 [Hairline](https://github.com/lucasmarkes/hairline)（MIT）。

## 常用命令

```bash
npm run dev      # 本地开发（热更新）http://localhost:4321
npm run build    # 产出静态文件到 dist/
npm run preview  # 本地预览 dist/ 构建结果
```

## 更新内容

所有文案与链接集中在 `src/data/content.js`，改这一个文件即可：

| 区块 | 对应字段 | 说明 |
|---|---|---|
| 首屏（名字/引言/介绍） | `profile` | `intro` 数组一项 = 一个段落 |
| 01 产品奇遇 | `products` | 加新年份即可；数组最后一年自动标红 + 最近，展示时自动最新在左 |
| 02 有所启发 | `newsletter.issues` | 新刊加到数组**最前**，`{ no: '012', title: '…' }`，链接由 `no` 自动生成 |
| 03 但说无妨 | `essays.groups` | 每组 `{ year, items }`；新文章加进对应年份，新年份加一个新组到最前 |
| 04 长期项目 | `references` | 每张卡片 `{ label, title, desc, href }`，增删自动重排 |
| 随手试验 + 首屏 LATEST | `lab` + `src/data/demos.js` | 数据构建时从 `li.yishan.app/demos.json` 拉取，无需手改；读取失败时区块自动隐藏、后续编号前移 |
| 05 联系方式 | `contacts` | `{ label, value, href }`，无链接时 `href: null` |

注意：文章链接由 `no` + `title` 自动拼接（空格转 `-`），若与线上 URL 不一致，可在该项里直接写死 `href`。

## 新增区块

在 `src/pages/index.astro` 中：

1. 复制一个形态相近的 `<section class="section" id="…">`（列表用 issue-list、索引用 essay-list、卡片用 ref-grid），改编号 `index-no`。
2. 顶部 `<nav class="site-nav">` 加一个锚点链接。
3. 列表数据放进 `content.js` 新导出，再 `.map()` 渲染，不要硬编码在标记里。

## 文件结构

```
src/
  data/content.js        # 全部内容数据（改这里）
  pages/index.astro      # 首页结构 + 样式
  pages/404.astro        # 404 页（ascii.rest not-found）
  layouts/Base.astro     # HTML 外壳、字体、meta
  styles/global.css      # 设计变量（--ink/--paper/--vermillion/--mono）与公共样式
  scripts/ascii-field.js # 页脚 ASCII 引力网格
  scripts/interactions.js # 导航悬停乱码解码
```

## 字符与线稿

- 首屏：`ascii.rest/astro` 的 `<Ascii>`，`big-text` 画名字、`black-hole` 配引言。构建时渲染第一帧，脚本加载后才动。
- 字号按列数铺满容器：外层 `.art-fit` 设 `--cols`（作品列数），可选 `--max-px` 限制最大字号。
- 区块右侧线稿：`<div class="hl-fig" data-figure="riffle">`，`data-figure` 取 `riffle` / `terminal` / `dish`，新增图形要在页面脚本的 `figures` 里一并导入。手机端隐藏。
- 页脚网格（`src/scripts/ascii-field.js`）：`LX`/`LY` = 网格线间距（字符数），`masses()` = 质量位置与大小，`pull` 系数 = 网格弯曲程度；`prefers-reduced-motion` 时只画静止一帧。
- 依赖版本精确锁定：`ascii.rest` 0.2.1、`@lucasmarkes/hairline` 0.2.0，与 xbm 中审过的版本一致。
