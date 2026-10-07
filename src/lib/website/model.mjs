export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function validUrl(value, optional = false) {
  if (optional && value === '') return true;
  if (typeof value !== 'string' || value.length > 2048 || /[\s\\<>"'\u0000-\u001f]/.test(value)) return false;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
}
export function validateWebsite(c) {
  if (!c || typeof c !== 'object' || typeof c.updatedAt !== 'string' || !c.site || !c.home || !c.navigation || !c.initiativesPage || !c.footer || !c.seo) throw Error('Website settings are incomplete.');
  const fixed = (items, ids, label) => {
    if (!Array.isArray(items) || items.length !== ids.length || new Set(items.map(x => x.id)).size !== ids.length || items.some(x => !ids.includes(x.id))) throw Error(`${label} must retain its existing groups.`);
  };
  fixed(c.navigation.groups, ['ram','sita','community'], 'Our Initiatives Menu');
  fixed(c.initiativesPage.cards, ['ram','sita','community'], 'Initiative Cards');
  fixed(c.home.sections, ['initiatives','about','values','featured'], 'Homepage Sections');
  fixed(c.navigation.primary, ['home','about','initiatives','resources','involved','contact'], 'Primary Navigation');
  const links = (items, max) => {
    if (!Array.isArray(items) || items.length > max) throw Error(`Use no more than ${max} links.`);
    for (const item of items) if (!item.label?.trim() || !validUrl(item.href) || typeof item.enabled !== 'boolean') throw Error('Each link needs a label, a safe destination and an enabled setting.');
  };
  links(c.navigation.primary, 6);
  links(c.home.featuredLinks, 12);
  if (!Array.isArray(c.home.values) || c.home.values.length !== 3) throw Error('Retain the three homepage values.');
  for (const group of c.navigation.groups) { links(group.links, 6); if (!group.name?.trim() || !validUrl(group.href) || !validUrl(group.logo, true)) throw Error('Each initiative needs a name and safe destination/image URLs.'); }
  for (const key of ['quickLinks','legalLinks','socialLinks']) links(c.footer[key], 12);
  for (const card of c.initiativesPage.cards) if (!card.name?.trim() || !validUrl(card.href) || !validUrl(card.logo)) throw Error('Each card needs a name and safe destination/image URLs.');
  for (const [key, value] of Object.entries(c.site)) if (['mainWebsiteUrl','donationUrl','logo','favicon'].includes(key) && !validUrl(value)) throw Error('Use safe website and image URLs.');
  for (const value of [c.home.image,c.home.aboutImage,c.initiativesPage.image]) if (!validUrl(value)) throw Error('Use a safe image URL.');
  for (const cta of [c.home.primaryCta,c.home.secondaryCta]) if (!cta || !cta.label?.trim() || !validUrl(cta.href) || typeof cta.enabled !== 'boolean') throw Error('Homepage buttons need labels and safe destinations.');
  if (!validUrl(c.seo.socialImage,true) || !['index, follow','noindex, nofollow'].includes(c.seo.robots)) throw Error('Check global SEO settings.');
  if (typeof c.seo.titlePattern !== 'string' || !c.seo.titlePattern.includes('{title}')) throw Error('The title pattern must include {title}.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.site.contactEmail)) throw Error('Enter a valid contact email.');
  const walk = value => {
    if (typeof value === 'string' && value.length > 6000) throw Error('Please shorten the content to 6,000 characters or less.');
    if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) {
      if (['__proto__','prototype','constructor'].includes(key)) throw Error('Invalid setting.');
      if (['responses','submissions','participants','backendToken','passwordHash','privateKey','clientSecret','accessToken','refreshToken','sheetCredentials'].includes(key)) throw Error('Participant data and private credentials must stay outside public website settings.');
      if (['enabled','featured','showUtility'].includes(key) && typeof item !== 'boolean') throw Error('Visibility must be on or off.');
      walk(item);
    }
  };
  walk(c);
  return c;
}
const e = escapeHtml;
const link = (item, className = '') => `<a class="${className}" href="${e(item.href)}">${e(item.label)}</a>`;
export function megaMarkup(c) {
  return `<div class="mega-heading"><strong>Our Initiatives</strong>${link({label:'View All Initiatives',href:c.navigation.primary.find(x=>x.id==='initiatives').href})}</div><div class="mega-columns">${c.navigation.groups.filter(g=>g.enabled).map(g=>`<section class="mega-group"><button type="button" class="mega-group-toggle" aria-expanded="false" aria-controls="mega-${e(g.id)}"><img src="${e(g.logo)}" alt="" width="48" height="48"><span><strong>${e(g.name)}</strong><small>${e(g.subtitle)}</small></span><span class="chevron" aria-hidden="true"></span></button><div class="mega-group-body" id="mega-${e(g.id)}"><div class="mega-links">${g.links.filter(x=>x.enabled).map(x=>link(x)).join('')}</div>${link({label:'Explore '+g.name,href:g.href},'mega-explore')}</div></section>`).join('')}</div>`;
}
export function primaryMarkup(c, currentPath = '/') {
  const normalized = value => value.split('?')[0].replace(/\/+$/,'') || '/';
  return c.navigation.primary.filter(item=>item.enabled).map(item=>item.id==='initiatives'
    ? `<div class="initiatives-nav"><button type="button" class="initiatives-toggle" aria-expanded="false" aria-controls="initiatives-mega">${e(item.label)}<span class="chevron" aria-hidden="true"></span></button><div id="initiatives-mega" class="mega-menu" hidden>${megaMarkup(c)}</div></div>`
    : `<a href="${e(item.href)}" ${normalized(item.href)===normalized(currentPath)?'aria-current="page"':''}>${e(item.label)}</a>`).join('')+`<a class="mobile-support" href="${e(c.site.donationUrl)}">${e(c.site.supportLabel)}</a>`;
}
export function cardsMarkup(c, homepage = false) {
  return c.initiativesPage.cards.filter(x=>x.enabled&&(!homepage||x.featured)).map(x=>`<a class="initiative-card" data-tone="${e(x.tone)}" href="${e(x.href)}"><img src="${e(x.logo)}" alt="${e(x.name)} logo" width="160" height="160" loading="lazy"><div><h3>${e(x.name)}</h3><p><strong>${e(x.subtitle)}</strong></p><p>${e(x.description)}</p></div></a>`).join('');
}
export function footerMarkup(c) {
  return `<div class="container"><div class="footer-grid"><div><img class="footer-logo" src="${e(c.footer.logo)}" alt="GOPAL Foundation logo" width="150" height="150"><p>${e(c.footer.description)}</p></div><div><h2>Quick Links</h2>${c.footer.quickLinks.filter(x=>x.enabled).map(x=>link(x)).join('')}${c.footer.legalLinks.filter(x=>x.enabled).map(x=>link(x)).join('')}</div><div><h2>Initiatives</h2>${c.navigation.groups.filter(x=>x.enabled).map(x=>link({label:x.name,href:x.href})).join('')}</div><div><h2>Contact</h2><a href="mailto:${e(c.site.contactEmail)}">${e(c.site.contactEmail)}</a>${c.site.contactPhone?`<p>${e(c.site.contactPhone)}</p>`:''}<p>${e(c.site.address)}</p>${link({label:c.site.utilityLabel,href:c.site.mainWebsiteUrl})}${c.footer.socialLinks.filter(x=>x.enabled).map(x=>link(x)).join('')}</div></div><div class="footer-bottom">&copy; ${new Date().getFullYear()} ${e(c.footer.copyright)}</div></div>`;
}
export function pageSeo(c,path) {
  const normalized=path.replace(/\/+$/,'')||'/';
  if(normalized==='/')return {title:c.home.seoTitle,description:c.home.seoDescription};
  if(normalized==='/programs')return {title:c.initiativesPage.seoTitle,description:c.initiativesPage.seoDescription};
  return null;
}
export function featuredMarkup(c) {return c.home.featuredLinks.filter(x=>x.enabled).map(x=>`<a class="content-card" href="${e(x.href)}"><h3>${e(x.label)}</h3><p>${e(x.description)}</p></a>`).join('');}
export function organizationSchema(c){return JSON.stringify({'@context':'https://schema.org','@type':'NGO',name:c.site.organizationName,alternateName:c.site.organizationShortName,url:c.site.mainWebsiteUrl,email:c.site.contactEmail}).replace(/</g,'\\u003c');}
