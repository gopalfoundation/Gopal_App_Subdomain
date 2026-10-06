import { readFile, writeFile, mkdir, rename, readdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';
import { validateContent } from '../src/lib/ram/model.mjs';
import { privateRamApi } from './ram-private-api.mjs';

export async function latestVideos(channelId, request = fetch) {
  if (!/^UC[\w-]{22}$/.test(channelId)) throw new Error('Please enter a valid YouTube channel ID.');
  const response = await request(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('YouTube could not supply this channel feed. Check the channel ID and try again.');
  const xml = await response.text();
  const feed = new XMLParser({ ignoreAttributes: false }).parse(xml)?.feed;
  const entries = Array.isArray(feed?.entry) ? feed.entry : feed?.entry ? [feed.entry] : [];
  return entries.map(entry => ({ id: `yt-${entry['yt:videoId']}`, url: `https://www.youtube.com/watch?v=${entry['yt:videoId']}`, title: String(entry.title || 'RAM Video'), description: String(entry['media:group']?.['media:description'] || '').slice(0,2000), thumbnail: '', publishedAt: entry.published || '', enabled: true, featured: false, source: 'feed', displayOrder: 0 })).filter(item => /^yt-[\w-]{11}$/.test(item.id));
}

export async function syncRamVideos(logger) {
  const file = path.resolve('public/content/ram.json');
  const content = JSON.parse(await readFile(file,'utf8'));
  if (!content.videoSettings.automatic || !content.videoSettings.channelId) return;
  try {
    const uploads = await latestVideos(content.videoSettings.channelId);
    for (const video of uploads) if (!content.videos.some(v => v.id === video.id)) content.videos.push({...video,displayOrder:content.videos.length+1});
    await writeFile(file,JSON.stringify(content,null,2)+'\n');
    logger.info(`RAM YouTube feed: ${uploads.length} recent uploads available.`);
  } catch (error) { logger.warn(`RAM YouTube feed unavailable; keeping curated videos. ${error.message}`); }
}

export default function ramDevApi() {
  const root = process.cwd();
  const publishedPath = path.join(root, 'public/content/ram.json');
  const draftPath = path.join(root, '.astro/ram-draft.json');
  let publishing = false;
  async function readJson(file) { return JSON.parse(await readFile(file, 'utf8')); }
  async function saveJson(file, value) {
    await mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(value, null, 2) + '\n');
    await rename(temporary, file);
  }
  return {
    name: 'ram-local-content-editor',
    configureServer(server) {
      server.middlewares.use(privateRamApi({root}));
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url, 'http://localhost');
        if (!url.pathname.startsWith('/api/ram/')) return next();
        response.setHeader('Content-Type', 'application/json');
        response.setHeader('Cache-Control', 'no-store');
        const reply = (status, value) => { response.statusCode = status; response.end(JSON.stringify(value)); };
        try {
          const host = new URL(`http://${request.headers.host}`).hostname;
          if (!['localhost','127.0.0.1','[::1]'].includes(host)) return reply(403, { error: 'The RAM editor is available on this computer only.' });
          if (request.method === 'GET' && url.pathname === '/api/ram/content') {
            const published = await readJson(publishedPath);
            const savedDraft = await readJson(draftPath).catch(() => null);
            const draft = savedDraft?.updatedAt === published.updatedAt ? savedDraft : null;
            // Build-time uploads are cached metadata, not edits to draft curation.
            if (draft) for (const video of published.videos.filter(v => v.source === 'feed')) if (!draft.videos.some(v => v.id === video.id)) draft.videos.push({...video,displayOrder:draft.videos.length+1});
            return reply(200, { published, draft, staleDraft: Boolean(savedDraft && !draft) });
          }
          if (request.method === 'GET' && url.pathname === '/api/ram/media') {
            const entries = await readdir(path.join(root, 'public/uploads/ram')).catch(() => []);
            return reply(200, entries.filter(name => /\.(png|jpg|webp)$/.test(name)).map(name => ({ id: name.split('.')[0], name: 'Uploaded Image', url: `/uploads/ram/${name}`, alt: '' })));
          }
          if (request.method !== 'POST') return reply(405, { error: 'Method not supported.' });
          const origin = request.headers.origin;
          if (!origin || new URL(origin).host !== request.headers.host || request.headers['content-type'] !== 'application/json') return reply(403, { error: 'Please use the RAM control center to save changes.' });
          let body = '';
          for await (const chunk of request) {
            body += chunk;
            if (body.length > 9 * 1024 * 1024) return reply(413, { error: 'Please choose an image smaller than 5 MB.' });
          }
          const payload = JSON.parse(body);
          if (url.pathname === '/api/ram/upload') {
            const bytes = Buffer.from(payload.data || '', 'base64');
            if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new Error('Please choose an image smaller than 5 MB.');
            let extension = '';
            if (bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) extension = 'png';
            else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) extension = 'jpg';
            else if (bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP') extension = 'webp';
            if (!extension) throw new Error('Please upload a PNG, JPEG or WebP image.');
            const id = randomUUID();
            const directory = path.join(root, 'public/uploads/ram');
            await mkdir(directory, { recursive: true });
            await writeFile(path.join(directory, `${id}.${extension}`), bytes);
            return reply(200, { id, name: String(payload.name || 'Uploaded Image').slice(0,120), url: `/uploads/ram/${id}.${extension}`, alt: '' });
          }
          if (url.pathname === '/api/ram/videos') return reply(200, { videos: await latestVideos(payload.channelId) });
          if (!['/api/ram/draft','/api/ram/publish'].includes(url.pathname)) return reply(404, { error: 'Editor action not found.' });
          validateContent(payload.content);
          if (publishing) return reply(409, { error: 'Another save is in progress. Please try again.' });
          publishing = true;
          try {
            const existing = await readJson(publishedPath);
            if (payload.revision !== existing.updatedAt) return reply(409, { error: 'RAM was updated in another window. Reload this editor before publishing.' });
            if (url.pathname.endsWith('/publish')) {
              payload.content.updatedAt = new Date().toISOString();
              await saveJson(publishedPath, payload.content);
            }
            await saveJson(draftPath, payload.content);
            return reply(200, { content: payload.content, published: url.pathname.endsWith('/publish') });
          } finally { publishing = false; }
        } catch (error) { return reply(400, { error: error.message || 'Unable to save RAM changes.' }); }
      });
    }
  };
}
