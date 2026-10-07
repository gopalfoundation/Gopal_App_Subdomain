import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import path from 'node:path';
import {createLocalAdminSetup} from './local-admin-setup.mjs';
import {createRegistrationApi,registrationConfig,verifyAdminPassword} from '../src/server/registrations.mjs';

const origin='http://127.0.0.1:4321',password='test-only-setup-password';
async function harness(t,initial='') {
  const base=path.resolve('.astro');await mkdir(base,{recursive:true});const root=await mkdtemp(path.join(base,'setup-test-'));
  t.after(async()=>{if(!root.startsWith(base+path.sep))throw Error('Unsafe test cleanup');await rm(root,{recursive:true,force:true});});
  const file=path.join(root,'.env.local');if(initial)await writeFile(file,initial);
  const readConfig=async()=>registrationConfig({SITE_ORIGIN:origin,...parseEnv(await readFile(file,'utf8').catch(()=>''))});
  let time=1000000;const handle=createLocalAdminSetup({root,readConfig,now:()=>time});
  const call=(data,{ip='127.0.0.1',requestOrigin=origin,cookie='',method=data?'POST':'GET'}={})=>handle(new Request(origin+'/admin/setup/?returnTo=%2Fadmin%2Fsita%2F',{method,headers:data?{Origin:requestOrigin,'Content-Type':'application/x-www-form-urlencoded',cookie}:{},...(data?{body:new URLSearchParams(data).toString()}:{})}),{ip});
  const ticket=async()=>{const response=await call();assert.equal(response.status,200);const cookie=response.headers.get('set-cookie').split(';')[0];return {cookie,token:cookie.split('=')[1]};};
  return {root,file,readConfig,call,ticket,advance:ms=>{time+=ms;}};
}
test('local setup creates private hashed credentials and the shared login works without Google',async t=>{
  const h=await harness(t),ticket=await h.ticket();
  const result=await h.call({token:ticket.token,password,confirmation:password},{cookie:ticket.cookie});assert.equal(result.status,303);assert.equal(result.headers.get('location'),'/admin/login/?returnTo=%2Fadmin%2Fsita%2F');
  const saved=await readFile(h.file,'utf8'),config=await h.readConfig();assert.ok(!saved.includes(password));assert.equal(await verifyAdminPassword(password,config.passwordHash),true);assert.equal(config.sessionSecret.length,64);assert.equal(config.backendToken.length,64);
  const api=createRegistrationApi({readConfig:h.readConfig,readContent:async()=>({}),secure:false});
  const signed=await api.handle(new Request(origin+'/api/admin/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({password})}));assert.equal(signed.status,200);
  assert.equal(await api.authorize(new Request(origin+'/admin/sita/',{headers:{cookie:signed.headers.get('set-cookie').split(';')[0]}})),true);
  assert.equal((await h.call()).status,303);
  await h.call({token:ticket.token,password:'another-test-password',confirmation:'another-test-password'},{cookie:ticket.cookie});assert.equal(await readFile(h.file,'utf8'),saved);
});
test('setup preserves unrelated environment values and existing private backend credentials',async t=>{
  const secret='test-only-backend-secret-'.repeat(3),session='test-only-session-secret-'.repeat(3),initial=`# Keep this comment\nOTHER_SETTING=preserved\nREGISTRATION_BACKEND_SECRET=${secret}\nADMIN_SESSION_SECRET=${session}\nREGISTRATION_BACKEND_URL=https://script.google.com/macros/s/test-only/exec\n`;
  const h=await harness(t,initial),ticket=await h.ticket();assert.equal((await h.call({token:ticket.token,password,confirmation:password},{cookie:ticket.cookie})).status,303);const saved=await readFile(h.file,'utf8');assert.ok(saved.startsWith(initial));assert.equal((await h.readConfig()).backendToken,secret);assert.equal((await h.readConfig()).sessionSecret,session);
});
test('bootstrap rejects remote clients, cross-origin requests, missing tokens and expired tickets',async t=>{
  const h=await harness(t),ticket=await h.ticket(),data={token:ticket.token,password,confirmation:password};
  assert.equal((await h.call(null,{ip:'192.168.1.2'})).status,403);
  assert.equal((await h.call(data,{cookie:ticket.cookie,requestOrigin:'https://evil.example'})).status,403);
  assert.equal((await h.call(data)).status,403);
  h.advance(600001);assert.equal((await h.call(data,{cookie:ticket.cookie})).status,403);
  await assert.rejects(readFile(h.file),{code:'ENOENT'});
});
test('validation errors do not create credentials and incomplete existing secrets are not overwritten',async t=>{
  const h=await harness(t),ticket=await h.ticket();assert.equal((await h.call({token:ticket.token,password:'short',confirmation:'short'},{cookie:ticket.cookie})).status,400);await assert.rejects(readFile(h.file),{code:'ENOENT'});
  const partial=await harness(t,'REGISTRATION_BACKEND_SECRET=existing-short-value\n'),p=await partial.ticket();assert.equal((await partial.call({token:p.token,password,confirmation:password},{cookie:p.cookie})).status,503);assert.equal(await readFile(partial.file,'utf8'),'REGISTRATION_BACKEND_SECRET=existing-short-value\n');
});
test('simultaneous setup attempts cannot replace the winning password',async t=>{
  const h=await harness(t),one=await h.ticket(),two=await h.ticket();
  const a=h.call({token:one.token,password,confirmation:password},{cookie:one.cookie}),b=h.call({token:two.token,password:'test-only-second-password',confirmation:'test-only-second-password'},{cookie:two.cookie});
  assert.deepEqual([(await a).status,(await b).status].sort(),[303,503]);assert.equal(await verifyAdminPassword(password,(await h.readConfig()).passwordHash),true);
});
test('hosted login never offers unauthenticated password creation',async()=>{
  const api=createRegistrationApi({readConfig:async()=>({origin:'https://site.example.org'}),readContent:async()=>({})});const response=await api.handle(new Request('https://site.example.org/admin/login/'));assert.ok(!(await response.text()).includes('/admin/setup/'));
});
