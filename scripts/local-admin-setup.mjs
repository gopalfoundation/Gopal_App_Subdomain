import {randomBytes} from 'node:crypto';
import {readFile,writeFile,mkdir,open,rename,unlink} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import path from 'node:path';
import {adminPasswordHash} from '../src/server/registrations.mjs';

const setupPath='/admin/setup/';
const loopback=value=>['127.0.0.1','::1','::ffff:127.0.0.1'].includes(value);
const target=value=>/^\/admin(?:\/|$)/.test(value||'')&&!/^\/admin\/(login|setup)(?:\/|$)/.test(value)&&!value.includes('\\')?value:'/admin/';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const headers={'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store, private','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"};
const cookie=(token,age)=>`sitaram_setup=${token}; Path=${setupPath}; HttpOnly; SameSite=Strict; Max-Age=${age}`;
function page(token,returnTo,error='',status=200) {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Set Up SITA RAM Admin</title><style>body{font:16px/1.6 system-ui;background:#f5f7f8;color:#14374d;margin:0}main{max-width:420px;margin:8vh auto;padding:24px;background:white;border:1px solid #dce2e6;border-radius:8px}h1{font-size:26px}label,input,button{display:block;width:100%;box-sizing:border-box}input,button{padding:12px;margin:8px 0 20px;border:1px solid #b6c4cd;border-radius:4px}button{background:#14374d;color:white;cursor:pointer}input:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid #c99230;outline-offset:3px}[role=alert]{color:#952c28}@media(max-width:480px){main{margin:24px 16px}}</style></head><body><main><h1>Set Up Admin Access</h1><p>Choose one password for the SITA and RAM control centers on this computer.</p>${error?`<p role="alert">${escape(error)}</p>`:''}<form method="post" action="${setupPath}?returnTo=${encodeURIComponent(target(returnTo))}"><input type="hidden" name="token" value="${token}"><label>New Admin Password<input type="password" name="password" autocomplete="new-password" minlength="12" maxlength="256" required aria-describedby="password-help"></label><p id="password-help">Use at least 12 characters. Keep your password private.</p><label>Confirm Password<input type="password" name="confirmation" autocomplete="new-password" minlength="12" maxlength="256" required></label><button type="submit">Create Admin Access</button></form><p>You can connect Google registrations later. Participant submissions remain disabled until that connection is ready.</p><a href="/sita/">Return to Website</a></main></body></html>`,{status,headers:{...headers,'Set-Cookie':cookie(token,600)}});
}
async function formBody(req) {
  const reader=req.body?.getReader();let size=0;const chunks=[];
  if(reader)while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();throw Error('Request too large.');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return new URLSearchParams(new TextDecoder().decode(bytes));
}
export function createLocalAdminSetup({root,readConfig,now=Date.now}) {
  const tokens=new Map();let attempts=0,until=0;
  return async function handle(req,{ip}={}) {
    const url=new URL(req.url);
    if(url.pathname!==setupPath&&url.pathname!==setupPath.slice(0,-1))return null;
    const settings=await readConfig();
    if(!loopback(ip)||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.origin!==settings.origin)return new Response('Local setup only.',{status:403,headers});
    const login='/admin/login/?returnTo='+encodeURIComponent(target(url.searchParams.get('returnTo')));
    if(settings.passwordHash)return new Response(null,{status:303,headers:{...headers,Location:login}});
    for(const [token,expires] of tokens)if(expires<=now())tokens.delete(token);
    if(req.method==='GET') {
      if(tokens.size>=100)return new Response('Please retry later.',{status:429,headers});
      const token=randomBytes(32).toString('hex');tokens.set(token,now()+600000);return page(token,url.searchParams.get('returnTo'));
    }
    if(req.method!=='POST')return new Response('Method not supported.',{status:405,headers});
    if(req.headers.get('origin')!==url.origin||req.headers.get('content-type')?.split(';')[0]!=='application/x-www-form-urlencoded')return new Response('Use the local setup page.',{status:403,headers});
    if(now()>=until){attempts=0;until=now()+900000;}if(++attempts>5)return new Response('Too many attempts. Please retry in 15 minutes.',{status:429,headers});
    let form;try{form=await formBody(req);}catch{return new Response('Request too large.',{status:413,headers});}
    const token=form.get('token'),supplied=req.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith('sitaram_setup='))?.slice(14);
    if(!token||token!==supplied||!tokens.has(token))return new Response('Reopen the setup page and try again.',{status:403,headers});
    const password=form.get('password')||'';
    if(password.length<12||password.length>256||password!==form.get('confirmation'))return page(token,url.searchParams.get('returnTo'),'Use at least 12 characters and enter the same password twice.',400);
    let lock,temporary;
    const lockPath=path.join(root,'.astro/admin-setup.lock'),file=path.join(root,'.env.local');
    try {
      await mkdir(path.dirname(lockPath),{recursive:true});lock=await open(lockPath,'wx',0o600);
      if((await readConfig()).passwordHash)return new Response(null,{status:303,headers:{...headers,Location:login}});
      const existing=await readFile(file,'utf8').catch(error=>{if(error.code==='ENOENT')return '';throw error;});
      const env=parseEnv(existing);
      if(env.ADMIN_PASSWORD_HASH?.trim())throw Error('Already configured');
      if((settings.sessionSecret&&settings.sessionSecret.length<32)||(settings.backendToken&&settings.backendToken.length<32))throw Error('Incomplete private settings');
      const values={SITE_ORIGIN:settings.origin,ADMIN_PASSWORD_HASH:await adminPasswordHash(password),ADMIN_SESSION_SECRET:settings.sessionSecret||randomBytes(32).toString('hex'),REGISTRATION_BACKEND_SECRET:settings.backendToken||randomBytes(32).toString('hex')};
      const additions=Object.entries(values).filter(([key])=>!env[key]?.trim()).map(([key,value])=>`${key}=${value}`).join('\n');
      temporary=path.join(root,'.astro/admin-setup-'+randomBytes(12).toString('hex')+'.tmp');
      await writeFile(temporary,existing+(existing&&!existing.endsWith('\n')?'\n':'')+additions+'\n',{flag:'wx',mode:0o600});
      // Preserve unrelated private settings and reject edits made while setup was running.
      if(await readFile(file,'utf8').catch(error=>{if(error.code==='ENOENT')return '';throw error;})!==existing)throw Error('Private settings changed');
      await rename(temporary,file);temporary=null;tokens.clear();
      return new Response(null,{status:303,headers:{...headers,Location:login,'Set-Cookie':cookie('',0)}});
    }catch{return page(token,url.searchParams.get('returnTo'),'Setup could not be completed. Your existing private settings have been preserved. Retry or use the private setup guide.',503);}
    finally{if(temporary)await unlink(temporary).catch(()=>{});if(lock){await lock.close();await unlink(lockPath).catch(()=>{});}}
  };
}
