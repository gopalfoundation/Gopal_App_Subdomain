import { escape as e, safeUrl, ordered, videoId } from '../ram/model.mjs';
export const associations = r => Array.isArray(r.initiative) ? r.initiative : [r.initiative];
export function publicTestimonials(content,initiative,program = '') {
  const settings = content.settings?.[initiative] || {};
  if (!settings.visible) return {settings:{heading:settings.heading,intro:settings.intro,visible:false,count:settings.count},records:[]};
  const records = ordered(content.records || []).filter(r => !r.archived && r.published === true && r.consentConfirmed === true && associations(r).includes(initiative) && (!program || r.program === program)).sort((a,b)=>Number(Boolean(b.featured))-Number(Boolean(a.featured))).slice(0,Math.max(3,Math.min(6,Number(settings.count)||6))).map(({id,displayName,role,city,testimonialText,image,imageAlt,videoUrl,date,program,initiative})=>({id,displayName,role,city,testimonialText,image,imageAlt,videoUrl,date,program,initiative}));
  return {settings:{heading:settings.heading,intro:settings.intro,visible:true,count:settings.count},records};
}
export function validateTestimonials(c) {
  if (c?.version !== 1 || !Array.isArray(c.records) || !c.settings) throw new Error('Please check testimonial settings.');
  const ids = new Set();
  function privateKeys(value){if(!value||typeof value!=='object')return;for(const [key,item] of Object.entries(value)){if(['responses','submissions','participants','backendToken','passwordHash','privateKey','clientSecret','accessToken','refreshToken','sheetCredentials'].includes(key))throw new Error('Private records and credentials cannot be stored in testimonial content.');privateKeys(item);}}
  privateKeys(c);
  for (const r of c.records) {
    if (!/^[\w-]{1,120}$/.test(r.id) || ids.has(r.id)) throw new Error('Each testimonial needs a unique ID.'); ids.add(r.id);
    if (!associations(r).length || associations(r).some(i=>!['RAM','SITA','COMMUNITY'].includes(i))) throw new Error('Choose a testimonial initiative.');
    for(const key of ['displayName','role','city','testimonialText','image','imageAlt','videoUrl','date','program'])if(r[key]!==undefined&&(typeof r[key]!=='string'||r[key].length>8000))throw new Error('Please check the testimonial text fields.');
    for(const key of ['published','consentConfirmed','featured','archived'])if(r[key]!==undefined&&typeof r[key]!=='boolean')throw new Error('Choose valid testimonial visibility and consent settings.');
    if (r.published && (!r.consentConfirmed || !r.displayName?.trim() || !r.testimonialText?.trim() || r.archived)) throw new Error('Confirm consent and complete the name and quote before publishing.');
    if (r.videoUrl && !videoId(r.videoUrl)) throw new Error('Use a valid YouTube link for a video testimonial.');
    if (r.image && safeUrl(r.image,'') !== r.image) throw new Error('Choose a valid image.');
  }
  return c;
}
export function testimonialMarkup(data,programs = []) {
  if (!data?.records?.length || !data.settings.visible) return '';
  return `<section class="testimonial-section" id="testimonials"><div class="container"><header><h2>${e(data.settings.heading || 'What Participants Say')}</h2>${data.settings.intro ? `<p>${e(data.settings.intro)}</p>` : ''}</header><div class="testimonial-grid">${data.records.map(r=>`<article class="testimonial-card">${r.image ? `<img class="testimonial-photo" src="${e(safeUrl(r.image))}" alt="${e(r.imageAlt || r.displayName)}" loading="lazy">` : ''}<blockquote><p>${e(r.testimonialText)}</p></blockquote><p class="testimonial-name">${e(r.displayName)}</p><p class="testimonial-context">${[r.role,programs.find(p=>p.id===r.program)?.title,r.city,r.date && Number.isFinite(Date.parse(r.date)) ? new Date(r.date).toLocaleDateString('en-US',{timeZone:'UTC',month:'long',year:'numeric'}) : ''].filter(Boolean).map(e).join(' · ')}</p>${r.videoUrl ? `<button type="button" class="testimonial-video" data-testimonial-video="${videoId(r.videoUrl)}" aria-label="Play testimonial by ${e(r.displayName)}"><img src="https://i.ytimg.com/vi/${videoId(r.videoUrl)}/hqdefault.jpg" alt="" loading="lazy"><span>Play Testimonial</span></button>` : ''}</article>`).join('')}</div></div></section>`;
}
