import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { privateRamApi } from './ram-private-api.mjs';
import { websiteMiddleware } from './website-dev-api.mjs';

const root = path.resolve('dist/client');
const types = {'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const handle = privateRamApi();
const website = websiteMiddleware({guard:handle});
http.createServer((req,res) => handle(req,res,() => website(req,res,async () => {
  try {
    if (!['GET','HEAD'].includes(req.method)) { res.statusCode = 405; return res.end(); }
    const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if (pathname === '/api/ram/content') { res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({published:JSON.parse(await readFile('public/content/ram.json','utf8')),draft:null})); }
    if (pathname === '/api/ram/media') { res.setHeader('Content-Type','application/json'); return res.end('[]'); }
    let target = path.resolve(root,'.'+pathname);
    if (target !== root && !target.startsWith(root+path.sep)) { res.statusCode = 403; return res.end(); }
    if ((await stat(target)).isDirectory()) target = path.join(target,'index.html');
    const bytes = await readFile(target); res.setHeader('Content-Type',types[path.extname(target)] || 'application/octet-stream');
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch { res.statusCode = 404; res.end('Not found'); }
}))).listen(Number(process.env.RAM_API_PORT || 4321),'127.0.0.1',() => console.log('Local protected preview ready on http://127.0.0.1:'+(process.env.RAM_API_PORT || 4321)));
