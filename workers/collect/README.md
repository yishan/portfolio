# yishan-collect

Cloudflare Worker + D1，为 yishan.li 收集 Spotify 收听记录和微信读书数据。主站 `/listen` 与 `/read` 通过 Vercel 按需 SSR 读取 `/listen.json` 和 `/read.json`（带 Edge CDN 缓存，见 `src/data/collected.js`）。

## 定时任务（UTC，北京时间 +8）

| cron | 任务 | 做什么 |
|---|---|---|
| `10 * * * *` | hourly | 最近 50 条播放写入 D1（重复跳过）+ 从 MusicBrainz 补 6 位艺人的流派 + 重算 `listen.json` |
| `20 16 * * *` | spotify-daily | 存当天榜单快照，重算 `listen.json` |
| `30 16 * * *` | weread-daily | 同步微信读书（往年与已结束月份缓存在 D1 `kv` 表），生成 `read.json` |

## Secrets

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REFRESH_TOKEN`（初始值；Spotify 轮换新 token 后会自动写入 D1 的 `kv` 表）
- `WEREAD_API_KEY`
- `ADMIN_TOKEN`

## 部署步骤

1. **创建 D1 数据库并填入 `wrangler.jsonc`**：
   ```sh
   npx wrangler d1 create yishan-collect
   # 将输出的 database_id 填入 wrangler.jsonc
   npm run db:migrate:remote
   ```
2. **获取 `SPOTIFY_REFRESH_TOKEN`**（在 Spotify Developer Dashboard 添加回调 `http://127.0.0.1:8888/callback`）：
   ```sh
   SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy npm run spotify:auth
   ```
3. **配置 Secrets 并部署**：
   ```sh
   npx wrangler secret put SPOTIFY_CLIENT_ID
   npx wrangler secret put SPOTIFY_CLIENT_SECRET
   npx wrangler secret put SPOTIFY_REFRESH_TOKEN
   npx wrangler secret put WEREAD_API_KEY
   npx wrangler secret put ADMIN_TOKEN
   npm run deploy
   ```
4. **首次触发同步**：
   ```sh
   curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" https://<worker>/run/spotify-daily
   curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" https://<worker>/run/hourly
   curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" https://<worker>/run/weread-daily
   ```
5. **配置 Vercel 主站环境变量**：添加 `COLLECT_URL=https://<worker>`（末尾不带 `/`），重新部署主站。

## 手动运维接口（需要 ADMIN_TOKEN）

```sh
curl https://<worker>/health
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" https://<worker>/run/hourly   # 或 spotify-daily、weread-daily
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://<worker>/status
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://<worker>/export/plays.jsonl > plays.jsonl   # 备份完整播放历史
```

## 本地调试

```sh
npm run db:migrate:local
npm run dev   # 凭据放在 .dev.vars（已忽略）
```
