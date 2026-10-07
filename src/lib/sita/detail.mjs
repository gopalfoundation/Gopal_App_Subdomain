import { escape as e,safeUrl,ordered,publicOpportunities,videoId } from './model.mjs';
import { programCard,articleCard,renderVideos } from './render.mjs';
import { testimonialMarkup } from '../testimonials/model.mjs';
const section=(heading,html)=>html?`<section><h2>${e(heading)}</h2>${html}</section>`:'';
const paragraphs=text=>String(text||'').split(/\n\s*\n/).filter(Boolean).map(p=>`<p>${e(p)}</p>`).join('');
const items=text=>String(text||'').split('\n').filter(Boolean).map(t=>`<li>${e(t)}</li>`).join('');
/** @param {any} record @param {any} content @param {string} kind @param {any} testimonials */
export function renderDetail(record,content,kind,testimonials=null) {
  if(!record)return '<h1>Page unavailable</h1><p>This page is not currently published.</p><a href="/sita/">Return to SITA</a>';
  const title=`<a class="sita-text-link" href="/sita/">Back to SITA</a><h1>${e(record.title)}</h1>${record.image?`<img src="${e(safeUrl(record.image))}" alt="${e(record.imageAlt||'')}">`:''}`;
  if(kind==='article')return title+`<p class="sita-category">${[record.author,record.category,record.publishDate].filter(Boolean).map(e).join(' · ')}</p>`+paragraphs(record.body);
  const videos={...content,videos:content.videos.filter(v=>v.programId===record.id)};
  const articles=ordered(content.articles).filter(a=>a.published&&a.initiative==='SITA'&&a.programId===record.id);
  const opportunities=publicOpportunities(content).filter(o=>o.programId===record.id);
  const faq=(record.faqText||'').split('\n').filter(s=>s.includes('|')).map(s=>{const [q,...a]=s.split('|');return `<details><summary>${e(q.trim())}</summary><p>${e(a.join('|').trim())}</p></details>`;}).join('');
  return title+section('About the Program',paragraphs(record.fullDescription))+section('Who It Is For',paragraphs(record.audience))+section('What Participants Explore',items(record.explore)?`<ul>${items(record.explore)}</ul>`:'')+section('Program Journey',items(record.journey)?`<ol>${items(record.journey)}</ol>`:'')+section('Schedule',paragraphs(record.schedule))+section('Videos',renderVideos(videos))+section('Articles & Insights',articles.length?`<div class="sita-grid">${articles.map(articleCard).join('')}</div>`:'')+section('Frequently Asked Questions',faq)+section('Open Opportunities',opportunities.length?opportunities.map(o=>`<p><a class="button button--primary" href="/sita/?opportunity=${encodeURIComponent(o.id)}#opportunities">${e(o.name)}</a></p>`).join(''):'<p>New opportunities will be announced here.</p>')+`<div data-testimonials-host>${testimonialMarkup(testimonials,content.programs)}</div>`+section('Related Programs',`<div class="sita-grid">${ordered(content.programs).filter(p=>p.id!==record.id&&p.active).slice(0,2).map(programCard).join('')}</div>`);
}
export async function initSitaDetail(kind='program') {
  const root=document.querySelector('[data-sita-detail]');if(!root)return;
  const query=new URLSearchParams(location.search),preview=query.get('preview')==='draft';
  const r=await fetch(preview?'/api/sita/content':'/content/sita.json',{cache:'no-store'});if(!r.ok)return;
  let c=await r.json();if(preview)c=c.draft||c.published;
  const record=c[kind==='program'?'programs':'articles'].find(p=>p.slug===(query.get('slug')||root.dataset.sitaRecordSlug)&&(preview||(kind==='program'?p.active:p.published))&&p.initiative==='SITA');
  root.innerHTML=renderDetail(record,c,kind);
  if(!record)return;
  document.title=record.seoTitle||record.title+' | SITA';
  document.querySelector('meta[name="description"]')?.setAttribute('content',record.seoDescription||record.shortDescription||record.excerpt||'');
  document.querySelector('link[rel="canonical"]')?.setAttribute('href','https://programs.gloryofpeaceandlove.org/sita/'+(kind==='article'?'articles/':'')+record.slug+'/');
  const {mountPublicTestimonials}=await import('../testimonials/public.mjs');mountPublicTestimonials(root.querySelector('[data-testimonials-host]'),'SITA',c.programs,record.id);
  const {refreshIcons}=await import('./page.mjs');refreshIcons();
  root.addEventListener('click',event=>{
    const b=event.target.closest('[data-play-video],[data-switch-video]');if(!b)return;
    const video=b.dataset.switchVideo?c.videos.find(v=>v.id===b.dataset.switchVideo):null;
    const id=video?videoId(video.url):b.dataset.playVideo;if(!/^[\w-]{11}$/.test(id||''))return;
    document.querySelectorAll('iframe[src*="youtube-nocookie.com"]').forEach(f=>f.remove());
    const frame=document.createElement('iframe');frame.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&playsinline=1';frame.title=video?.title||b.getAttribute('aria-label');frame.allow='autoplay; encrypted-media; picture-in-picture';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';root.querySelector('[data-video-player]')?.replaceChildren(frame);
    if(video){root.querySelector('[data-video-title]').textContent=video.title;root.querySelector('[data-video-description]').textContent=String(video.description||'').slice(0,320);root.querySelectorAll('[data-switch-video]').forEach(row=>row.setAttribute('aria-pressed',String(row===b)));}
  });
}
