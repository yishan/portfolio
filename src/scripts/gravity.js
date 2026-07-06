import * as THREE from 'three';

const SPACING = 26;
const RADIUS = 190;
const STRENGTH = 1.0;
const SPRING = 0.03;
const DAMPING = 0.86;
const GLOW_EASE = 0.12;

export function initGravity(section, canvas) {
  if (!section || !canvas) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvas.remove();
    return;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  } catch {
    canvas.remove();
    return;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  section.classList.add('gravity-on');

  const scene = new THREE.Scene();
  const sprite = makeCircleSprite();
  const material = new THREE.PointsMaterial({
    size: 2.2 * dpr,
    sizeAttenuation: false,
    map: sprite,
    transparent: true,
    depthTest: false,
    vertexColors: true,
  });

  const dim = new THREE.Color();
  const bright = new THREE.Color();

  function applyStyle() {
    const styles = getComputedStyle(document.body);
    const ink = new THREE.Color(styles.color);
    const paper = new THREE.Color(styles.backgroundColor);
    const small = section.clientWidth < 720;
    dim.copy(paper).lerp(ink, small ? 0.05 : 0.07);
    bright.copy(paper).lerp(ink, small ? 0.4 : 0.6);
  }

  let camera = null;
  let points = null;
  let home, pos, vel, glow, colors, count;

  function build() {
    const w = section.clientWidth;
    const h = section.clientHeight;
    renderer.setSize(w, h, false);
    camera = new THREE.OrthographicCamera(0, w, 0, h, -1, 1);

    const small = w < 720;
    const spacing = small ? 34 : SPACING;
    material.size = (small ? 1.8 : 2.2) * dpr;
    applyStyle();

    const cols = Math.floor(w / spacing);
    const rows = Math.floor(h / spacing);
    const ox = (w - (cols - 1) * spacing) / 2;
    const oy = (h - (rows - 1) * spacing) / 2;
    count = cols * rows;

    home = new Float32Array(count * 2);
    vel = new Float32Array(count * 2);
    pos = new Float32Array(count * 3);
    glow = new Float32Array(count);
    colors = new Float32Array(count * 3);

    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const hx = ox + c * spacing;
        const hy = oy + r * spacing;
        home[i * 2] = hx;
        home[i * 2 + 1] = hy;
        pos[i * 3] = hx + (Math.random() - 0.5) * 260;
        pos[i * 3 + 1] = hy + (Math.random() - 0.5) * 260;
        pos[i * 3 + 2] = 0;
        colors[i * 3] = dim.r;
        colors[i * 3 + 1] = dim.g;
        colors[i * 3 + 2] = dim.b;
        i++;
      }
    }

    if (points) {
      points.geometry.dispose();
      scene.remove(points);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    points = new THREE.Points(geometry, material);
    scene.add(points);
  }

  build();

  let mx = -9999;
  let my = -9999;
  let pointerActive = false;
  let lastPointer = 0;

  section.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const rect = section.getBoundingClientRect();
    mx = e.clientX - rect.left;
    my = e.clientY - rect.top;
    pointerActive = true;
    lastPointer = performance.now();
  });
  section.addEventListener('pointerleave', () => {
    pointerActive = false;
  });

  let visible = true;
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  }).observe(section);

  let resizeTimer;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 200);
  }).observe(section);

  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  darkQuery.addEventListener('change', applyStyle);

  const R2 = RADIUS * RADIUS;

  function frame(t) {
    requestAnimationFrame(frame);
    if (!visible) return;

    let cx = mx;
    let cy = my;
    if (!pointerActive && t - lastPointer > 2500) {
      const w = section.clientWidth;
      const h = section.clientHeight;
      cx = w * 0.5 + Math.cos(t * 0.00023) * w * 0.34;
      cy = h * 0.5 + Math.sin(t * 0.00031) * h * 0.3;
    }

    for (let i = 0; i < count; i++) {
      const px = pos[i * 3];
      const py = pos[i * 3 + 1];
      let ax = (home[i * 2] - px) * SPRING;
      let ay = (home[i * 2 + 1] - py) * SPRING;

      const dx = cx - px;
      const dy = cy - py;
      const d2 = dx * dx + dy * dy;
      let target = 0;
      if (d2 < R2) {
        const d = Math.sqrt(d2) || 1;
        const f = (STRENGTH * (1 - d / RADIUS)) / d;
        ax += dx * f;
        ay += dy * f;
        target = 1 - d / RADIUS;
        target *= target;
      }

      vel[i * 2] = (vel[i * 2] + ax) * DAMPING;
      vel[i * 2 + 1] = (vel[i * 2 + 1] + ay) * DAMPING;
      pos[i * 3] += vel[i * 2];
      pos[i * 3 + 1] += vel[i * 2 + 1];

      glow[i] += (target - glow[i]) * GLOW_EASE;
      const g = glow[i];
      colors[i * 3] = dim.r + (bright.r - dim.r) * g;
      colors[i * 3 + 1] = dim.g + (bright.g - dim.g) * g;
      colors[i * 3 + 2] = dim.b + (bright.b - dim.b) * g;
    }

    points.geometry.attributes.position.needsUpdate = true;
    points.geometry.attributes.color.needsUpdate = true;
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}

function makeCircleSprite() {
  const size = 32;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
