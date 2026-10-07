import content from '../public/content/ram.json' with {type:'json'};
import sitaContent from '../public/content/sita.json' with {type:'json'};
import testimonials from '../src/data/testimonials.json' with {type:'json'};
import website from '../public/content/website.json' with {type:'json'};
import {renderWebsiteSettings} from '../src/server/website-pages.mjs';
import { publicOpportunities as sitaOpportunities } from '../src/lib/sita/model.mjs';
import { createFileCms } from '../src/server/cms.mjs';
import { renderHostedPage } from '../src/server/sita-hosted-pages.mjs';
import { createRegistrationApi, registrationConfig } from '../src/server/registrations.mjs';

const apis = new WeakMap();
const sitaApis = new WeakMap();
const contentStores = new WeakMap();
export default {
  async fetch(request,env) {
    let api = apis.get(env);
    if (!api) { api = createRegistrationApi({readConfig:async () => registrationConfig(env),readContent:async () => content}); apis.set(env,api); }
    const handled = await api.handle(request,{ip:request.headers.get('CF-Connecting-IP') || 'unknown'});
    if (handled) return handled;
    let cms=contentStores.get(env);
    if(!cms){cms=createFileCms({bucket:env.BUCKET,seeds:{sita:sitaContent,testimonials,website},authorize:req=>api.authorize(req),origin:env.SITE_ORIGIN});contentStores.set(env,cms);}
    const cmsHandled=await cms.handle(request);if(cmsHandled)return cmsHandled;
    let sitaApi=sitaApis.get(env);
    if (!sitaApi) { sitaApi=createRegistrationApi({initiative:'SITA',opportunities:sitaOpportunities,readConfig:async()=>registrationConfig(env),readContent:async()=>cms.published('sita')});sitaApis.set(env,sitaApi); }
    const sitaHandled=await sitaApi.handle(request,{ip:request.headers.get('CF-Connecting-IP')||'unknown'});
    if(sitaHandled)return sitaHandled;
    const url = new URL(request.url);
    let pathname; try { pathname = decodeURIComponent(url.pathname); } catch { return new Response('Invalid URL',{status:400}); }
    const guarded = /^\/admin(?:\/|$)/.test(pathname) || pathname.startsWith('/api/ram/') || pathname.startsWith('/api/sita/') || pathname.startsWith('/api/testimonials/') || pathname.startsWith('/api/website/');
    if (guarded && !await api.authorize(request)) {
      if (pathname.startsWith('/api/')) return Response.json({error:'Sign in to the SITA RAM Admin portal.'},{status:401,headers:{'Cache-Control':'no-store'}});
      return new Response(null,{status:302,headers:{Location:'/admin/login/?returnTo='+encodeURIComponent(url.pathname+url.search),'Cache-Control':'no-store'}});
    }
    if (pathname === '/api/ram/content' && request.method === 'GET') return Response.json({published:content,draft:null},{headers:{'Cache-Control':'no-store, private'}});
    if (pathname === '/api/ram/media' && request.method === 'GET') return Response.json([],{headers:{'Cache-Control':'no-store, private'}});
    // Page configuration stays Git-based. The local control center remains its editor.
    if (pathname.startsWith('/api/ram/')) return Response.json({error:'Edit and publish page configuration using the local control center, then redeploy. Responses are managed here directly.'},{status:405,headers:{'Cache-Control':'no-store'}});
    const response = await env.ASSETS.fetch(request);
    if (!guarded) return renderWebsiteSettings(request,await renderHostedPage(request,response,env,cms,content),cms);
    const headers = new Headers(response.headers); headers.set('Cache-Control','no-store, private'); headers.set('X-Frame-Options','SAMEORIGIN');
    return new Response(response.body,{status:response.status,headers});
  }
};
