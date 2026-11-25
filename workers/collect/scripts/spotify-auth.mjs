// 一次性本机 Spotify OAuth 授权脚本，用于换取 SPOTIFY_REFRESH_TOKEN。
// 前置准备：在 Spotify Developer Dashboard 的 App Settings 中添加 Redirect URI：
//   http://127.0.0.1:8888/callback
// 运行方式：
//   SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy node scripts/spotify-auth.mjs
import crypto from 'node:crypto';
import http from 'node:http';

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
    res.end('<h2>Spotify 授权成功</h2><p>可以关闭此页面，回到终端查看 SPOTIFY_REFRESH_TOKEN。</p>');
    console.log('\n授权成功！请将以下 refresh token 配置为 Worker Secret（SPOTIFY_REFRESH_TOKEN）：\n');
    console.log(body.refresh_token);
    console.log('');
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
