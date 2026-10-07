import {readFile} from 'node:fs/promises';
import path from 'node:path';
export function htmlAssets(root) {
  return async req => {
    const pathname = decodeURIComponent(new URL(req.url).pathname);
    if (pathname === '/sitemap-0.xml') return new Response(await readFile(path.join(root,'sitemap-0.xml')),{headers:{'Content-Type':'application/xml','Cache-Control':'no-store'}});
    const clean = pathname.replace(/\/+$/, '') || '/';
    if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').includes('..') || /\.[^.\/]+$/.test(clean)) return new Response('Not found',{status:404});
    let file = clean === '/' ? 'index.html' : clean.slice(1)+'/index.html';
    if (/^\/sita\/(?!programs$|articles$)[\w-]+$/.test(clean)) file = 'sita/program/index.html';
    if (/^\/(ram|sita)\/programs\/[\w-]+$/.test(clean)) file = clean.split('/')[1]+'/program/index.html';
    if (/^\/(ram|sita)\/articles\/[\w-]+$/.test(clean)) file = clean.split('/')[1]+'/article/index.html';
    try { return new Response(await readFile(path.join(root,file)),{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'}}); }
    catch { return new Response(await readFile(path.join(root,'404.html')),{status:404,headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'}}); }
  };
}
