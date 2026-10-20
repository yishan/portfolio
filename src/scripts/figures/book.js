// 在读：一本摊开的书。靠近时翻过一页，离开再靠近再翻一页；没人操作时隔一阵自己翻一页。
import { prism, rect, draw, line, polygon, spring, demo } from './engine.js';

const L = 0.72; // 半个书长（沿书脊）
const W = 0.95; // 一页宽
const T = 0.1; // 一侧书页的厚度
const ROWS = [0.2, 0.32, 0.44, 0.56, 0.68, 0.8];

const cover = prism(rect(-L - 0.04, L + 0.04, -W - 0.05, W + 0.05), 0, 0.025, (a, b, e) => [a, b, e]);
const leftBlock = prism(rect(-L, L, -W, 0), 0.025, T, (a, b, e) => [a, b, e]);
const rightBlock = prism(rect(-L, L, 0, W), 0.025, T, (a, b, e) => [a, b, e]);

// 页上第 u 宽处、沿书脊 x 处的点；th = 0 平躺在右侧，th = π 平躺在左侧
const at = (x, u, th) => [x, Math.cos(th) * u, T + 0.002 + Math.sin(th) * u];
// 正文行：每行留出不等长的空白，像排好的文字
const text = (th, side) =>
  ROWS.map((u, i) => line(at(-L + 0.14, u * W, th), at(L - 0.14 - (i % 3) * 0.12 - (i === ROWS.length - 1) * 0.4, u * W, th), side))
    .join('');

export const book = () => ({
  label: '一本摊开的书，靠近时翻过一页',
  pad: 0.1,
  bounds: () => [...cover.faces.flatMap((f) => f.v), at(0, W, Math.PI / 2)],
  init: () => ({ th: 0, turning: false, armed: true, demoOn: false }),
  step(s, input) {
    const near = input.pinned || input.near > 0.35;
    if (input.near < 0.2 && !input.pinned) s.armed = true;
    const d = input.idle && demo(input.t, 14000, 0.5, 0.6);
    if (!s.turning && ((near && s.armed) || (d && !s.demoOn))) {
      s.turning = true;
      s.armed = false;
    }
    s.demoOn = d;
    if (!s.turning) return false;
    // 翻完后换成右侧的下一页，看起来和原来一样
    if (!spring(s, 'th', Math.PI, input.dt, { k: 22, c: 10 })) {
      s.th = 0;
      s.turning = false;
    }
    return true;
  },
  render(s) {
    let out = draw(cover) + draw(leftBlock) + draw(rightBlock);
    out += text(Math.PI, 'lo') + text(0, 'lo');
    out += line([-L, 0, T], [L, 0, T], 'mid');
    if (s.turning && s.th > 0.01) {
      out += polygon([at(-L, 0, s.th), at(L, 0, s.th), at(L, W, s.th), at(-L, W, s.th)], 'fo');
      out += polygon([at(-L, 0, s.th), at(L, 0, s.th), at(L, W, s.th), at(-L, W, s.th)], 'nf sil');
      out += text(s.th, 'lo');
    }
    // 书签带：一道红线从书脊垂到书外
    out += line([L - 0.18, 0, T], [L + 0.22, -0.06, 0.012], 'accent');
    return out;
  },
});
