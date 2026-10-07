import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { copy, validateContent, publicOpportunities, opportunityType, duplicateOpportunity, localDateTime, zonedDateTime, safeUrl, videoId } from '../src/lib/ram/model.mjs';
import { renderPage, renderSelectedForm, renderSuccess, renderVideos } from '../src/lib/ram/render.mjs';
import { successSettings } from '../src/lib/ram/model.mjs';
import { filterResponses, responseColumns, responseCsv } from '../src/lib/ram/responses.mjs';
import { privateRamApi, passwordHash, verifyPassword, validatedSubmission } from './ram-private-api.mjs';
import { Readable } from 'node:stream';
import { confirmedSubmission } from '../src/lib/ram/submission.mjs';
import { latestVideos } from './ram-dev-api.mjs';
const defaults = JSON.parse(await readFile(new URL('../public/content/ram.json',import.meta.url),'utf8'));

test('RAM initially shows programs and opportunities, with no form or success message', () => {
  validateContent(defaults);
  const html = renderPage(defaults);
  assert.equal(publicOpportunities(defaults).length,3);
  assert.ok(html.includes('data-selected-opportunity hidden'));
  assert.ok(!html.includes('data-ram-registration'));
  assert.ok(!html.includes('Registration Received!'));
});
test('closed opportunities disappear without removing permanent featured programs', () => {
  const content = copy(defaults);
  content.opportunities.forEach(o => {o.status = 'CLOSED';});
  assert.equal(publicOpportunities(content).length,0);
  assert.ok(renderPage(content).includes('Gita for Beginners'));
});
test('opening and closing dates, drafts and scheduled opportunities control availability', () => {
  const base = defaults.opportunities[0];
  const now = Date.parse('2026-12-02T12:00:00Z');
  assert.equal(opportunityType({...base,status:'DRAFT'},now),'');
  assert.equal(opportunityType({...base,opensAt:'2026-12-03T12:00:00Z'},now),'');
  assert.equal(opportunityType({...base,closesAt:'2026-12-01T12:00:00Z'},now),'');
  assert.equal(opportunityType({...base,status:'SCHEDULED',opensAt:'2026-12-01T12:00:00Z'},now),'OPEN_REGISTRATION');
  assert.equal(opportunityType({...base,status:'SCHEDULED',opensAt:''},now),'');
});
test('duplicating creates an independent form and draft, with no participant responses', () => {
  const content = copy(defaults);
  const source = content.opportunities[0];
  const duplicate = duplicateOpportunity(content,source.id,'new-batch');
  assert.equal(duplicate.status,'DRAFT');
  assert.equal(duplicate.programId,source.programId);
  assert.notEqual(duplicate.formId,source.formId);
  const form = content.forms.find(f => f.id === duplicate.formId);
  assert.deepEqual(form.questions,content.forms[0].questions);
  assert.deepEqual(form.success,content.forms[0].success);
  form.questions[0].label = 'Different Name';
  assert.notEqual(content.forms[0].questions[0].label,'Different Name');
  assert.ok(!JSON.stringify(duplicate).includes('responses'));
  validateContent(content);
});
test('each opportunity displays only its own form questions and submit wording', () => {
  const registration = renderSelectedForm(defaults.opportunities[0],defaults);
  const interest = renderSelectedForm(defaults.opportunities[2],defaults);
  assert.ok(registration.includes('How did you hear about us?'));
  assert.ok(!interest.includes('How did you hear about us?'));
  assert.ok(interest.includes('Notify Me About Future Sessions'));
});
test('submissions require positive backend acknowledgement, including HTTP 200 failures', async () => {
  const settings = {adapter:'googleAppsScript',endpoint:'https://example.org/register'};
  const success = () => Promise.resolve(new Response(JSON.stringify({success:true})));
  const rejected = () => Promise.resolve(new Response(JSON.stringify({success:false})));
  const html = () => Promise.resolve(new Response('<html>Login</html>'));
  await assert.rejects(confirmedSubmission({adapter:'local'}, {},success));
  await assert.rejects(confirmedSubmission(settings,{},rejected));
  await assert.rejects(confirmedSubmission(settings,{},html));
  await assert.rejects(confirmedSubmission(settings,{},() => Promise.resolve(new Response('Error',{status:500}))));
  assert.deepEqual(await confirmedSubmission(settings,{},success),{success:true});
});
test('time pickers respect the opportunity timezone and daylight saving', () => {
  assert.equal(zonedDateTime('2026-12-01T09:00','America/Los_Angeles'),'2026-12-01T17:00:00.000Z');
  assert.equal(zonedDateTime('2026-07-01T09:00','America/Los_Angeles'),'2026-07-01T16:00:00.000Z');
  assert.equal(localDateTime('2026-12-01T17:00:00Z','America/Los_Angeles'),'2026-12-01T09:00');
  assert.throws(() => zonedDateTime('2026-03-08T02:30','America/Los_Angeles'));
});
test('unsafe links and invalid YouTube hosts cannot create executable or arbitrary embeds', () => {
  assert.equal(safeUrl('javascript:alert(1)','/ram/'),'/ram/');
  assert.equal(safeUrl('//untrusted.example','/ram/'),'/ram/');
  assert.equal(videoId('https://youtu.be/M7lc1UVf-VE'),'M7lc1UVf-VE');
  assert.equal(videoId('https://untrusted.example/watch?v=M7lc1UVf-VE'),'');
});
test('invalid relationships and missing forms cannot be published', () => {
  const content = copy(defaults);
  content.opportunities[0].formId = 'missing';
  assert.throws(() => validateContent(content),/select a form/);
});
test('participant data is rejected by publishing and omitted from copied definitions', () => {
  const content = copy(defaults);
  content.opportunities[0].responses = [{name:'Example'}];
  content.forms[0].responses = [{name:'Example'}];
  assert.throws(() => validateContent(content),/Participant records/);
  const duplicate = duplicateOpportunity(content,content.opportunities[0].id,'private-safe-copy');
  assert.equal(duplicate.responses,undefined);
  assert.equal(content.forms.find(f => f.id === duplicate.formId).responses,undefined);
});
test('private credentials cannot be published anywhere in public content', () => {
  const content = copy(defaults); content.submission.backendToken = 'test-only';
  assert.throws(() => validateContent(content),/private credentials/);
});
test('YouTube feed import parses Atom entries without an API key and preserves titles', async () => {
  const atom = '<feed><entry><yt:videoId>M7lc1UVf-VE</yt:videoId><title>Clarity &amp; Character</title><published>2026-10-01T12:00:00Z</published><media:group><media:description>A RAM reflection.</media:description></media:group></entry></feed>';
  const videos = await latestVideos('UCabcdefghijklmnopqrstuv',async url => {
    assert.ok(url.includes('/feeds/videos.xml?channel_id='));
    return new Response(atom);
  });
  assert.equal(videos.length,1);
  assert.equal(videos[0].title,'Clarity & Character');
  assert.equal(videos[0].url,'https://www.youtube.com/watch?v=M7lc1UVf-VE');
  assert.equal(videos[0].publishedAt,'2026-10-01T12:00:00Z');
});

