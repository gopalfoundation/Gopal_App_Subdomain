import {renderPage,programCard,articleCard} from '../lib/sita/render.mjs';
import {renderDetail} from '../lib/sita/detail.mjs';
import {publicTestimonials,testimonialMarkup} from '../lib/testimonials/model.mjs';
import {ordered,escape as e,safeUrl} from '../lib/sita/model.mjs';
export async function renderHostedPage(request,response,env,cms,ramContent,Rewriter=globalThis.HTMLRewriter) {
  if(request.method!=='GET')return response;
  const url=new URL(request.url),path=url.pathname.replace(/\/+$/,'');
  if(path==='/ram'&&Rewriter) {const feedback=publicTestimonials(await cms.published('testimonials'),'RAM');return new Rewriter().on('[data-initiative-testimonials]',{element(el){el.setInnerContent(testimonialMarkup(feedback,ramContent.programs),{html:true});}}).transform(response);}
  if(!/^\/sita(?:\/|$)/.test(path))return response;
  try {
    const c=await cms.published('sita'),feedback=await cms.published('testimonials');
    let selector='[data-sita-root]',html='',seo=c.seo,recordSlug='';
    if(path==='/sita')html=renderPage(c,publicTestimonials(feedback,'SITA'));
    else if(path==='/sita/programs'||path==='/sita/articles'){selector='[data-sita-list]';html=path.endsWith('/programs')?ordered(c.programs).filter(p=>p.active).map(programCard).join(''):ordered(c.articles).filter(a=>a.published&&a.initiative==='SITA').map(articleCard).join('');seo={...c.seo,title:path.endsWith('/programs')?'SITA Programs':'SITA Articles & Insights',canonical:'https://programs.gloryofpeaceandlove.org'+path+'/'};}
    else if(['/sita/program','/sita/article'].includes(path))return response;
    else {
      const article=path.startsWith('/sita/articles/'),slug=path.split('/').at(-1),record=(article?c.articles:c.programs).find(r=>r.slug===slug&&r.initiative==='SITA'&&(article?r.published:r.active));
      if(!record)return new Response('Page unavailable',{status:404,headers:{'Content-Type':'text/plain'}});
      recordSlug=record.slug;
      selector='[data-sita-detail]';html=renderDetail(record,c,article?'article':'program',publicTestimonials(feedback,'SITA',record.id));
      seo={title:record.seoTitle||record.title+' | SITA',description:record.seoDescription||record.shortDescription||record.excerpt||'',canonical:'https://programs.gloryofpeaceandlove.org'+path+'/',socialImage:record.socialImage||record.image,index:article?Boolean(record.body?.trim()):Boolean(record.index&&record.fullDescription?.length>200)};
      response=await env.ASSETS.fetch(new Request(new URL(article?'/sita/article/':'/sita/program/',url),request));
    }
    if(!Rewriter)return response;
    if(url.searchParams.get('preview')==='draft')seo={...seo,index:false};
    const headers=new Headers(response.headers);headers.set('Cache-Control','no-store');response=new Response(response.body,{status:200,headers});
    const rewriter=new Rewriter().on(selector,{element(el){el.setInnerContent(html,{html:true});if(recordSlug)el.setAttribute('data-sita-record-slug',recordSlug);}}).on('title',{element(el){el.setInnerContent(seo.title);}}).on('link[rel="canonical"]',{element(el){el.setAttribute('href',seo.canonical);}});
    rewriter.on('meta[name="robots"],meta[property="og:image"]',{element(el){el.remove();}}).on('head',{element(el){el.append(`<meta name="robots" content="${seo.index?'index, follow':'noindex, nofollow'}">${seo.socialImage?`<meta property="og:image" content="${e(new URL(safeUrl(seo.socialImage,'/logos/sita-logo.png'),'https://programs.gloryofpeaceandlove.org').href)}">`:''}`,{html:true});}}).on('meta[property="og:url"]',{element(el){el.setAttribute('content',seo.canonical);}});
    for(const [selector,value] of [['meta[name="description"]',seo.description],['meta[property="og:title"]',seo.socialTitle||seo.title],['meta[property="og:description"]',seo.socialDescription||seo.description]])rewriter.on(selector,{element(el){el.setAttribute('content',value||'');}});
    return rewriter.transform(response);
  }catch{return new Response('Website content is temporarily unavailable. Please retry.',{status:503,headers:{'Content-Type':'text/plain','Cache-Control':'no-store'}});}
}
