import { defineConfig, passthroughImageService } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import ramDevApi, { syncRamVideos } from './scripts/ram-dev-api.mjs';
import sitaDevApi, { syncSitaVideos } from './scripts/sita-dev-api.mjs';
import testimonialsDevApi from './scripts/testimonials-dev-api.mjs';
import websiteDevApi from './scripts/website-dev-api.mjs';

export default defineConfig({
  // Approved assets use plain img tags. Do not process untrusted images with Sharp.
  image: {service:passthroughImageService()},
  site: 'https://programs.gloryofpeaceandlove.org',
  integrations: [sitemap({filter:url=>!/^\/(admin|ram\/program\/?$|ram\/article\/?$|sita\/program\/?$|sita\/article\/?$)/.test(new URL(url).pathname)}), { name: 'initiative-youtube-feeds', hooks: { 'astro:build:start': async ({ logger }) => { if(process.env.SKIP_VIDEO_SYNC!=='true'){await syncRamVideos(logger); await syncSitaVideos(logger);} } } }],
  vite: { plugins: [ramDevApi(), sitaDevApi(), testimonialsDevApi(), websiteDevApi()], server: { fs: { deny: ['.env','.env.*','*.{crt,pem}','**/.git/**','**/.ram-private.json','**/private-responses/**','**/src/data/testimonials.json','**/.astro/testimonials-draft.json','**/.astro/website-draft.json','**/.astro/testimonial-media/**','**/.astro/admin-setup-*.tmp'] } } },
  output: 'static'
});
