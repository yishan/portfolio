// 生成社交分享图 public/og.png：先 build，再起一个临时 preview server，
// 用无头 Chrome（DevTools 协议）打开 /og，等字体和字符雨画完后截成 1200×630。
// Chrome 的 --screenshot 不能可靠地等页面画完，所以这里自己走协议。
// 用法：npm run og（Chrome 不在默认位置时设 CHROME_PATH）
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, preview } from 'astro';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = fileURLToPath(new URL('../public/og.png', import.meta.url));
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 4329;
const [W, H] = [1200, 630];

await build({ root, logLevel: 'warn' });
const server = await preview({ root, logLevel: 'warn', server: { port } });
const profile = await mkdtemp(join(tmpdir(), 'og-chrome-'));
const chrome = spawn(chromePath, [
  '--headless=new',
  '--hide-scrollbars',
  '--remote-debugging-port=0',
  `--user-data-dir=${profile}`,
  'about:blank',
]);

try {
  // Chrome 把调试地址打印在 stderr 上
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = '';
    chrome.stderr.on('data', (d) => {
      buf += d;
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) resolve(m[1]);
    });
    chrome.on('exit', () => reject(new Error('Chrome 意外退出')));
    setTimeout(() => reject(new Error('等不到 Chrome 的调试地址')), 15_000);
  });

  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    if (pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      pending.set(++id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const page = (method, params) => send(method, params, sessionId);

  await page('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await page('Page.navigate', { url: `http://localhost:${port}/og` });

  // og.astro 画完字符雨后会给 <html> 打上 data-ready
  const deadline = Date.now() + 20_000;
  for (;;) {
    const { result } = await page('Runtime.evaluate', {
      expression: `document.readyState === 'complete' && 'ready' in document.documentElement.dataset`,
    });
    if (result.value) break;
    if (Date.now() > deadline) throw new Error('/og 页面 20 秒内没有画完');
    await new Promise((r) => setTimeout(r, 200));
  }

  const { data } = await page('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 0, y: 0, width: W, height: H, scale: 1 },
  });
  await writeFile(out, Buffer.from(data, 'base64'));
  ws.close();
  console.log(`og image → ${out}`);
} finally {
  if (chrome.exitCode === null) {
    const exited = new Promise((r) => chrome.once('exit', r));
    chrome.kill();
    await exited;
  }
  await server.stop();
  await rm(profile, { recursive: true, force: true });
}
