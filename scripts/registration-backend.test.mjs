import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createRegistrationApi, adminPasswordHash, verifyAdminPassword, validatedSubmission } from '../src/server/registrations.mjs';
import { filterResponses, responseCsv } from '../src/lib/ram/responses.mjs';
import { confirmedSubmission } from '../src/lib/ram/submission.mjs';
import { renderSuccess } from '../src/lib/ram/render.mjs';
import worker from '../worker/index.mjs';

test('legacy RSVP cannot save participant data locally or acknowledge an unconfirmed receipt',async()=>{
  const source=await readFile(new URL('../public/scripts/site-overrides.js',import.meta.url),'utf8');
  const snippet=source.slice(source.indexOf('  async function sendSubmission('),source.indexOf('  function showSuccessModal('));
  assert.ok(!snippet.includes('localStorage'));
  let calls=0,ack={success:true,submissionId:'synthetic-legacy-receipt'};
  const context=vm.createContext({fetch:async()=>{calls++;return Response.json(ack);},Response});
  vm.runInContext(snippet,context);
  const payload={opportunityId:'gita-fall-2026',submissionId:'synthetic-legacy-receipt'};
  await assert.rejects(context.sendSubmission({rsvp:{adapter:'local'}},payload));assert.equal(calls,0);
  await assert.rejects(context.sendSubmission({rsvp:{endpoint:'https://script.google.com/macros/s/unsafe/exec'}},payload));assert.equal(calls,0);
  await context.sendSubmission({rsvp:{endpoint:'/api/ram/registrations/submit'}},payload);
  ack={success:true,submissionId:'wrong'};await assert.rejects(context.sendSubmission({rsvp:{endpoint:'/api/ram/registrations/submit'}},payload));
});

const content = JSON.parse(await readFile(new URL('../public/content/ram.json',import.meta.url),'utf8'));
const code = await readFile(new URL('../integrations/google-apps-script/ram-responses.gs',import.meta.url),'utf8');
const origin = 'https://ram.example.org', secret = 'test-only-secret-'.repeat(4);
const passwordHash = await adminPasswordHash('test-only-portal-password');
const settings = {origin,endpoint:'https://script.google.com/macros/s/test-only-deployment/exec',backendToken:secret,passwordHash,sessionSecret:'test-only-session-'.repeat(4)};
const payload = (index = 0,id = 'test-submission-00000001') => ({submissionId:id,initiative:'RAM',programId:content.opportunities[index].programId,opportunityId:content.opportunities[index].id,formId:content.opportunities[index].formId,submittedAt:'1900-01-01T00:00:00Z',responses:{name:'Backend QA Example',email:'qa@example.org',city:'Test City',age:'25',consent:'Yes',phone:'1234567890'}});

