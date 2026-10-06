import {createIcons, Menu} from 'lucide';
import {primaryMarkup,cardsMarkup,footerMarkup,featuredMarkup,validUrl,pageSeo,organizationSchema} from './model.mjs';
const get=(c,path)=>path.split('.').reduce((v,k)=>v?.[k],c);
const header=document.querySelector('#site-header');
const mobile=document.querySelector('.mobile-toggle');
const desktop=matchMedia('(min-width: 1280px)');
const hover=matchMedia('(hover: hover) and (pointer: fine)');
let pinned=false;
const toggle=()=>header?.querySelector('.initiatives-toggle');
const menu=()=>header?.querySelector('.mega-menu');
function openMenu(open,restore=false){const t=toggle(),m=menu();if(!t||!m)return;t.setAttribute('aria-expanded',String(open));m.hidden=!open;if(!open)pinned=false;if(restore)t.focus();}
function mobileOpen(open){if(!header||!mobile)return;header.dataset.open=String(open);mobile.setAttribute('aria-expanded',String(open));mobile.setAttribute('aria-label',open?'Close menu':'Open menu');if(!open)openMenu(false);}
function groups(){header?.querySelectorAll('.mega-group-toggle').forEach(button=>{button.tabIndex=desktop.matches?-1:0;const expanded=desktop.matches;button.setAttribute('aria-expanded',String(expanded));const body=document.getElementById(button.getAttribute('aria-controls'));if(body)body.hidden=!expanded;});}
mobile?.addEventListener('click',()=>mobileOpen(header.dataset.open!=='true'));
header?.addEventListener('click',event=>{
  if(event.target.closest('.initiatives-toggle')){const isOpen=toggle().getAttribute('aria-expanded')==='true';if(isOpen&&!pinned&&event.detail>0){pinned=true;return;}openMenu(!isOpen);pinned=!isOpen;}
  const group=event.target.closest('.mega-group-toggle');
  if(group&&!desktop.matches){const open=group.getAttribute('aria-expanded')!=='true';group.setAttribute('aria-expanded',String(open));document.getElementById(group.getAttribute('aria-controls')).hidden=!open;}
});
header?.addEventListener('pointerover',event=>{if(desktop.matches&&hover.matches&&event.target.closest('.initiatives-toggle')&&!header.querySelector('.initiatives-nav').contains(event.relatedTarget))openMenu(true);});
header?.addEventListener('pointerout',event=>{const wrapper=header.querySelector('.initiatives-nav');if(desktop.matches&&hover.matches&&!pinned&&wrapper?.contains(event.target)&&!wrapper.contains(event.relatedTarget)&&!wrapper.contains(document.activeElement))openMenu(false);});
header?.addEventListener('focusout',event=>{const wrapper=header.querySelector('.initiatives-nav');if(wrapper?.contains(event.target)&&!wrapper.contains(event.relatedTarget))openMenu(false);});
document.addEventListener('pointerdown',event=>{if(!event.target.closest('.initiatives-nav'))openMenu(false);if(!header?.contains(event.target))mobileOpen(false);});
document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;if(toggle()?.getAttribute('aria-expanded')==='true'){event.preventDefault();openMenu(false,true);}else if(header?.dataset.open==='true'){mobileOpen(false);mobile?.focus();}});
desktop.addEventListener('change',()=>{openMenu(false);mobileOpen(false);groups();});
groups();createIcons({icons:{Menu}});

