import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createFirebaseApp} from '../firebase/runtime.mjs';
import {privateFileBucket} from '../firebase/storage.mjs';
import {memoryBucket} from '../firebase/memory-bucket.mjs';
import {adminPasswordHash} from '../src/server/registrations.mjs';
import {NodeHtmlRewriter} from '../firebase/html-rewriter.mjs';
const origin='https://programs.gloryofpeaceandlove.org', password='Synthetic-adapter-QA-2026';
const env={SITE_ORIGIN:origin,ADMIN_PASSWORD_HASH:await adminPasswordHash(password),ADMIN_SESSION_SECRET:'synthetic-session-'.repeat(4),REGISTRATION_BACKEND_URL:'https://script.google.com/macros/s/synthetic-test/exec',REGISTRATION_BACKEND_SECRET:'synthetic-backend-'.repeat(4)};
const ram=JSON.parse(await readFile(new URL('../public/content/ram.json',import.meta.url),'utf8'));
function harness() {
  const records=[],bucket=memoryBucket(); let cookie='',assetCalls=0;
  const app=createFirebaseApp({env,bucket,assets:async()=>{assetCalls++;return new Response('<!doctype html><html><head><title>Seed</title><link rel="canonical"><meta name="robots"><meta property="og:url"></head><body><div data-ram-root></div><article data-ram-detail></article><div data-initiative-testimonials></div><nav id="primary-menu"></nav></body></html>',{headers:{'Content-Type':'text/html'}});},request:async(_url,options)=>{
    const p=JSON.parse(options.body);assert.equal(p.token,env.REGISTRATION_BACKEND_SECRET);
    if(p.action==='submitRegistration'){records.push(p.record);return Response.json({success:true,submissionId:p.record.submissionId});}
    return Response.json({success:true,records});
  }});
  const call=(url,{data,authenticated=false,requestOrigin=origin}={})=>app(new Request(origin+url,{method:data?'POST':'GET',headers:{...(authenticated?{Cookie:cookie}:{}),...(data?{Origin:requestOrigin,'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})}));
  return {app,bucket,records,call,get assetCalls(){return assetCalls;},login:async()=>{const r=await call('/api/admin/login',{data:{password}});assert.equal(r.status,200);assert.ok(r.headers.get('set-cookie').startsWith('__session='));assert.ok(r.headers.get('set-cookie').includes('HttpOnly'));assert.ok(r.headers.get('set-cookie').includes('Secure'));cookie=r.headers.get('set-cookie').split(';')[0];}};
}
test('Firebase authorizes Admin before HTML, including percent-encoded routes, and protects participant reads',async()=>{
  const h=harness();for(const route of ['/admin','/admin/ram','/%61dmin/sita','/admin%2fram'])assert.equal((await h.call(route)).status,302);
  assert.equal((await h.call('/api/ram/registrations/responses')).status,401);assert.equal(h.assetCalls,0);
  await h.login();const r=await h.call('/admin/ram',{authenticated:true});assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'no-store, private');
  assert.equal((await h.call('/api/testimonials/public?initiative=RAM')).status,200);
});
test('RAM online drafts remain private, publication persists and SSR uses the new content',async()=>{
  const h=harness();await h.login();const content=structuredClone(ram);content.videoSettings.automatic=false;content.hero.tagline='Synthetic published RAM change';
  assert.equal((await h.call('/api/ram/draft',{authenticated:true,data:{content,revision:ram.updatedAt}})).status,200);
  assert.notEqual((await(await h.call('/content/ram.json')).json()).hero.tagline,content.hero.tagline);
  assert.equal((await h.call('/api/ram/publish',{authenticated:true,data:{content,revision:ram.updatedAt}})).status,200);
  const html=await(await h.call('/ram')).text();assert.ok(html.includes('Synthetic published RAM change'));
  assert.equal((await h.call('/api/ram/publish',{authenticated:true,data:{content,revision:ram.updatedAt}})).status,409);
  assert.equal((await h.call('/api/ram/draft',{authenticated:true,requestOrigin:'https://evil.example',data:{content,revision:ram.updatedAt}})).status,403);
});
test('new RAM slugs render crawlable HTML and unpublished records do not render',async()=>{
  const h=harness();await h.login();const content=structuredClone(ram);content.videoSettings.automatic=false;
  content.programs[0].slug='synthetic-new-slug';content.programs[0].title='Synthetic New Program';
  assert.equal((await h.call('/api/ram/publish',{authenticated:true,data:{content,revision:ram.updatedAt}})).status,200);
  const r=await h.call('/ram/programs/synthetic-new-slug');assert.equal(r.status,200);assert.ok((await r.text()).includes('<h1>Synthetic New Program</h1>'));
  assert.equal((await h.call('/ram/programs/missing')).status,404);
});
test('Firebase private submission adapter stores only after receipt and response reads require sign-in',async()=>{
  const h=harness(),o=ram.opportunities[0];
  const payload={submissionId:'synthetic-submission-20261006',opportunityId:o.id,formId:o.formId,programId:o.programId,initiative:'RAM',responses:{name:'Synthetic QA Participant',email:'qa@example.org',phone:'1234567890',city:'Test City',age:'25',consent:'Yes'}};
  const r=await h.call('/api/ram/registrations/submit',{data:payload});assert.equal(r.status,200);assert.equal((await r.json()).success,true);assert.equal(h.records.length,1);
  assert.equal((await h.call('/api/ram/registrations/responses')).status,401);await h.login();assert.equal((await(await h.call('/api/ram/registrations/responses',{authenticated:true})).json()).records[0].answers[0].value,'Synthetic QA Participant');
  const failed=createFirebaseApp({env,bucket:memoryBucket(),assets:async()=>new Response(''),request:async()=>Response.json({success:false})});
  const f=await failed(new Request(origin+'/api/ram/registrations/submit',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(payload)}));assert.equal(f.status,503);assert.equal((await f.json()).success,false);
});
test('Node HTML adapter preserves escaping and selector mutation behavior',async()=>{
  const r=await new NodeHtmlRewriter().on('h1',{element(el){el.setInnerContent('<script>unsafe</script>');}}).on('a',{element(el){el.setAttribute('href','/ram/');}}).transform(new Response('<html><head></head><body><h1>Seed</h1><a>RAM</a></body></html>'));
  const html=await r.text();assert.ok(html.includes('&lt;script&gt;unsafe&lt;/script&gt;'));assert.ok(html.includes('href="/ram/"'));
});
test('private Google file adapter pins reads and uses generation conditions, never public ACLs',async()=>{
  const calls=[];
  const bucket={file:(_key,options)=>({getMetadata:async()=>[{generation:'123',contentType:'application/json'}],download:async()=>{calls.push(options);return[Buffer.from('{"ok":true}')];},save:async(_value,options)=>{calls.push(options);}})};
  const adapter=privateFileBucket(bucket);assert.deepEqual(await(await adapter.get('cms/ram.json')).json(),{ok:true});assert.equal(calls[0].generation,'123');
  await adapter.put('cms/ram.json','{}',{onlyIf:{etagMatches:'123'}});assert.equal(calls[1].preconditionOpts.ifGenerationMatch,123);assert.equal(calls[1].public,undefined);
  await adapter.put('cms/ram.json','{}',{onlyIf:new Headers({'If-None-Match':'*'})});assert.equal(calls[2].preconditionOpts.ifGenerationMatch,0);
  assert.equal(await privateFileBucket({file:()=>({save:async()=>{throw{code:412};}})}).put('cms/ram.json','{}'),null);
});
