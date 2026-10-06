import {load} from 'cheerio';
import * as ram from '../src/lib/ram/render.mjs';
import * as sita from '../src/lib/sita/render.mjs';
import {renderDetail as sitaDetail} from '../src/lib/sita/detail.mjs';
import {escape as e, ordered, safeUrl} from '../src/lib/ram/model.mjs';
import {publicTestimonials, testimonialMarkup} from '../src/lib/testimonials/model.mjs';

export async function renderSitemap(request,response,cms) {
  const $=load(await response.text(),{xmlMode:true}),origin=new URL(request.url).origin;
  const urls=new Set($('loc').toArray().map(el=>$(el).text()).filter(url=>!/^\/(ram|sita)(\/|$)/.test(new URL(url).pathname)));
  for(const scope of ['ram','sita']) {
    const c=await cms.published(scope);
    if(c.seo.index!==false) for(const suffix of ['', '/programs/', '/articles/'])urls.add(origin+'/'+scope+suffix);
    for(const p of c.programs.filter(p=>p.active&&p.index!==false&&p.fullDescription?.length>200))urls.add(origin+'/'+scope+(scope==='sita'?'/':'/programs/')+p.slug+'/');
    for(const a of c.articles.filter(a=>a.published&&a.body?.trim()))urls.add(origin+'/'+scope+'/articles/'+a.slug+'/');
  }
  return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+[...urls].map(url=>'<url><loc>'+e(url)+'</loc></url>').join('')+'</urlset>',{headers:{'Content-Type':'application/xml','Cache-Control':'no-store'}});
}

export async function renderInitiative(request, response, cms) {
  const url = new URL(request.url), path = url.pathname.replace(/\/+$/, '');
  const scope = /^\/ram(?:\/|$)/.test(path) ? 'ram' : /^\/sita(?:\/|$)/.test(path) ? 'sita' : '';
  if (!scope || !response.headers.get('Content-Type')?.includes('text/html')) return response;
  const content = await cms.published(scope), feedback = await cms.published('testimonials');
  const render = scope === 'ram' ? ram : sita;
  const $ = load(await response.text());
  let seo = content.seo;
  if (path === '/'+scope) $('[data-'+scope+'-root]').html(render.renderPage(content, publicTestimonials(feedback, scope.toUpperCase())));
  else if (path === '/'+scope+'/programs' || path === '/'+scope+'/articles') {
    const programs = path.endsWith('/programs');
    $('[data-'+scope+'-list]').html(ordered(content[programs?'programs':'articles']).filter(r => programs?r.active:r.published).map(programs?render.programCard:render.articleCard).join(''));
    seo = {...seo, title:scope.toUpperCase()+(programs?' Programs':' Articles & Insights'), canonical:url.origin+path+'/'};
  } else {
    const article = path.includes('/articles/') || path.endsWith('/article');
    const slug = url.searchParams.get('slug') || path.split('/').at(-1);
    const record = content[article?'articles':'programs'].find(r => r.slug === slug && (article?r.published:r.active));
    if (!record) return new Response('Page unavailable', {status:404, headers:{'Content-Type':'text/plain', 'Cache-Control':'no-store'}});
    const selector = '[data-'+scope+'-detail]';
    $(selector).attr('data-'+scope+'-record-slug', record.slug).html(scope === 'sita'
      ? sitaDetail(record, content, article?'article':'program', publicTestimonials(feedback, 'SITA', record.id))
      : `<a class="ram-text-link" href="/ram/">Back to RAM</a><h1>${e(record.title)}</h1><img src="${e(safeUrl(record.image))}" alt="${e(record.imageAlt)}"><p>${e(record.fullDescription || record.body)}</p>${article?'':'<a class="button button--primary" href="/ram/#opportunities">Find Open Opportunities</a>'}`);
    seo = {title:record.seoTitle || record.title, description:record.seoDescription || record.shortDescription || record.excerpt || '', canonical:url.origin+path+'/', socialImage:record.socialImage || record.image, index:article?Boolean(record.body?.trim()):Boolean(record.index && record.fullDescription?.length>200)};
  }
  if (scope === 'ram') $('[data-initiative-testimonials]').html(testimonialMarkup(publicTestimonials(feedback, 'RAM'), content.programs));
  $('title').text(seo.title);
  for (const [selector, value] of [['meta[name="description"]',seo.description], ['meta[property="og:title"]',seo.socialTitle || seo.title], ['meta[property="og:description"]',seo.socialDescription || seo.description], ['meta[property="og:url"]',seo.canonical]]) $(selector).attr('content',value || '');
  $('link[rel="canonical"]').attr('href',seo.canonical);
  $('meta[name="robots"]').attr('content',seo.index?'index, follow':'noindex, nofollow');
  $('meta[property="og:image"]').remove();
  if (seo.socialImage) $('head').append($('<meta>').attr({property:'og:image', content:new URL(safeUrl(seo.socialImage),url.origin).href}));
  const headers = new Headers(response.headers); headers.delete('Content-Length'); headers.set('Cache-Control','no-store');
  return new Response($.html(), {status:response.status, headers});
}
