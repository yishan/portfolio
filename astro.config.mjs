import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://yishan.li',
  // 短记页改名为 notes，旧链接继续可用
  redirects: {
    '/ksana': '/notes',
  },
});