export function applyWebsite(c){
  document.querySelectorAll('[data-website-text]').forEach(el=>{const value=get(c,el.dataset.websiteText);if(typeof value==='string')el.textContent=value;});
  document.querySelectorAll('[data-website-href]').forEach(el=>{const value=get(c,el.dataset.websiteHref);if(validUrl(value))el.setAttribute('href',value);});
  document.querySelectorAll('[data-website-image]').forEach(el=>{const value=get(c,el.dataset.websiteImage);if(validUrl(value))el.setAttribute('src',value);});
  document.querySelectorAll('[data-website-email]').forEach(el=>{el.textContent=c.site.contactEmail;el.setAttribute('href','mailto:'+c.site.contactEmail);});
  const topbar=document.querySelector('[data-website-topbar]');if(topbar)topbar.textContent=`Programs by ${c.site.organizationName} (${c.site.organizationShortName})`;
  const utility=document.querySelector('.topbar a');if(utility)utility.hidden=!c.site.showUtility;
  const nav=document.querySelector('#primary-menu');if(nav){nav.innerHTML=primaryMarkup(c,location.pathname);groups();}
  document.querySelectorAll('[data-website-cards]').forEach(el=>{el.innerHTML=cardsMarkup(c,el.dataset.websiteCards==='home');});
  const footer=document.querySelector('[data-website-footer]');if(footer)footer.innerHTML=footerMarkup(c);
  const featured=document.querySelector('[data-website-featured]');if(featured)featured.innerHTML=featuredMarkup(c);
  const hero=document.querySelector('[data-home-hero]');if(hero&&validUrl(c.home.image))hero.style.setProperty('--hero-image',`url("${c.home.image}")`);
  const pageHero=document.querySelector('[data-initiatives-hero]');if(pageHero&&validUrl(c.initiativesPage.image))pageHero.style.backgroundImage=`linear-gradient(90deg,rgba(255,253,247,.97),rgba(255,250,240,.85)),url("${c.initiativesPage.image}")`;
  for(const key of ['primaryCta','secondaryCta']){const el=document.querySelector(`[data-website-text="home.${key}.label"]`);if(el)el.hidden=!c.home[key].enabled;}
  c.home.sections.forEach((section,index)=>{const el=document.querySelector(`[data-home-section="${section.id}"]`);if(el){el.hidden=!section.enabled;el.style.order=String(index);}});
  const favicon=document.querySelector('[data-website-favicon]');if(favicon&&validUrl(c.site.favicon))favicon.href=c.site.favicon;
  const seo=pageSeo(c,location.pathname);if(seo){document.title=seo.title;document.querySelector('meta[name="description"]')?.setAttribute('content',seo.description);document.querySelector('meta[property="og:title"]')?.setAttribute('content',seo.title);document.querySelector('meta[property="og:description"]')?.setAttribute('content',seo.description);}
  const titleBase=document.querySelector('title[data-website-title]')?.dataset.websiteTitle;if(titleBase){document.title=titleBase==='default'?c.seo.defaultTitle:c.seo.titlePattern.replace('{title}',titleBase);document.querySelector('meta[property="og:title"]')?.setAttribute('content',document.title);}
  document.querySelector('meta[data-website-default-description]')?.setAttribute('content',c.seo.description);
  document.querySelector('meta[property="og:description"][data-website-default-description]')?.setAttribute('content',c.seo.description);
  document.querySelector('meta[data-website-robots]')?.setAttribute('content',c.seo.robots);
  const schema=document.querySelector('[data-website-schema]');if(schema)schema.textContent=organizationSchema(c);
  let verification=document.querySelector('meta[name="google-site-verification"]');if(c.seo.verification){if(!verification){verification=document.createElement('meta');verification.name='google-site-verification';document.head.append(verification);}verification.content=c.seo.verification;}else verification?.remove();
  let socialImage=document.querySelector('meta[data-website-default-social]');if(c.seo.socialImage&&validUrl(c.seo.socialImage)){if(!socialImage&&!document.querySelector('meta[property="og:image"]')){socialImage=document.createElement('meta');socialImage.setAttribute('property','og:image');socialImage.dataset.websiteDefaultSocial='';document.head.append(socialImage);}if(socialImage)socialImage.content=new URL(c.seo.socialImage,location.origin).href;}else socialImage?.remove();
}
async function load(){
  try{
    const preview=new URL(location.href).searchParams.get('websitePreview')==='draft';
    const response=await fetch(preview?'/api/website/content':'/content/website.json',{cache:'no-store'});
    if(!response.ok)return;
    const data=await response.json();applyWebsite(preview?(data.draft||data.published):data);
    if(preview){let robots=document.querySelector('meta[name="robots"]');if(!robots){robots=document.createElement('meta');robots.name='robots';document.head.append(robots);}robots.content='noindex, nofollow';}
  }catch{/* Keep the server-rendered navigation and content available during an outage. */}
}
load();