test('success settings belong to the batch, including shared forms and independent duplicates', () => {
  const content = copy(defaults), first = content.opportunities[0];
  const second = duplicateOpportunity(content,first.id,'separate-success');
  second.formId = first.formId;
  second.success = {...successSettings(second,content.forms[0]),heading:'English Batch Received',message:'English group',primaryEnabled:true,primaryLabel:'English Group',primaryUrl:'https://example.org/english',showClose:false,showContact:false,showRelated:false};
  const html = renderSuccess(second,content.forms[0],content.programs[0],'admin@example.org');
  assert.ok(html.includes('English Batch Received'));
  assert.ok(html.includes('https://example.org/english'));
  assert.ok(!html.includes('data-close-form'));
  assert.ok(!html.includes('mailto:'));
  assert.notEqual(first.success.heading,second.success.heading);
  assert.ok(!renderSuccess(first,content.forms[0],content.programs[0],'admin@example.org').includes('English Batch Received'));
});
test('playlist is a facade, includes selected state and omits missing duration and empty section', () => {
  const content = copy(defaults); content.videos = [{id:'test-video',url:'https://youtu.be/M7lc1UVf-VE',title:'Test Video',enabled:true}];
  const html = renderVideos(content);
  assert.ok(html.includes('aria-pressed="true"')); assert.ok(html.includes('data-video-player'));
  assert.ok(!html.includes('<iframe')); assert.ok(!html.includes('undefined'));
  content.videos = []; assert.ok(!renderPage(content).includes('id="ram-videos"'));
});
test('response tables and CSV retain historical questions, filter/sort, and neutralize formulas', () => {
  const rows = [{id:'test-record-one',submittedAt:'2026-10-01T00:00:00Z',status:'NEW',answers:[{id:'name',label:'Name',value:'=1+1'},{id:'old-field',label:'Previous Question',value:'One, "two"'}]},{id:'test-record-two',submittedAt:'2026-10-02T00:00:00Z',status:'REVIEWED',answers:[{id:'name',label:'Name',value:'Test Example'}]}];
  assert.equal(filterResponses(rows,{status:'NEW'}).length,1);
  assert.equal(filterResponses(rows,{search:'example'})[0].id,'test-record-two');
  assert.equal(filterResponses(rows,{sort:'oldest'})[0].id,'test-record-one');
  assert.equal(filterResponses(rows,{from:'2026-10-02'}).length,1);
  assert.ok(responseColumns(rows,{questions:[]}).some(q => q.id === 'old-field'));
  const csv = responseCsv(rows,{questions:[]}); assert.ok(csv.includes("'=1+1")); assert.ok(csv.includes('One, ""two""'));
});
test('server validation uses published opportunity and question definitions, not client metadata', () => {
  const opportunity = defaults.opportunities[0];
  const payload = {submissionId:'test-submission-id-1234',opportunityId:opportunity.id,programName:'Forged',responses:{name:'Test Example',email:'test@example.org',city:'Test City',age:'25',consent:'Yes',unknown:'Ignore'}};
  const record = validatedSubmission(defaults,payload);
  assert.notEqual(record.programName,'Forged'); assert.equal(record.status,'NEW');
  assert.ok(!record.answers.some(a => a.id === 'unknown'));
  assert.throws(() => validatedSubmission(defaults,{...payload,responses:{}}));
  const closed = copy(defaults); closed.opportunities[0].status = 'CLOSED'; assert.throws(() => validatedSubmission(closed,payload));
  assert.ok(verifyPassword('test-only-password',passwordHash('test-only-password')));
  assert.ok(!verifyPassword('different-password',passwordHash('test-only-password')));
});
test('private API requires sign-in, same-origin writes, scoped reads and expiring secure sessions', async () => {
  let time = Date.now(), calls = [];
  const stableHash = passwordHash('test-only-password');
  const handle = privateRamApi({secure:true,now:() => time,readContent:async () => defaults,config:async () => ({origin:'https://ram.example.org',passwordHash:stableHash,endpoint:'https://script.google.com/macros/s/test-deployment/exec',backendToken:'a'.repeat(64)}),request:async (_url,options) => {
    const payload = JSON.parse(options.body); calls.push(payload);
    return new Response(JSON.stringify({success:true,counts:{},records:[{id:'test-submission-id-1234',initiative:'RAM',opportunityId:defaults.opportunities[0].id,answers:[]},{id:'different',initiative:'RAM',opportunityId:'another-opportunity',answers:[]}]}));
  }});
  async function call(action,{method = 'GET',data = {},cookie = '',origin = 'https://ram.example.org',host = 'ram.example.org'} = {}) {
    const req = Readable.from(method === 'POST' ? [JSON.stringify(data)] : []);
    Object.assign(req,{url:'/api/ram/registrations/'+action,method,headers:{host,origin,'content-type':'application/json',cookie},socket:{remoteAddress:'test-client'}});
    const headers = {}; const res = {setHeader:(key,value) => {headers[key.toLowerCase()] = value;},end(value) {this.body = JSON.parse(value);}};
    await handle(req,res); return {code:res.statusCode,body:res.body,headers};
  }
  assert.equal((await call('summary')).code,401); assert.equal(calls.length,0);
  assert.equal((await call('login',{method:'POST',data:{password:'test-only-password'},origin:'https://evil.example'})).code,403);
  assert.equal((await call('session',{host:'evil.example'})).code,403);
  const login = await call('login',{method:'POST',data:{password:'test-only-password'}});
  assert.equal(login.code,200); assert.match(login.headers['set-cookie'],/HttpOnly; SameSite=Strict/); assert.match(login.headers['set-cookie'],/Secure/);
  const cookie = login.headers['set-cookie'].split(';')[0];
  const responses = await call('responses?opportunityId='+defaults.opportunities[0].id,{cookie});
  assert.equal(responses.code,200); assert.equal(responses.body.records.length,1);
  assert.equal((await call('status',{method:'POST',cookie,data:{opportunityId:defaults.opportunities[0].id,id:'test-submission-id-1234',status:'INVALID'}})).code,400);
  time += 31*60*1000; assert.equal((await call('summary',{cookie})).code,401);
  assert.equal(responses.headers['cache-control'],'no-store, private');
});
test('unconfigured backend cannot acknowledge success or expose responses', async () => {
  const handle = privateRamApi({config:async () => ({origin:'http://127.0.0.1:4321'}),readContent:async () => defaults});
  const req = Readable.from([JSON.stringify({submissionId:'test-submission-id-1234',opportunityId:defaults.opportunities[0].id,responses:{name:'Test Example',email:'test@example.org',city:'Test City',age:'25',consent:'Yes'}})]);
  Object.assign(req,{url:'/api/ram/registrations/submit',method:'POST',headers:{host:'127.0.0.1:4321',origin:'http://127.0.0.1:4321','content-type':'application/json'},socket:{remoteAddress:'test-client'}});
  const res = {setHeader() {},end(value) {this.body = JSON.parse(value);}};
  await handle(req,res); assert.equal(res.statusCode,503); assert.notEqual(res.body.success,true);
});
