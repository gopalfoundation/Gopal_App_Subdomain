import {build} from 'vite';
import {readdir, mkdir, cp, rm} from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd(), dist = path.join(root,'dist');
const hosting = path.join(dist,'hosting'), site = path.join(root,'firebase/functions/site');
const generated = (await readdir(dist, {withFileTypes:true})).filter(item=>item.name!=='hosting');
if (!site.startsWith(root+path.sep) || path.relative(root,site).replaceAll('\\','/') !== 'firebase/functions/site') throw Error('Unsafe build output directory.');
if (!hosting.startsWith(root+path.sep) || path.relative(root,hosting).replaceAll('\\','/') !== 'dist/hosting') throw Error('Unsafe Hosting output directory.');
await rm(site,{recursive:true,force:true});
await rm(hosting,{recursive:true,force:true});
await mkdir(hosting,{recursive:true}); await mkdir(site,{recursive:true});
async function copy(directory, relative='') {
  for (const item of await readdir(directory,{withFileTypes:true})) {
    const rel = path.posix.join(relative,item.name);
    const source = path.join(directory,item.name);
    if (item.isDirectory()) await copy(source,rel);
    else {
      const html = item.name.endsWith('.html') || item.name === 'sitemap-0.xml';
      // Exact Hosting files bypass rewrites. Admin HTML and mutable CMS JSON
      // must never be uploaded as anonymous static files.
      if (!html && ['content/ram.json','content/sita.json','content/website.json'].includes(rel)) continue;
      if (!html && rel.startsWith('admin/')) continue;
      const target = path.join(html?site:hosting,rel);
      await mkdir(path.dirname(target),{recursive:true}); await cp(source,target);
    }
  }
}
for (const item of generated) {
  const source=path.join(dist,item.name);
  if (item.isDirectory()) await copy(source,item.name);
  else { const target=path.join(item.name.endsWith('.html') || item.name === 'sitemap-0.xml'?site:hosting,item.name); await cp(source,target); }
}
await build({configFile:false, publicDir:false, ssr:{noExternal:true}, build:{outDir:'firebase/functions/lib', emptyOutDir:true, ssr:'firebase/index.mjs', target:'node22', rollupOptions:{external:['cheerio','firebase-functions/v2/https','firebase-functions/params','@google-cloud/storage'],output:{entryFileNames:'index.mjs'}}}});
console.log('Firebase output: dist/hosting (assets); firebase/functions (protected HTML + secure APIs).');