function simulatedGoogle() {
  const rows = [], cache = new Map(); let sheetExists = false, flushed = 0, calls = 0;
  const sheet = {
    appendRow(values) {rows.push(Array.from(values));},setFrozenRows() {},getLastRow:() => rows.length,
    getRange(row,column,height = 1,width = 1) {return {getValues:() => rows.slice(row-1,row-1+height).map(values => values.slice(column-1,column-1+width)),setValue(value) {rows[row-1][column-1] = value;}};}
  };
  const book = {getSheetByName:() => sheetExists ? sheet : null,insertSheet() {sheetExists = true;return sheet;},getUrl:() => 'https://docs.google.com/spreadsheets/d/test-private-sheet/edit'};
  const lock = {waitLock() {},hasLock:() => true,releaseLock() {}};
  const context = vm.createContext({LockService:{getScriptLock:() => lock},PropertiesService:{getScriptProperties:() => ({getProperty:key => key === 'REGISTRATION_BACKEND_SECRET' ? secret : 'test-private-sheet'})},SpreadsheetApp:{openById:() => book,flush() {flushed++;}},CacheService:{getScriptCache:() => ({get:key => cache.get(key),put:(key,value) => cache.set(key,value)})},ContentService:{MimeType:{JSON:'JSON'},createTextOutput:value => ({setMimeType:() => value})}});
  vm.runInContext(code,context);
  return {rows,context,get calls() {return calls;},get flushed() {return flushed;},request:async (_url,options) => {calls++;return new Response(context.doPost({postData:{contents:options.body}}));}};
}
function harness({google = simulatedGoogle(),config = settings} = {}) {
  let time = Date.now(), cookie = '';
  const api = createRegistrationApi({readConfig:async () => config,readContent:async () => content,request:google.request,now:() => time});
  const call = (action,{data,method = data ? 'POST' : 'GET',authenticated = true,requestOrigin = origin,body,headers = {}} = {}) => api.handle(new Request(origin+'/api/ram/registrations/'+action,{method,headers:{...(authenticated && cookie ? {cookie} : {}),...(method === 'POST' ? {'Content-Type':'application/json',Origin:requestOrigin} : {}),...headers},...(method === 'POST' ? {body:body ?? JSON.stringify(data)} : {})}),{ip:'test-client'});
  return {api,google,call,advance:ms => {time += ms;},login:async () => {const result = await call('login',{data:{password:'test-only-portal-password'}});assert.equal(result.status,200);cookie = result.headers.get('set-cookie').split(';')[0];return cookie;}};
}
test('portable portal password hashes verify without storing a plaintext password',async () => {
  assert.equal(await verifyAdminPassword('test-only-portal-password',passwordHash),true);
  assert.equal(await verifyAdminPassword('wrong',passwordHash),false);
  assert.equal(await verifyAdminPassword('wrong','invalid'),false);
  assert.ok(!passwordHash.includes('test-only-portal-password'));
});
test('real Apps Script code stores dynamic answers, stable IDs and server timestamp; retry is idempotent',async () => {
  const h = harness();
  const first = await h.call('submit',{data:payload()}); assert.equal(first.status,200);
  assert.deepEqual(await first.json(),{success:true,submissionId:payload().submissionId});
  assert.equal(h.google.rows.length,2); assert.equal(h.google.flushed,1);
  const stored = JSON.parse(h.google.rows[1][14]);
  for (const key of ['initiative','formId','programId','opportunityId']) assert.equal(stored[key],payload()[key]);
  assert.notEqual(stored.submittedAt,payload().submittedAt);
  assert.ok(stored.answers.some(a => a.id === 'consent' && a.value === 'Yes'));
  await h.call('submit',{data:payload()}); assert.equal(h.google.rows.length,2);
  assert.notEqual((await h.call('submit',{data:payload(1)})).status,200);
});
test('private reads require the shared portal session and do not leak secrets or unrelated initiatives',async () => {
  const h = harness();
  assert.equal((await h.call('responses')).status,401); assert.equal(h.google.calls,0);
  await h.call('submit',{data:payload()}); await h.login();
  const result = await h.call('responses'); const body = await result.json();
  assert.equal(body.records.length,1); assert.equal(result.headers.get('cache-control'),'no-store, private');
  assert.ok(!JSON.stringify(body).includes(secret));
  const mixed = structuredClone(validatedSubmission(content,payload(1,'test-submission-00000002'))); mixed.initiative = 'SITA';
  const other = JSON.parse(h.google.context.doPost({postData:{contents:JSON.stringify({token:secret,action:'submitRegistration',initiative:'SITA',record:mixed})}})); assert.equal(other.success,true);
  assert.equal((await (await h.call('responses')).json()).records.length,1);
  assert.equal((await (await h.call('summary')).json()).totals.total,1);
});
test('detail, saved internal status and actual summary counts persist independently of configuration',async () => {
  const h = harness(); await h.call('submit',{data:payload()}); await h.call('submit',{data:payload(1,'test-submission-00000002')}); await h.login();
  const id = payload().submissionId, opportunityId = payload().opportunityId;
  const detail = await (await h.call(`response?opportunityId=${opportunityId}&id=${id}`)).json(); assert.equal(detail.record.id,id);
  assert.equal((await h.call('status',{data:{id,opportunityId,status:'CONFIRMED'}})).status,200);
  assert.equal((await (await h.call(`response?opportunityId=${opportunityId}&id=${id}`)).json()).record.status,'CONFIRMED');
  assert.equal(content.opportunities[0].status,'OPEN_REGISTRATION');
  const summary = await (await h.call('summary')).json(); assert.equal(summary.counts[opportunityId],1); assert.equal(summary.totals.total,2); assert.equal(summary.totals.OPEN_WAITLIST,1);
  assert.equal((await h.call('status',{data:{id,opportunityId,status:'INVALID'}})).status,400);
  assert.equal((await h.call(`response?opportunityId=${payload(1).opportunityId}&id=${id}`)).status,503);
});
test('cross-origin writes, malformed/large requests and missing required answers cannot reach Google',async () => {
  const h = harness();
  assert.equal((await h.call('submit',{data:payload(),requestOrigin:'https://evil.example'})).status,403);
  assert.equal((await h.call('submit',{data:{...payload(),responses:{}}})).status,400);
  assert.equal((await h.call('submit',{data:{...payload(),formId:'wrong'}})).status,400);
  assert.equal((await h.call('submit',{data:payload(),body:'broken-json'})).status,503);
  assert.equal((await h.call('submit',{data:payload(),body:'x'.repeat(70000)})).status,413);
  assert.equal(h.google.calls,0);
});
test('backend failure is standardized; restore and retry stores exactly one row',async () => {
  const config = {...settings,backendToken:'incorrect-'.repeat(8)}, h = harness({config});
  const failed = await h.call('submit',{data:payload()}); assert.equal(failed.status,503);
  assert.deepEqual(await failed.json(),{success:false,error:'SUBMISSION_FAILED'}); assert.equal(h.google.rows.length,0);
  config.backendToken = secret; assert.equal((await h.call('submit',{data:payload()})).status,200); assert.equal(h.google.rows.length,2);
});
test('positive HTTP alone, ok:true, or a wrong submission ID cannot trigger success',async () => {
  const proxy = {adapter:'privateProxy',endpoint:'/api/ram/registrations/submit'};
  await assert.rejects(confirmedSubmission(proxy,{},async () => Response.json({ok:true})));
  const h = harness({google:{request:async () => Response.json({success:true,submissionId:'wrong-id'})}});
  assert.deepEqual(await (await h.call('submit',{data:payload()})).json(),{success:false,error:'SUBMISSION_FAILED'});
});
test('sessions expire, password/session-secret rotation revokes access, and login attempts are limited',async () => {
  const config = {...settings}, h = harness({config}); await h.login();
  assert.equal((await (await h.call('session')).json()).authenticated,true);
  h.advance(31*60*1000); assert.equal((await h.call('responses')).status,401);
  await h.login(); config.sessionSecret = 'rotated-secret-'.repeat(4); assert.equal((await h.call('responses')).status,401);
  for (let i=0;i<5;i++) await h.call('login',{data:{password:'wrong'}});
  assert.equal((await h.call('login',{data:{password:'wrong'}})).status,429);
});
test('anonymous Apps Script calls reveal nothing; spreadsheet formulas are stored as plain text',async () => {
  const google = simulatedGoogle();
  const denied = JSON.parse(google.context.doPost({postData:{contents:JSON.stringify({action:'getResponses',initiative:'RAM',token:'wrong'})}}));
  assert.equal(denied.success,false); assert.equal(google.rows.length,0);
  const h = harness({google}); await h.call('submit',{data:{...payload(),responses:{...payload().responses,name:'=HYPERLINK("bad")'}}});
  assert.equal(google.rows[1][10],'\'=HYPERLINK("bad")');
});
test('search/type/opportunity/date/status filters and CSV retain historical custom answers',async () => {
  const h = harness(); await h.call('submit',{data:payload()}); await h.call('submit',{data:payload(1,'test-submission-00000002')}); await h.login();
  const records = (await (await h.call('responses')).json()).records;
  assert.equal(filterResponses(records,{opportunityId:payload(1).opportunityId}).length,1);
  assert.equal(filterResponses(records,{registrationType:'OPEN_WAITLIST'}).length,1);
  assert.equal(filterResponses(records,{search:content.opportunities[0].name}).length,1);
  assert.equal(filterResponses(records,{status:'NEW'}).length,2);
  assert.equal(filterResponses(records,{from:'2099-01-01'}).length,0);
  const csv = responseCsv(filterResponses(records,{opportunityId:payload().opportunityId}));
  assert.ok(csv.includes('Backend QA Example')); assert.ok(csv.includes('Gita for Beginners')); assert.ok(csv.includes('consent') || csv.includes('I agree'));
});
test('per-opportunity contact URL and shared-form success content stay independent',() => {
  const opportunity = {...content.opportunities[0],success:{...content.opportunities[0].success,showContact:true,contactLabel:'Contact Batch Coordinator',contactUrl:'https://example.org/batch-contact'}};
  assert.ok(renderSuccess(opportunity,content.forms[0],content.programs[0],'default@example.org').includes('https://example.org/batch-contact'));
});
test('hosted Worker runs authentication before serving admin assets, including encoded URLs',async () => {
  let calls = 0;
  const env = {SITE_ORIGIN:origin,REGISTRATION_BACKEND_URL:settings.endpoint,REGISTRATION_BACKEND_SECRET:secret,ADMIN_PASSWORD_HASH:passwordHash,ADMIN_SESSION_SECRET:settings.sessionSecret,ASSETS:{fetch:async () => {calls++;return new Response('asset');}}};
  assert.equal((await worker.fetch(new Request(origin+'/admin/ram/'),env)).status,302); assert.equal(calls,0);
  assert.equal((await worker.fetch(new Request(origin+'/%61dmin/ram/'),env)).status,302); assert.equal(calls,0);
  assert.equal((await worker.fetch(new Request(origin+'/ram/'),env)).status,200); assert.equal(calls,1);
  const signedIn = await worker.fetch(new Request(origin+'/admin/login/?returnTo=%2Fadmin%2Fram%2F',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:'password=test-only-portal-password'}),env);
  assert.equal(signedIn.status,303); const cookie = signedIn.headers.get('set-cookie').split(';')[0];
  const portal = await worker.fetch(new Request(origin+'/admin/ram/',{headers:{cookie}}),env);
  assert.equal(portal.status,200); assert.equal(calls,2); assert.equal(portal.headers.get('cache-control'),'no-store, private');
});
