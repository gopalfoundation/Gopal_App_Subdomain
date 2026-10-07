import { publicOpportunities, RESPONSE_STATUSES } from '../lib/ram/model.mjs';

const encoder = new TextEncoder();
const idPattern = /^[\w-]{1,120}$/;
const submissionPattern = /^[\w-]{16,100}$/;
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,'0')).join('');
const unhex = value => Uint8Array.from(value.match(/../g) || [], b => parseInt(b,16));
const constantEqual = (a,b) => { let mismatch = a.length ^ b.length; for (let i=0;i<Math.max(a.length,b.length);i++) mismatch |= (a[i] || 0) ^ (b[i] || 0); return mismatch === 0; };

export async function adminPasswordHash(password, salt = hex(crypto.getRandomValues(new Uint8Array(16)))) {
  const key = await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2',salt:unhex(salt),iterations:100000,hash:'SHA-256'},key,256);
  return `pbkdf2:100000:${salt}:${hex(bits)}`;
}
export async function verifyAdminPassword(password, hash) {
  if (typeof password !== 'string' || password.length > 256 || !/^pbkdf2:100000:[a-f0-9]{32}:[a-f0-9]{64}$/.test(hash || '')) return false;
  return constantEqual(encoder.encode(await adminPasswordHash(password,hash.split(':')[2])),encoder.encode(hash));
}
export function registrationConfig(env = {}) {
  return {origin:env.SITE_ORIGIN,endpoint:env.REGISTRATION_BACKEND_URL,backendToken:env.REGISTRATION_BACKEND_SECRET,passwordHash:env.ADMIN_PASSWORD_HASH,sessionSecret:env.ADMIN_SESSION_SECRET};
}
export function validatedSubmission(content,payload,now = Date.now(), initiative = 'RAM', opportunities = publicOpportunities) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid submission');
  const opportunity = opportunities(content,now).find(o => o.id === payload.opportunityId);
  if (!opportunity || !submissionPattern.test(payload.submissionId || '')) throw new Error('Invalid opportunity or submission');
  const form = content.forms.find(f => f.id === opportunity.formId);
  const program = content.programs.find(p => p.id === opportunity.programId);
  if ((payload.formId && payload.formId !== form.id) || (payload.programId && payload.programId !== program.id) || (payload.initiative && payload.initiative !== initiative) || payload.website) throw new Error('Invalid registration');
  const values = payload.answers || payload.responses;
  if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error('Invalid answers');
  const answers = [];
  for (const q of form.questions.filter(q => q.enabled && !['info','heading'].includes(q.type))) {
    let value = Object.hasOwn(values,q.id) ? values[q.id] : '';
    if (typeof value !== 'string' || value.length > 4000) throw new Error('Invalid answer');
    value = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim();
    if (q.required && !value) throw new Error('Required answer missing');
    if (value && q.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Invalid email');
    const options = q.type === 'yesNo' ? ['Yes','No'] : q.options;
    if (value && ['dropdown','singleChoice','yesNo','multipleChoice'].includes(q.type) && (q.type === 'multipleChoice' ? value.split('; ') : [value]).some(v => !options?.includes(v))) throw new Error('Invalid choice');
    if (value && ['consent','checkbox'].includes(q.type) && value !== 'Yes') throw new Error('Invalid consent');
    if (value && q.type === 'number' && (!Number.isFinite(Number(value)) || Number(value) < 0)) throw new Error('Invalid number');
    if (value && q.type === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value)) throw new Error('Invalid date');
    answers.push({id:q.id,label:q.label,type:q.type,value});
  }
  return {id:payload.submissionId,submissionId:payload.submissionId,submittedAt:new Date(now).toISOString(),initiative,programId:program.id,programName:program.title,opportunityId:opportunity.id,opportunityName:opportunity.name,formId:form.id,registrationType:opportunity.registrationType,status:'NEW',answers};
}

