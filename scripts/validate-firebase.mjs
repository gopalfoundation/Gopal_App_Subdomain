import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import {load} from 'cheerio';
const config = JSON.parse(await readFile('firebase.json','utf8'));
assert.equal(config.hosting[0].target,'gloryofpeaceandlove-subdomain');
assert.equal(config.hosting[0].public,'dist/hosting');
assert.equal(config.hosting[0].rewrites.at(-1).function.functionId,'programsApp');
const major=['','ram','sita','community-programs','programs','about','get-involved','contact','articles','admin','admin/ram','admin/sita'];
assert.equal(config.hosting[0].redirects.find(r=>r.source==='/resources').destination,'/articles/');
for (const route of major) await readFile(path.join('firebase/functions/site',route,'index.html'));
async function files(root) {const result=[];for(const e of await readdir(root,{withFileTypes:true})){const p=path.join(root,e.name);if(e.isDirectory())result.push(...await files(p));else result.push(p);}return result;}
let publicPages=0, adminPages=0;
for (const file of (await files('firebase/functions/site')).filter(file=>file.endsWith('.html'))) {
  const html=await readFile(file,'utf8');
  const route=path.relative('firebase/functions/site',file).replaceAll('\\','/');
  if (/^(?:admin|api)(?:\/|\.|$)/.test(route)) {
    assert.ok(!html.includes('AW-17887984435'),'Private HTML must not include the Google Ads tag: '+file);
    assert.ok(!html.includes('googletagmanager.com/gtag/js'),'Private HTML must not load gtag.js: '+file);
    adminPages++;
    continue;
  }
  const $=load(html);
  const loaders=$('script[src]').filter((_index,element)=>$(element).attr('src').startsWith('https://www.googletagmanager.com/gtag/js'));
  assert.equal(loaders.length,1,'Public HTML must load gtag.js exactly once: '+file);
  assert.equal(loaders.attr('src'),'https://www.googletagmanager.com/gtag/js?id=AW-17887984435');
  assert.equal(loaders.parents('head').length,1,'Google tag must be in the head: '+file);
  const configs=$('head script:not([src])').filter((_index,element)=>/gtag\('config',\s*'AW-17887984435'\)/.test($(element).html() || ''));
  assert.equal(configs.length,1,'Public HTML must configure the Ads ID exactly once: '+file);
  publicPages++;
}
assert.ok(publicPages>0 && adminPages>0,'Check both public and Admin generated HTML.');
console.log(`Google Ads tag verified: ${publicPages} public pages include one head loader/config; ${adminPages} Admin pages exclude it.`);
for(const file of await files('dist/hosting')) {
  assert.ok(!file.endsWith('.html'),'Static HTML could bypass the runtime guard: '+file);
  assert.ok(!file.replaceAll('\\','/').startsWith('dist/hosting/admin/'),'Do not upload obsolete Admin assets outside the authorization rewrite.');
  assert.ok(!/content[\\/](ram|sita|website)\.json$/.test(file),'CMS JSON would shadow its API: '+file);
  assert.ok(!/(\.env|private-responses|service-account|credentials)/i.test(file),'Private file in Hosting output: '+file);
}
const sitemap = await readFile('firebase/functions/site/sitemap-0.xml','utf8');
assert.ok(!sitemap.includes('/admin')); assert.ok(!sitemap.includes('localhost')); assert.ok(!sitemap.includes('sitaram.gloryofpeaceandlove.org'));
assert.ok(sitemap.includes('https://programs.gloryofpeaceandlove.org'));
const bundle = await readFile('firebase/functions/lib/index.mjs','utf8');
assert.ok(!/from ["']astro(?:\/|["'])/.test(bundle),'Do not ship the Astro request server.');
const runtimePackage=JSON.parse(await readFile('firebase/functions/package.json','utf8'));
assert.ok(!runtimePackage.dependencies.astro && !runtimePackage.dependencies.sharp && !runtimePackage.dependencies.esbuild,'Build tools must not be runtime dependencies.');
const runtimeLock=JSON.parse(await readFile('firebase/functions/package-lock.json','utf8'));
assert.ok(!Object.keys(runtimeLock.packages).some(key=>key.startsWith('../')),'Runtime lockfile must not link to source outside its package.');
console.log('Firebase artifacts verified: major HTML routes, guarded Admin, CMS rewrite safety, production sitemap.');
