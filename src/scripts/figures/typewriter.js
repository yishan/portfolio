// 06 但说无妨：打字机。指针扫过键盘时，指针下的键按下、打出一个字，滑架随之移动；
// 一行打满后换行，纸张往上送。正在打的这一行是红色的。
import { prism, circle, rect, draw, line, proj, spring, decay, clamp, demo } from './engine.js';

const BX = 1.5;
const BY = 1.6;
// 机身截面（x, z）：前低后高的斜面，沿 y 拉伸
const BODY = [[0, 0], [BX, 0], [BX, 0.14], [0.6, 0.5], [0, 0.5]];
const slope = (x) => 0.14 + (BX - x) * 0.4;
const body = prism(BODY, 0, BY, (a, b, e) => [a, e, b]);
const plinth = prism(rect(-0.12, BX + 0.12, -0.12, BY + 0.12), -0.06, 0, (a, b, e) => [a, b, e]);

const KEYS = [];
[1.33, 1.14, 0.95].forEach((x, r) => {
  for (let c = 0; c < 8; c++) KEYS.push({ x, y: 0.22 + r * 0.05 + c * 0.165 });
});
KEYS.sort((a, b) => a.x + a.y - (b.x + b.y));
const key = (k, press) => {
  const z = slope(k.x);
  return prism(circle(k.x, k.y, 0.055, 8), z - 0.03, z + 0.07 - press * 0.045, (a, b, e) => [a, b, e]);
};
const space = (press) => prism(rect(1.41, 1.47, 0.42, 1.18), 0.1, 0.17 - press * 0.03, (a, b, e) => [a, b, e]);

const PX = 0.32;
const PZ = 0.72;
const PAPER_W = 1.0;
const LINE = 0.075;
const MAX_LEN = 0.8;
const along = (a, b, e) => [a, e, b];
const platen = (c) => prism(circle(PX, PZ, 0.13, 18), c - 0.85, c + 0.85, along);
const knobs = (c) => [prism(circle(PX, PZ, 0.09, 14), c - 0.97, c - 0.85, along), prism(circle(PX, PZ, 0.09, 14), c + 0.85, c + 0.97, along)];
const paper = (c) => prism(rect(PX - 0.01, PX + 0.005, PZ, PZ + 0.78), c - PAPER_W / 2, c + PAPER_W / 2, along);

export const typewriter = () => ({
  label: '一台打字机，指针扫过键盘时会打字、换行、送纸',
  bounds: () => [plinth, body, platen(0.4), platen(1.2), ...knobs(0.4), ...knobs(1.2), paper(0.4), paper(1.2)].flatMap((p) => p.faces.flatMap((f) => f.v)),
  init: () => ({ lines: [0.62, 0.48, 0.7, 0.55], len: 0, carriage: 1.2, feed: 0, press: KEYS.map(() => 0), spacePress: 0, last: -1, next: 0 }),
  still(s) {
    s.len = 0.35;
    s.carriage = 1.2 - s.len;
  },
  step(s, input) {
    let hit = -1;
    if (input.sx !== null && input.near > 0.3) {
      let best = 0.16;
      KEYS.forEach((k, i) => {
        const [x, y] = proj([k.x, k.y, slope(k.x) + 0.07]);
        const d = Math.hypot(x - input.sx, y - input.sy);
        if (d < best) {
          best = d;
          hit = i;
        }
      });
    }
    // 自动打字：锁定或无人操作的演示时段
    if ((input.pinned || (input.idle && demo(input.t, 9000, 0.2, 0.8))) && input.t > s.next) {
      hit = Math.floor(Math.random() * KEYS.length);
      s.last = -1;
      s.next = input.t + 260 + Math.random() * 220;
    }
    if (hit >= 0 && hit !== s.last) {
      s.press[hit] = 1;
      s.len += 0.03 + Math.random() * 0.03;
      if (Math.random() < 0.18) {
        s.spacePress = 1;
        s.len += 0.03;
      }
      if (s.len > MAX_LEN) {
        s.lines.unshift(s.len);
        s.lines.length = Math.min(s.lines.length, 8);
        s.len = 0;
        s.feed = 1;
      }
    }
    s.last = hit;
    let moving = false;
    s.press = s.press.map((p) => {
      if (p > 0.01) moving = true;
      return decay(p, input.dt, 70);
    });
    s.spacePress = decay(s.spacePress, input.dt, 70);
    s.feed = decay(s.feed, input.dt, 160);
    moving = spring(s, 'carriage', 1.2 - s.len, input.dt, { k: 120, c: 21 }) || moving || s.feed > 0.01 || s.spacePress > 0.01;
    return moving;
  },
  render(s) {
    const c = s.carriage;
    let out = draw(plinth) + draw(body);
    // 纸张与已打的行（行从压纸滚筒往上排，换行时整体上移）
    out += draw(paper(c));
    const x = PX + 0.006;
    const left = c - PAPER_W / 2 + 0.1;
    const base = PZ + 0.18 - s.feed * LINE;
    s.lines.forEach((len, k) => {
      const z = base + (k + 1) * LINE;
      if (z < PZ + 0.72) out += line([x, left, z], [x, left + len, z], 'lo');
    });
    if (s.len > 0.005) out += line([x, left, base], [x, left + s.len, base], 'accent');
    out += draw(platen(c));
    const [k0, k1] = knobs(c);
    out += draw(k0) + draw(k1);
    // 键盘：由远到近
    KEYS.forEach((k, i) => (out += draw(key(k, clamp(s.press[i])), s.press[i] > 0.2)));
    out += draw(space(clamp(s.spacePress)));
    return out;
  },
});
