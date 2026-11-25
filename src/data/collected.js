// /listen 和 /read 的数据：按需 SSR 时从 Cloudflare Worker（workers/collect）拉取。
// 拉取失败时回退仓库里的 listen.json / read.json 兜底，不阻塞页面渲染。
// 通过环境变量 COLLECT_URL 指定 Worker 地址（例如 https://yishan-collect.<subdomain>.workers.dev）。
import listenFallback from './listen.json';
import readFallback from './read.json';

function baseUrl() {
  return process.env.COLLECT_URL || import.meta.env.COLLECT_URL || 'https://yishan-collect.liyishan.workers.dev';
}

async function load(name, fallback, valid) {
  const base = baseUrl();
  const url = new URL(`${name}.json`, base.endsWith('/') ? base : `${base}/`).href;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!valid(data)) throw new Error('unexpected shape');
    return data;
  } catch (err) {
    console.warn(`[collected] 未能读取 ${url}：${err.message}，改用仓库里的 ${name}.json（${fallback.generated_at}）`);
    return fallback;
  }
}

export const getListen = () => load('listen', listenFallback, (d) => Array.isArray(d.daily) && Boolean(d.top));
export const getRead = () => load('read', readFallback, (d) => Array.isArray(d.daily) && Array.isArray(d.years));