export function createRegistrationApi({readConfig,readContent,request = fetch,now = Date.now,verifyPassword = verifyAdminPassword,secure = true,initiative = 'RAM',opportunities = publicOpportunities,localSetup = false,cookieName = 'sitaram_admin'} = {}) {
  if (!['RAM','SITA'].includes(initiative)) throw new Error('Unsupported initiative');
  if (!/^[_a-zA-Z][_a-zA-Z0-9-]{0,63}$/.test(cookieName)) throw new Error('Invalid session cookie name');
  const prefix = '/api/'+initiative.toLowerCase()+'/registrations/';
  const attempts = new Map();
  function limited(key,max,window) {
    const time = now();
    for (const [id,bucket] of attempts) if (time >= bucket.until) attempts.delete(id);
    // Best-effort per-isolate protection. Apps Script also enforces global quotas.
    if (attempts.size >= 10000 && !attempts.has(key)) return true;
    const bucket = attempts.get(key) || {count:0,until:time+window};
    bucket.count++; attempts.set(key,bucket); return bucket.count > max;
  }
  const json = (code,data,headers = {}) => new Response(JSON.stringify(data),{status:code,headers:{'Content-Type':'application/json','Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff',...headers}});
  const backendConfigured = settings => /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(settings.endpoint || '') && (settings.backendToken || '').length >= 32;
  const adminConfigured = settings => Boolean(settings.passwordHash && (settings.sessionSecret || settings.backendToken || '').length >= 32);
  async function signature(settings,value) {
    const key = await crypto.subtle.importKey('raw',encoder.encode((settings.sessionSecret || settings.backendToken)+'\n'+settings.passwordHash),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    return hex(await crypto.subtle.sign('HMAC',key,encoder.encode('sitaram-admin-v1:'+value)));
  }
  async function authenticated(req,settings) {
    if (!adminConfigured(settings)) return false;
    const token = req.headers.get('cookie')?.match(new RegExp('(?:^|;\\s*)'+cookieName+'=([\\d]+\\.[a-f0-9]{32}\\.[a-f0-9]{64})(?:;|$)'))?.[1];
    if (!token) return false;
    const [expiry,nonce,digest] = token.split('.');
    if (Number(expiry) <= now() || Number(expiry) > now()+30*60*1000) return false;
    return constantEqual(unhex(digest),unhex(await signature(settings,expiry+'.'+nonce)));
  }
  const cookie = (value,age) => `${cookieName}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${secure ? '; Secure' : ''}`;
  async function provider(settings,action,data = {}) {
    if (!backendConfigured(settings)) throw new Error('NOT_CONFIGURED');
    const result = await request(settings.endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({token:settings.backendToken,action,initiative,...data}),signal:AbortSignal.timeout(15000)});
    const ack = await result.json().catch(() => null);
    if (!result.ok || ack?.success !== true) throw new Error('BACKEND_UNAVAILABLE');
    return ack;
  }
  async function authorize(req) {
    const settings = await readConfig();
    if (new URL(req.url).origin !== settings.origin || (secure && !settings.origin?.startsWith('https://'))) return false;
    return authenticated(req,settings);
  }
  function loginPage(configured,returnTo,error = '') {
    const target = /^\/admin(?:\/|$)/.test(returnTo || '') && !returnTo.startsWith('/admin/login') ? returnTo : '/admin/ram/';
    return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SITA RAM Admin</title><style>body{font:16px system-ui;background:#f5f7f8;color:#14374d;margin:0}main{max-width:420px;margin:12vh auto;padding:32px;background:white;border:1px solid #dce2e6;border-radius:8px}label,input,button{display:block;width:100%;box-sizing:border-box}input,button{padding:12px;margin-top:12px;border:1px solid #b6c4cd;border-radius:4px}button{background:#14374d;color:white;cursor:pointer}p{line-height:1.6}</style></head><body><main><h1>SITA RAM Admin</h1>${configured ? `<form method="post" action="/admin/login/?returnTo=${encodeURIComponent(target)}"><label>Admin Password<input type="password" name="password" autocomplete="current-password" required maxlength="256"></label><button>Sign In</button></form>` : (localSetup ? `<p>Choose your private admin password to get started on this computer.</p><p><a href="/admin/setup/?returnTo=${encodeURIComponent(target)}">Set Up Admin Access</a></p>` : '<p>Admin access needs one-time private setup. Follow REGISTRATION-BACKEND-SETUP.md in the project folder.</p>')}${error ? '<p role="alert">Sign-in could not be completed. Check your password or try again later.</p>' : ''}<p><a href="/ram/">Return to Website</a></p></main></body></html>`,{status:error ? 401 : 200,headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store, private','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"}});
  }
  async function handle(req,{ip = 'unknown'} = {}) {
    const url = new URL(req.url);
    const login = url.pathname === '/admin/login/' || url.pathname === '/admin/login';
    const api = url.pathname.startsWith(prefix) || url.pathname.startsWith('/api/admin/');
    if (!login && !api) return null;
    const action = login ? 'login' : url.pathname.split('/').at(-1);
    const submit = action === 'submit';
    const fail = code => json(code,{success:false,error:'SUBMISSION_FAILED'});
    try {
      const settings = await readConfig();
      if (login && req.method === 'GET' && !settings.origin) return loginPage(false,url.searchParams.get('returnTo'));
      if (!settings.origin || url.origin !== settings.origin || (secure && !settings.origin.startsWith('https://'))) return submit ? fail(403) : json(403,{error:'Untrusted request origin.'});
      if (login && req.method === 'GET') return loginPage(adminConfigured(settings),url.searchParams.get('returnTo'));
      if (!['GET','POST'].includes(req.method)) return submit ? fail(405) : json(405,{error:'Method not supported.'});
      let payload = {};
      if (req.method === 'POST') {
        const type = req.headers.get('content-type')?.split(';')[0].trim();
        if (req.headers.get('origin') !== settings.origin || (type !== 'application/json' && !(login && type === 'application/x-www-form-urlencoded'))) return submit ? fail(403) : json(403,{error:'Use this website to perform this action.'});
        const reader = req.body?.getReader(); let size = 0; const chunks = [];
        if (reader) while (true) { const {done,value} = await reader.read(); if (done) break; size += value.byteLength; if (size > 65536) { await reader.cancel(); return submit ? fail(413) : json(413,{error:'Request too large.'}); } chunks.push(value); }
        const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.length; }
        const text = new TextDecoder().decode(bytes);
        payload = login ? Object.fromEntries(new URLSearchParams(text)) : JSON.parse(text);
      }
      const isAdmin = await authenticated(req,settings);
      if (action === 'session' && req.method === 'GET') return json(200,{authenticated:isAdmin,configured:adminConfigured(settings),backendConfigured:isAdmin && backendConfigured(settings)});
      if (action === 'login' && req.method === 'POST') {
        if (!adminConfigured(settings)) return login ? loginPage(false) : json(503,{error:'Admin access needs private setup.'});
        if (limited('login:'+ip,5,15*60*1000)) return json(429,{error:'Too many sign-in attempts. Try again in 15 minutes.'});
        if (!await verifyPassword(payload.password,settings.passwordHash)) return login ? loginPage(true,url.searchParams.get('returnTo'),'Incorrect password') : json(401,{error:'Incorrect administrator password.'});
        const value = (now()+30*60*1000)+'.'+hex(crypto.getRandomValues(new Uint8Array(16)));
        const headers = {'Set-Cookie':cookie(value+'.'+await signature(settings,value),1800)};
        if (login) { const target = url.searchParams.get('returnTo'); return new Response(null,{status:303,headers:{...headers,'Cache-Control':'no-store',Location:/^\/admin(?:\/|$)/.test(target || '') && !target.startsWith('/admin/login') ? target : '/admin/ram/'}}); }
        return json(200,{success:true},headers);
      }
      if (submit && req.method === 'POST') {
        if (limited('submit:'+ip,20,60*1000)) return fail(429);
        let record; try { record = validatedSubmission(await readContent(),payload,now(),initiative,opportunities); } catch { return fail(400); }
        const ack = await provider(settings,'submitRegistration',{record});
        if (ack.submissionId !== record.id) return fail(503);
        return json(200,{success:true,submissionId:record.id});
      }
      if (!isAdmin) return json(401,{error:'Sign in to the SITA RAM Admin portal.'});
      if (action === 'logout' && req.method === 'POST') return json(200,{success:true},{'Set-Cookie':cookie('',0)});
      if (action === 'connection' && req.method === 'GET') {
        if (!backendConfigured(settings)) return json(200,{connected:false,configured:false,message:'Registration backend is not configured.'});
        await provider(settings,'testConnection'); return json(200,{connected:true,configured:true,message:'Connection Successful'});
      }
      if (action === 'summary' && req.method === 'GET') {
        const ack = await provider(settings,'summary'); return json(200,{counts:ack.counts || {},totals:ack.totals || {}});
      }
      const opportunityId = req.method === 'GET' ? url.searchParams.get('opportunityId') : payload.opportunityId;
      if (opportunityId && !idPattern.test(opportunityId)) return json(400,{error:'Invalid opportunity.'});
      // Historical responses remain accessible even if a configuration is renamed or removed.
      if (action === 'responses' && req.method === 'GET') {
        const ack = await provider(settings,'getResponses',{opportunityId:opportunityId || ''});
        const records = (ack.records || []).filter(r => r.initiative === initiative && (!opportunityId || r.opportunityId === opportunityId)).map(publicRecord);
        return json(200,{records,sheetUrl:/^https:\/\/docs\.google\.com\/spreadsheets\/d\/[\w-]+\/edit(?:[?#].*)?$/.test(ack.sheetUrl || '') ? ack.sheetUrl : ''});
      }
      if (action === 'response' && req.method === 'GET') {
        const id = url.searchParams.get('id');
        if (!submissionPattern.test(id || '') || !opportunityId) return json(400,{error:'Invalid response.'});
        const ack = await provider(settings,'getResponse',{opportunityId,id});
        if (ack.record?.initiative !== initiative || ack.record?.opportunityId !== opportunityId || ack.record?.id !== id) return json(404,{error:'Response not found.'});
        return json(200,{record:publicRecord(ack.record)});
      }
      if (action === 'status' && req.method === 'POST') {
        if (!opportunityId || !RESPONSE_STATUSES.includes(payload.status) || !submissionPattern.test(payload.id || '')) return json(400,{error:'Select a valid participant status.'});
        await provider(settings,'updateResponseStatus',{opportunityId,id:payload.id,status:payload.status}); return json(200,{success:true});
      }
      return json(404,{error:'Registration action not found.'});
    } catch (error) {
      if (submit) return fail(503);
      return json(503,{error:error.message === 'NOT_CONFIGURED' ? 'Registration backend is not configured. Follow REGISTRATION-BACKEND-SETUP.md.' : 'The private registration service is unavailable. Check the deployment and Script Properties, then retry.'});
    }
  }
  return {handle,authorize};
}
function publicRecord(r) {
  return {id:r.id,initiative:r.initiative,programId:r.programId,formId:r.formId,submittedAt:r.submittedAt,opportunityId:r.opportunityId,opportunityName:r.opportunityName,programName:r.programName,registrationType:r.registrationType,status:r.status,answers:(r.answers || []).map(a => ({id:a.id,label:a.label,type:a.type,value:a.value}))};
}
