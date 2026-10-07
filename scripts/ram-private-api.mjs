import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import path from 'node:path';
import { createRegistrationApi, registrationConfig, verifyAdminPassword } from '../src/server/registrations.mjs';
import { publicOpportunities as sitaOpportunities } from '../src/lib/sita/model.mjs';
import { createLocalAdminSetup } from './local-admin-setup.mjs';
export { validatedSubmission } from '../src/server/registrations.mjs';

// Retained only for legacy password hashes; new setup uses portable Web Crypto.
export function passwordHash(password,salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password,salt,64).toString('hex')}`;
}
export function verifyPassword(password,hash) {
  if (typeof password !== 'string' || password.length > 256 || !/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash || '')) return false;
  const [salt,digest] = hash.split(':');
  return timingSafeEqual(scryptSync(password,salt,64),Buffer.from(digest,'hex'));
}
export async function readRegistrationConfig(root = process.cwd()) {
  const env = {};
  for (const name of ['.env','.env.local']) Object.assign(env,await readFile(path.join(root,name),'utf8').then(parseEnv).catch(() => ({})));
  Object.assign(env,process.env);
  return {...registrationConfig(env),origin:env.SITE_ORIGIN || 'http://127.0.0.1:4321'};
}
export function privateRamApi({root = process.cwd(),config,readContent,request = fetch,now = Date.now,secure = false,initiative = 'RAM'} = {}) {
  const scope = initiative.toLowerCase();
  const getConfig=config || (() => readRegistrationConfig(root));
  const setup=createLocalAdminSetup({root,readConfig:getConfig,now});
  const api = createRegistrationApi({initiative,...(initiative === 'SITA' ? {opportunities:sitaOpportunities} : {}),readConfig:getConfig,readContent:readContent || (async () => JSON.parse(await readFile(path.join(root,`public/content/${scope}.json`),'utf8'))),request,now,secure,localSetup:!secure,verifyPassword:async (password,hash) => hash?.startsWith('pbkdf2:') ? verifyAdminPassword(password,hash) : verifyPassword(password,hash)});
  return async (req,res,next = () => {}) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname); }
    catch { res.statusCode = 400; return res.end('Invalid URL'); }
    const registration = pathname.startsWith(`/api/${scope}/registrations/`) || pathname.startsWith('/api/admin/');
    const login = /^\/admin\/login\/?$/.test(pathname);
    const guarded = /^\/admin(?:\/|$)/.test(pathname) || pathname.startsWith(`/api/${scope}/`);
    if (!registration && !login && !guarded) return next();
    try {
      const settings = await (config || (() => readRegistrationConfig(root)))();
      const headers = new Headers();
      for (const [key,value] of Object.entries(req.headers)) if (value) headers.set(key,Array.isArray(value) ? value.join(', ') : value);
      const options = {method:req.method,headers};
      if (!['GET','HEAD'].includes(req.method)) { options.body = req; options.duplex = 'half'; }
      const webRequest = new Request(`${secure ? 'https' : 'http'}://${req.headers.host}${req.url}`,options);
      const bootstrap = !secure ? await setup(webRequest,{ip:req.socket.remoteAddress}) : null;
      const result = bootstrap || (registration || login ? await api.handle(webRequest,{ip:req.socket.remoteAddress || 'local'}) : null);
      if (result) {
        res.statusCode = result.status;
        for (const [key,value] of result.headers) res.setHeader(key,value);
        return res.end(await result.text());
      }
      if (new URL(webRequest.url).origin !== settings.origin || !await api.authorize(webRequest)) {
        res.setHeader('Cache-Control','no-store, private');
        if (pathname.startsWith('/api/')) { res.statusCode = 401; res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({error:'Sign in to the SITA RAM Admin portal.'})); }
        res.statusCode = 302; res.setHeader('Location','/admin/login/?returnTo='+encodeURIComponent(req.url)); return res.end();
      }
      res.setHeader('Cache-Control','no-store, private');
      return next();
    } catch {
      res.statusCode = 503; res.setHeader('Content-Type','application/json'); res.setHeader('Cache-Control','no-store'); res.end(JSON.stringify({success:false,error:'SUBMISSION_FAILED'}));
    }
  };
}
