import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {validateWebsite,validUrl,primaryMarkup,cardsMarkup,footerMarkup,organizationSchema} from '../src/lib/website/model.mjs';
import {createFileCms} from '../src/server/cms.mjs';
import {websiteMiddleware} from './website-dev-api.mjs';
import {privateRamApi} from './ram-private-api.mjs';
import {adminPasswordHash} from '../src/server/registrations.mjs';
const seed=JSON.parse(await readFile(new URL('../public/content/website.json',import.meta.url),'utf8'));
const copy=()=>structuredClone(seed);
function bucket(){const map=new Map();let sequence=0;return {async get(key){const item=map.get(key);return item?{etag:item.etag,json:async()=>structuredClone(item.data)}:null;},async put(key,value,{onlyIf}={}){const previous=map.get(key);if(onlyIf instanceof Headers&&previous||onlyIf?.etagMatches&&previous?.etag!==onlyIf.etagMatches)return null;const etag=String(++sequence);map.set(key,{etag,data:JSON.parse(value)});return {etag};}};}
test('website config retains three curated initiatives and excludes global RSVP',()=>{assert.equal(validateWebsite(seed),seed);assert.equal(seed.navigation.groups.length,3);assert.ok(!primaryMarkup(seed).includes('/rsvp'));assert.equal((cardsMarkup(seed).match(/class="initiative-card"/g)||[]).length,3);});
test('navigation and footer markup escape labels and reject executable destinations',()=>{const c=copy();c.navigation.groups[0].name='<script>alert(1)</script>';assert.ok(!primaryMarkup(c).includes('<script>'));c.footer.description='<img onerror="x">';assert.ok(footerMarkup(c).includes('&lt;img'));for(const href of ['javascript:alert(1)','data:text/html,x','//evil.example','/\\evil.example','https://user:password@example.org'])assert.equal(validUrl(href),false);c.navigation.groups[0].links[0].href='javascript:alert(1)';assert.throws(()=>validateWebsite(c));});
test('admin can curate, reorder and disable groups/links without editing initiative data',()=>{const c=copy();c.navigation.groups.reverse();c.navigation.groups[0].links.reverse();c.navigation.groups[1].enabled=false;validateWebsite(c);const html=primaryMarkup(c);assert.ok(html.indexOf('Community Programs')<html.indexOf('RAM'));assert.ok(!html.includes('Explore SITA'));c.navigation.groups[0].links=Array.from({length:7},()=>({label:'Example',href:'/',enabled:true}));assert.throws(()=>validateWebsite(c),/6 links/);});
test('validation rejects missing groups, malformed visibility and unsafe images',()=>{for(const alter of [c=>c.navigation.groups.pop(),c=>c.initiativesPage.cards.push(c.initiativesPage.cards[0]),c=>c.home.sections[0].enabled='false',c=>c.site.logo='javascript:alert(1)',c=>c.seo.titlePattern='No placeholder']){const c=copy();alter(c);assert.throws(()=>validateWebsite(c));}});
test('organization schema cannot terminate its script element',()=>{const c=copy();c.site.organizationName='</script><script>alert(1)</script>';assert.ok(!organizationSchema(c).includes('</script>'));assert.equal(JSON.parse(organizationSchema(c)).name,c.site.organizationName);});
test('participant records and private credentials cannot be saved as website configuration',()=>{for(const key of ['responses','participants','backendToken','passwordHash','sheetCredentials']){const c=copy();c.navigation.groups[0][key]=[];assert.throws(()=>validateWebsite(c),/private credentials/);}});
test('hosted website drafts are private, require same-origin auth and survive independent CMS instances',async()=>{const store=bucket(),origin='https://example.org';let allowed=true;const cms=createFileCms({bucket:store,seeds:{website:seed},authorize:async()=>allowed,origin});const call=(path,data,from=origin)=>cms.handle(new Request(origin+path,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json',Origin:from}:{},...(data?{body:JSON.stringify(data)}:{})}));const c=copy();c.navigation.groups[0].links[0].label='Synthetic Draft';assert.equal((await call('/api/website/draft',{content:c,revision:seed.updatedAt})).status,200);assert.ok(!JSON.stringify(await(await call('/content/website.json')).json()).includes('Synthetic Draft'));allowed=false;assert.equal((await call('/api/website/content')).status,401);assert.equal((await call('/api/website/publish',{content:c,revision:seed.updatedAt})).status,401);allowed=true;assert.equal((await call('/api/website/publish',{content:c,revision:seed.updatedAt},'https://evil.example')).status,403);assert.equal((await call('/api/website/publish',{content:c,revision:seed.updatedAt})).status,200);assert.equal((await call('/api/website/publish',{content:c,revision:seed.updatedAt})).status,409);const other=createFileCms({bucket:store,seeds:{website:seed},authorize:async()=>true,origin});assert.equal((await other.published('website')).navigation.groups[0].links[0].label,'Synthetic Draft');});
test('local website editor guards private reads and preserves published data until confirmed publish',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'sitaram-website-test-'));await mkdir(path.join(root,'public/content'),{recursive:true});await writeFile(path.join(root,'public/content/website.json'),JSON.stringify(seed));
  let origin;const settings={passwordHash:await adminPasswordHash('test-only-website-password'),sessionSecret:'test-only-website-session-secret-'.repeat(3)};
  const guard=privateRamApi({root,config:async()=>({...settings,origin})});const middleware=websiteMiddleware({root,guard});
  const server=http.createServer((req,res)=>guard(req,res,()=>middleware(req,res,()=>{res.statusCode=404;res.end();})));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
  try{
    assert.equal((await fetch(origin+'/api/website/content')).status,401);
    const login=await fetch(origin+'/api/admin/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({password:'test-only-website-password'})});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
    const c=copy();c.home.headline='Synthetic Local Draft';const send=(action,revision=seed.updatedAt,from=origin)=>fetch(origin+'/api/website/'+action,{method:'POST',headers:{cookie,Origin:from,'Content-Type':'application/json'},body:JSON.stringify({content:c,revision})});
    assert.equal((await send('draft')).status,200);assert.equal(JSON.parse(await readFile(path.join(root,'public/content/website.json'),'utf8')).home.headline,seed.home.headline);
    assert.equal((await send('publish',seed.updatedAt,'https://evil.example')).status,403);assert.equal((await send('publish')).status,200);assert.equal((await send('publish')).status,409);
    assert.equal((await(await fetch(origin+'/content/website.json')).json()).home.headline,'Synthetic Local Draft');
  }finally{await new Promise(resolve=>server.close(resolve));await rm(root,{recursive:true,force:true});}
});
