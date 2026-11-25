// 一次性本机 Spotify OAuth 授权脚本，用于换取 SPOTIFY_REFRESH_TOKEN。
// 前置准备：在 Spotify Developer Dashboard 的 App Settings 中添加 Redirect URI：
//   http://127.0.0.1:8888/callback
// 运行方式：
//   SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy node scripts/spotify-auth.mjs
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const PORT = 8888;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
const SCOPES = ['user-read-recently-played', 'user-top-read'].join(' ');

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('请先提供环境变量 SPOTIFY_CLIENT_ID 和 SPOTIFY_CLIENT_SECRET：');
  console.error('  SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy node scripts/spotify-auth.mjs');
  process.exit(1);
}

const state = crypto.randomBytes(16).toString('hex');
const authUrl = new URL('https://accounts.spotify.com/authorize');
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('scope', SCOPES);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('state', state);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (url.pathname !== '/callback') {
    res.writeHead(404).end('Not Found');
    return;
  }

  const error = url.searchParams.get('error');
  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');

  if (error || !code || returnedState !== state) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`授权失败：${error || 'invalid state or missing code'}`);
    console.error('授权失败：', error || 'invalid state or missing code');
    server.close(() => process.exit(1));
    return;
  }

  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });
    const body = await tokenRes.json();
    if (!tokenRes.ok || !body.refresh_token) {
      throw new Error(body.error_description || body.error || `HTTP ${tokenRes.status}`);
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h2>Spotify 授权成功</h2><p>refresh token 已写入 .dev.vars，可以关闭此页面回到终端。</p>');

    const devVarsPath = path.resolve('.dev.vars');
    if (fs.existsSync(devVarsPath)) {
      const content = fs.readFileSync(devVarsPath, 'utf8');
      const next = /^SPOTIFY_REFRESH_TOKEN=.*$/m.test(content)
        ? content.replace(/^SPOTIFY_REFRESH_TOKEN=.*$/m, `SPOTIFY_REFRESH_TOKEN=${body.refresh_token}`)
        : `${content.trimEnd()}\nSPOTIFY_REFRESH_TOKEN=${body.refresh_token}\n`;
      fs.writeFileSync(devVarsPath, next);
      console.log('\n授权成功！SPOTIFY_REFRESH_TOKEN 已自动写入 .dev.vars。');
    } else {
      console.log('\n授权成功！请将以下 refresh token 配置为 Worker Secret（SPOTIFY_REFRESH_TOKEN）：\n');
      console.log(body.refresh_token);
      console.log('');
    }
    server.close(() => process.exit(0));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`换取 token 失败：${err.message}`);
    console.error('换取 token 失败：', err.message);
    server.close(() => process.exit(1));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('请在浏览器中打开以下链接完成 Spotify 授权：\n');
  console.log(authUrl.toString());
  console.log(`\n正在监听回调地址 ${REDIRECT_URI} ...`);
});
