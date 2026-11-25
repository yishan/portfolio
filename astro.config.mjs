import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://yishan.li',
  adapter: vercel(),
  // 短记页改名为 notes，旧链接继续可用
  redirects: {
    '/ksana': '/notes',
  },
});
