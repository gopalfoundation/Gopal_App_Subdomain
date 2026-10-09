import ramContent from '../public/content/ram.json' with {type:'json'};
import sitaContent from '../public/content/sita.json' with {type:'json'};
import testimonials from '../src/data/testimonials.json' with {type:'json'};
import website from '../public/content/website.json' with {type:'json'};
import {createRegistrationApi, registrationConfig} from '../src/server/registrations.mjs';
import {createFileCms} from '../src/server/cms.mjs';
import {publicOpportunities as sitaOpportunities} from '../src/lib/sita/model.mjs';
import {renderWebsiteSettings} from '../src/server/website-pages.mjs';
import {NodeHtmlRewriter} from './html-rewriter.mjs';
import {renderInitiative,renderSitemap} from './pages.mjs';

export const PRODUCTION_ORIGIN = 'https://programs.gloryofpeaceandlove.org';
export function createFirebaseApp({env, bucket, assets, request=fetch, secure=true}) {
  let cms;
  const settings = () => registrationConfig({...env, SITE_ORIGIN:env.SITE_ORIGIN || PRODUCTION_ORIGIN});
  const ramApi = createRegistrationApi({readConfig:settings, readContent:() => cms.published('ram'), request, secure, cookieName:'__session'});
  cms = createFileCms({bucket, seeds:{ram:ramContent, sita:sitaContent, testimonials, website}, authorize:req => ramApi.authorize(req), origin:settings().origin, request});
  const sitaApi = createRegistrationApi({initiative:'SITA', opportunities:sitaOpportunities, readConfig:settings, readContent:() => cms.published('sita'), request, secure, cookieName:'__session'});
  return async (req, {ip='unknown'}={}) => {
    try {
      const url = new URL(req.url);
      let path; try { path = decodeURIComponent(url.pathname); } catch { return new Response('Invalid URL',{status:400}); }
      if (path.includes('\\') || path.includes('\0') || path.split('/').includes('..')) return new Response('Invalid URL',{status:400});
      if (/^\/resources\/?$/.test(path)) return new Response(null,{status:301,headers:{Location:'/articles/'}});
      const apiResponse = await ramApi.handle(req,{ip}) || await sitaApi.handle(req,{ip});
      if (apiResponse) return apiResponse;
      const cmsResponse = await cms.handle(req); if (cmsResponse) return cmsResponse;
      const guarded = /^\/admin(?:\/|$)/.test(path) || path.startsWith('/api/');
      if (guarded && !await ramApi.authorize(req)) return path.startsWith('/api/')
        ? Response.json({error:'Sign in to the SITA RAM Admin portal.'},{status:401,headers:{'Cache-Control':'no-store, private'}})
        : new Response(null,{status:302,headers:{Location:'/admin/login/?returnTo='+encodeURIComponent(url.pathname+url.search),'Cache-Control':'no-store, private'}});
      if (path.startsWith('/api/')) return Response.json({error:'Action unavailable.'},{status:404,headers:{'Cache-Control':'no-store'}});
      let response = await assets(req);
      if (path === '/sitemap-0.xml' && req.method === 'GET') return renderSitemap(req,response,cms);
      if (!guarded && req.method === 'GET') {
        response = await renderInitiative(req,response,cms);
        response = await renderWebsiteSettings(req,response,cms,NodeHtmlRewriter);
      }
      const headers = new Headers(response.headers);
      headers.set('X-Content-Type-Options','nosniff'); headers.set('X-Frame-Options','SAMEORIGIN');
      if (guarded || url.searchParams.has('preview') || url.searchParams.has('websitePreview')) { headers.set('Cache-Control','no-store, private'); headers.set('X-Robots-Tag','noindex, nofollow'); }
      return new Response(req.method === 'HEAD' ? null : response.body,{status:response.status,headers});
    } catch (error) {
      console.error('Firebase app request failed', {name:error?.name || typeof error, code:error?.code});
      return new Response('Website temporarily unavailable. Please retry.',{status:503,headers:{'Cache-Control':'no-store','Content-Type':'text/plain'}});
    }
  };
}
