import {primaryMarkup,cardsMarkup,footerMarkup,featuredMarkup,escapeHtml as e,pageSeo,organizationSchema} from '../lib/website/model.mjs';
export async function renderWebsiteSettings(request,response,cms,Rewriter=globalThis.HTMLRewriter){
  if(request.method!=='GET'||!response.headers.get('Content-Type')?.includes('text/html')||!Rewriter)return response;
  try{
    const url=new URL(request.url),c=await cms.published('website'),seo=pageSeo(c,url.pathname);
    const get=path=>path.split('.').reduce((v,k)=>v?.[k],c);
    const headers=new Headers(response.headers);headers.set('Cache-Control','no-store');
    let sharedTitle='';
    const rewritten=new Rewriter()
      .on('[data-website-text]',{element(el){const value=get(el.getAttribute('data-website-text'));if(typeof value==='string')el.setInnerContent(value);}})
      .on('[data-website-href]',{element(el){el.setAttribute('href',get(el.getAttribute('data-website-href')));}})
      .on('[data-website-image]',{element(el){el.setAttribute('src',get(el.getAttribute('data-website-image')));}})
      .on('[data-website-email]',{element(el){el.setInnerContent(c.site.contactEmail);el.setAttribute('href','mailto:'+c.site.contactEmail);}})
      .on('[data-website-topbar]',{element(el){el.setInnerContent(`Programs by ${c.site.organizationName} (${c.site.organizationShortName})`);}})
      .on('.topbar a',{element(el){if(!c.site.showUtility)el.setAttribute('hidden','');else el.removeAttribute('hidden');}})
      .on('#primary-menu',{element(el){el.setInnerContent(primaryMarkup(c,url.pathname),{html:true});}})
      .on('[data-website-cards]',{element(el){el.setInnerContent(cardsMarkup(c,el.getAttribute('data-website-cards')==='home'),{html:true});}})
      .on('[data-website-footer]',{element(el){el.setInnerContent(footerMarkup(c),{html:true});}})
      .on('[data-website-featured]',{element(el){el.setInnerContent(featuredMarkup(c),{html:true});}})
      .on('[data-home-hero]',{element(el){el.setAttribute('style',`--hero-image:url("${c.home.image}")`);}})
      .on('[data-initiatives-hero]',{element(el){el.setAttribute('style',`background-image:linear-gradient(90deg,rgba(255,253,247,.97),rgba(255,250,240,.85)),url("${c.initiativesPage.image}")`);}})
      .on('[data-home-section]',{element(el){const id=el.getAttribute('data-home-section'),index=c.home.sections.findIndex(s=>s.id===id);el.setAttribute('style',`order:${index}`);if(!c.home.sections[index]?.enabled)el.setAttribute('hidden','');else el.removeAttribute('hidden');}})
      .on('[data-website-favicon]',{element(el){el.setAttribute('href',c.site.favicon);}})
      .on('[data-website-schema]',{element(el){el.setInnerContent(organizationSchema(c),{html:true});}})
      .on('title[data-website-title]',{element(el){const base=el.getAttribute('data-website-title');sharedTitle=base==='default'?c.seo.defaultTitle:c.seo.titlePattern.replace('{title}',base);el.setInnerContent(sharedTitle);}})
      .on('meta[property="og:title"]',{element(el){if(sharedTitle)el.setAttribute('content',sharedTitle);}})
      .on('meta[data-website-default-description]',{element(el){el.setAttribute('content',c.seo.description);}})
      .on('meta[data-website-robots]',{element(el){el.setAttribute('content',url.searchParams.get('websitePreview')==='draft'?'noindex, nofollow':c.seo.robots);}})
      .on('meta[name="google-site-verification"]',{element(el){el.remove();}})
      .on('head',{element(el){if(c.seo.verification)el.append(`<meta name="google-site-verification" content="${e(c.seo.verification)}">`,{html:true});if(c.seo.socialImage&&seo)el.append(`<meta property="og:image" content="${e(new URL(c.seo.socialImage,url.origin).href)}">`,{html:true});}});
    for(const key of ['primaryCta','secondaryCta'])rewritten.on(`[data-website-text="home.${key}.label"]`,{element(el){if(c.home[key].enabled)el.removeAttribute('hidden');else el.setAttribute('hidden','');}});
    if(seo){rewritten.on('title',{element(el){el.setInnerContent(seo.title);}});for(const [selector,value] of [['meta[name="description"]',seo.description],['meta[property="og:title"]',seo.title],['meta[property="og:description"]',seo.description]])rewritten.on(selector,{element(el){el.setAttribute('content',value);}});}
    return rewritten.transform(new Response(response.body,{status:response.status,headers}));
  }catch{return response;}
}
