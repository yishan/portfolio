// 07 联系：乡村信箱。靠近时前门绕底边放平，信件滑出，侧面红旗升起。
import { prism, rect, draw, line, polyline, polygon, clipped, spring, smooth, clamp, demo } from './engine.js';

const L = 2;
const W = 1;
const H0 = 0.55;
const R = W / 2;
const T = 0.05;
const POST_Z = -1.35;

const ARCH = (() => {
  const p = [[0, 0], [0, H0]];
  for (let i = 1; i < 14; i++) {
    const t = Math.PI - (i / 14) * Math.PI;
    p.push([R + R * Math.cos(t), H0 + R * Math.sin(t)]);
  }
  p.push([W, H0], [W, 0]);
  return p;
})();

const ground = prism(rect(0.15, 1.85, -0.35, 1.35), POST_Z - 0.06, POST_Z, (a, b, e) => [a, b, e]);
const post = prism(rect(0.86, 1.14, 0.36, 0.64), POST_Z, 0, (a, b, e) => [a, b, e]);
const body = prism(ARCH, 0, L, (a, b, e) => [e, a, b]);
const front = ARCH.map(([y, z]) => [L, y, z]);
const back = ARCH.map(([y, z]) => [0, y, z]);

function door(phi) {
  const s = Math.sin(phi);
  const c = Math.cos(phi);
  const at = (y, z, u) => [L + u * c + z * s, y, -u * s + z * c];
  const top = H0 + R;
  return {
    panel: prism(ARCH, 0, T, at),
    handle: prism(rect(0.42, 0.58, top - 0.16, top - 0.08), T, T + 0.07, at),
  };
}

function flag(psi) {
  const s = Math.sin(psi);
  const c = Math.cos(psi);
  const at = (a, p, e) => [0.5 + a * c - p * s, e, H0 * 0.55 + a * s + p * c];
  return {
    arm: prism(rect(-0.06, 0.72, -0.035, 0.035), W + 0.02, W + 0.05, at),
    plate: prism(rect(0.5, 0.78, 0.035, 0.24), W + 0.02, W + 0.05, at, { cls: 'accent' }),
  };
}

const letter = (x0, x1, opts) => prism(rect(x0, x1, 0.2, 0.8), 0.03, 0.06, (a, b, e) => [a, b, e], opts);

export const mailbox = (intensity = 0.6) => {
  const maxDoor = ((55 + 35 * intensity) * Math.PI) / 180;
  const maxSlide = 0.35 + 0.55 * intensity;
  return {
    label: '一个信箱：靠近时前门打开、信件滑出、红旗升起',
    bounds() {
      const d = door(Math.PI / 2);
      const f = flag(Math.PI / 2);
      return [ground, post, body, d.panel, d.handle, f.arm, f.plate, letter(L - 0.95, L + 0.9)].flatMap((p) =>
        p.faces.flatMap((x) => x.v),
      );
    },
    init: () => ({ open: 0, flag: 0 }),
    still(s) {
      s.flag = 1;
    },
    step(s, input) {
      let goal = input.pinned ? 1 : input.near;
      if (input.idle) goal = demo(input.t) ? 0.85 : 0;
      const a = spring(s, 'open', goal, 0.05, 0.8);
      const b = spring(s, 'flag', s.open > 0.5 ? 1 : 0, 0.06, 0.86);
      return a || b;
    },
    render(s, uid) {
      const open = clamp(s.open);
      const phi = open * maxDoor;
      const slide = smooth(0.55, 1, open) * maxSlide;
      const x0 = L - 0.95 + slide;
      const x1 = x0 + 0.9;
      const d = door(phi);
      const f = flag((clamp(s.flag, -0.1, 1.1) * Math.PI) / 2);
      const active = open > 0.25;

      let out = draw(ground) + draw(post) + draw(body);
      if (open > 0.02) {
        let inner = polygon(front, 'fo') + polyline(back, 'lo');
        for (const [y, z] of [[0, 0], [W, 0], [0, H0], [W, H0]]) inner += line([0, y, z], [L, y, z], 'lo');
        inner += draw(letter(x0, Math.min(x1, L), { open1: x1 > L }), active);
        out += clipped(uid, front, inner);
      }
      out += phi > Math.PI / 4 ? draw(d.handle, active) + draw(d.panel, active) : draw(d.panel, active) + draw(d.handle, active);
      if (x1 > L + 0.01) {
        out += draw(letter(Math.max(x0, L), x1, { open0: x0 < L }), true);
        if (x1 - L > 0.3) out += polyline([[x1, 0.2, 0.06], [x1 - 0.26, 0.5, 0.06], [x1, 0.8, 0.06]], 'hi');
      }
      return out + draw(f.arm) + draw(f.plate);
    },
  };
};
