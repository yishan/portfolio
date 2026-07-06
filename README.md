# yishan.li

个人主页 — Astro + three.js。设计概念「引力场」：点阵为质量，光标为引力。

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
  layouts/Base.astro     # HTML 外壳、字体、meta
  styles/global.css      # 设计变量（--ink/--paper/--vermillion/--dot）与公共样式
  scripts/gravity.js     # 首屏 three.js 粒子引力场
  scripts/interactions.js # 磁性导航链接
```

## 首屏粒子调参（src/scripts/gravity.js）

- `applyStyle()` 中 `dim` 混合比（0.07）= 静息点阵浓度；`bright`（0.6）= 交互高亮浓度
- `RADIUS` = 光标影响半径；`STRENGTH` = 引力强度
- 自动适配亮/暗模式（取自页面 `--ink`/`--paper`），`prefers-reduced-motion` 时回退为静态点阵
