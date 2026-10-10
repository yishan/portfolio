// 01 产品奇遇：书架上五本年鉴（2021–2025），最新一本书脊带红签。指针指向哪本，哪本就被抽出来。
import { prism, rect, draw, line, polygon, proj, spring, clamp } from './engine.js';

const D = 1; // 书深（y，书脊朝 +y，即朝左下的观者）
const TH = 0.24; // 书厚（x，沿书架排开）
const GAP = 0.04;
const HEIGHTS = [1.25, 1.4, 1.3, 1.45, 1.35];
const N = HEIGHTS.length;
const x0 = (i) => i * (TH + GAP);
const shelf = prism(rect(-0.14, x0(N - 1) + TH + 0.14, -0.12, D + 0.22), -0.08, 0, (a, b, e) => [a, b, e]);

// 书 i 在深度方向占 [ya, yb]
const book = (i, ya, yb, opts) =>
  prism(rect(x0(i), x0(i) + TH, ya, yb), 0, HEIGHTS[i], (a, b, e) => [a, b, e], opts);

function spine(i, y) {
  const h = HEIGHTS[i];
  const a = x0(i);
  const b = a + TH;
  let out = line([a, y, h - 0.14], [b, y, h - 0.14], 'mid') + line([a, y, 0.14], [b, y, 0.14], 'mid');
  if (i === N - 1) out += polygon([[a, y, h - 0.36], [b, y, h - 0.36], [b, y, h - 0.22], [a, y, h - 0.22]], 'fo accent');
  else out += line([a + 0.07, y, h - 0.3], [b - 0.07, y, h - 0.3], 'lo');
  return out;
}

export const annual = (intensity = 0.6) => {
  const maxOut = 0.35 + 0.4 * intensity;
  return {
    label: '书架上的五本年鉴，指针指向的那本会被抽出来',
    bounds: () => [shelf, ...HEIGHTS.map((_, i) => book(i, 0, D + maxOut))].flatMap((p) => p.faces.flatMap((f) => f.v)),
    init: () => ({ out: HEIGHTS.map(() => 0), sel: N - 1 }),
    step(s, input) {
      if (input.sx !== null && input.near > 0.15) {
        let best = Infinity;
        HEIGHTS.forEach((h, i) => {
          const [x, y] = proj([x0(i) + TH / 2, D + s.out[i] * maxOut, h / 2]);
          const d = Math.hypot(x - input.sx, y - input.sy);
          if (d < best) {
            best = d;
            s.sel = i;
          }
        });
      }
      let goal = input.pinned ? 1 : clamp(input.near * 1.3);
      if (input.idle) {
        s.sel = Math.floor(input.t / 2400) % N;
        goal = 0.8;
      }
      let moving = false;
      s.out.forEach((_, i) => {
        const tmp = { o: s.out[i], oV: s[`v${i}`] ?? 0 };
        moving = spring(tmp, 'o', i === s.sel ? goal : 0, input.dt) || moving;
        s.out[i] = tmp.o;
        s[`v${i}`] = tmp.oV;
      });
      return moving;
    },
    render(s) {
      let out = draw(shelf);
      const pulled = [];
      for (let i = 0; i < N; i++) {
        const dx = clamp(s.out[i], 0, 1.2) * maxOut;
        out += draw(book(i, dx, D + dx), s.out[i] > 0.3);
        if (dx > 0.005) pulled.push([i, dx]);
        else out += spine(i, D);
      }
      // 抽出的那段在相邻书前面，最后补画
      for (const [i, dx] of pulled) out += draw(book(i, D, D + dx, { open0: true }), s.out[i] > 0.3) + spine(i, D + dx);
      return out;
    },
  };
};
