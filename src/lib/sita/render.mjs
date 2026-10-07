import { escape as e, safeUrl, ordered, TYPES, opportunityType, publicOpportunities, programUrl, videoId, successSettings } from './model.mjs';
import { testimonialMarkup } from '../testimonials/model.mjs';
const icon = name => `<i data-lucide="${e(name || 'BookOpen')}" aria-hidden="true"></i>`;
const image = (url, alt, className = '', eager = false) => `<img class="${className}" src="${e(safeUrl(url, '/images/hero-riverside-diya.png'))}" alt="${e(alt)}" loading="${eager ? 'eager' : 'lazy'}" ${eager ? 'fetchpriority="high"' : ''} />`;
const paragraphs = text => String(text || '').split(/\n\s*\n/).map(p => `<p>${e(p)}</p>`).join('');
const button = (label, url, primary = false) => `<a class="button ${primary ? 'button--primary' : ''}" href="${e(safeUrl(url))}">${e(label)}</a>`;
const intro = (heading, text) => `<div class="sita-section-heading"><h2>${e(heading)}</h2>${text ? `<p>${e(text)}</p>` : ''}</div>`;
export function programCard(program) {
  return `<article class="sita-card sita-program">${image(program.image, program.imageAlt)}<div class="sita-card-body"><span class="sita-category">${e(program.category)}</span><h3><a href="${e(programUrl(program))}">${e(program.title)}</a></h3><p>${e(program.shortDescription)}</p><a class="sita-text-link" href="${e(programUrl(program))}">Explore Program</a></div></article>`;
}
export function opportunityCard(opportunity, content) {
  const program = content.programs.find(p => p.id === opportunity.programId);
  const type = TYPES[opportunityType(opportunity)];
  if (!type || !program) return '';
  const date = value => new Intl.DateTimeFormat('en-US', { month:'short', day:'numeric', year:'numeric', timeZone:'UTC' }).format(new Date(value + 'T12:00:00Z'));
  const schedule = opportunity.startDate ? date(opportunity.startDate) + (opportunity.endDate ? ' - ' + date(opportunity.endDate) : '') : 'Future Session';
  return `<article class="sita-card sita-opportunity" data-opportunity-card="${e(opportunity.id)}">${image(opportunity.image || program.image, opportunity.imageAlt || program.imageAlt)}<div class="sita-card-body"><span class="sita-badge" data-tone="${type.tone}">${e(type.label)}</span><h3>${e(opportunity.name)}</h3><a class="sita-related" href="${e(programUrl(program))}">${e(program.title)}</a><ul class="sita-facts"><li>${icon('CalendarDays')}${e(schedule)}</li><li>${icon('MapPin')}${e(opportunity.format)}${opportunity.location !== opportunity.format ? ` - ${e(opportunity.location)}` : ''}</li><li>${icon('Users')}${e(opportunity.audience)}${opportunity.ageRange && !opportunity.audience.includes(opportunity.ageRange) ? ` (${e(opportunity.ageRange)})` : ''}</li></ul><p>${e(opportunity.description)}</p><button type="button" class="button button--primary" data-select-opportunity="${e(opportunity.id)}" aria-controls="selected-opportunity">${e(opportunity.buttonLabel || type.button)}</button></div></article>`;
}
export function videoFacade(video) {
  const id = videoId(video.url);
  return `<button class="sita-video-facade" type="button" data-play-video="${id}" aria-label="Play ${e(video.title)}">${image(video.thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, video.title)}<span class="sita-play">${icon('Play')}</span></button>`;
}
export function renderVideos(content) {
  const settings = content.videoSettings;
  const videos = ordered(content.videos.filter(v => v.enabled && videoId(v.url)));
  const latest = [...videos].sort((a,b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')));
  const featured = (settings.featuredMode === 'MANUAL' ? videos.find(v => v.id === settings.featuredId) : latest[0]) || videos[0];
  if (!featured) return '';
  const playlist = [featured,...videos.filter(v => v.id !== featured.id)].slice(0,Math.max(1,Math.min(30,Number(settings.count) || 6)));
  return `${intro(content.videosHeading, content.videosIntro)}<div class="sita-video-layout"><div><div data-video-player>${videoFacade(featured)}</div><h3 data-video-title>${e(featured.title)}</h3><p data-video-description ${!settings.showDescription ? 'hidden' : ''}>${e(String(featured.description || '').slice(0,320))}</p></div><div class="sita-recent-videos" aria-label="SITA video playlist">${playlist.map(v => `<button class="sita-video-row" type="button" data-switch-video="${e(v.id)}" aria-pressed="${v.id === featured.id}">${image(v.thumbnail || `https://i.ytimg.com/vi/${videoId(v.url)}/hqdefault.jpg`, '')}<span><strong>${e(v.title)}</strong>${settings.showDate !== false && v.publishedAt && Number.isFinite(Date.parse(v.publishedAt)) ? `<small>${e(new Date(v.publishedAt).toLocaleDateString('en-US', { timeZone:'UTC' }))}</small>` : ''}${settings.showDuration !== false && v.duration ? `<small>${e(v.duration)}</small>` : ''}${settings.showDescription && v.description ? `<small class="sita-video-excerpt">${e(String(v.description).slice(0,160))}</small>` : ''}</span>${icon('Play')}</button>`).join('')}</div></div>${settings.showChannelButton && settings.channelUrl ? `<div class="sita-section-action"><a class="button" href="${e(safeUrl(settings.channelUrl))}" ${settings.channelNewTab !== false ? 'target="_blank" rel="noopener noreferrer"' : ''}>${e(settings.channelButtonLabel)}</a></div>` : ''}`;
}
export function articleCard(article) {
  return `<article class="sita-card sita-article">${image(article.image, article.imageAlt)}<div class="sita-card-body"><span class="sita-category">SITA INSIGHTS</span><h3><a href="/sita/articles/${encodeURIComponent(article.slug)}/">${e(article.title)}</a></h3><p>${e(article.excerpt)}</p><a class="sita-text-link" href="/sita/articles/${encodeURIComponent(article.slug)}/">Read More</a></div></article>`;
}
/** @param {any} content @param {any} testimonials */
export function renderPage(content, testimonials = null) {
  const hero = content.hero;
  const themed = (data,id) => `<section class="sita-section ${id === 'journey' ? 'sita-section-tinted' : ''}" id="sita-${id}"><div class="container">${intro(data.heading,data.intro)}<div class="sita-theme-grid ${id === 'journey' ? 'sita-journey' : ''}">${ordered(data.items).filter(v=>v.enabled).map((v,i)=>`<article class="sita-value">${v.image ? image(v.image,v.imageAlt,'sita-theme-image') : `<span class="sita-value-icon">${icon(v.icon)}</span>`}${id === 'journey' ? `<small class="sita-step">${String(i+1).padStart(2,'0')}</small>` : ''}<h3>${e(v.title)}</h3><p>${e(v.description)}</p></article>`).join('')}</div></div></section>`;
  const articles = ordered(content.articles).filter(a => a.initiative === 'SITA' && a.published).sort((a,b) => Number(Boolean(b.featured))-Number(Boolean(a.featured)));
  const sections = {
    hero: `<section class="sita-hero" id="sita-hero">${image(hero.image, hero.imageAlt, 'sita-hero-background', true)}<div class="sita-hero-veil"></div><div class="container sita-hero-content"><div class="sita-identity">${image(hero.logo, hero.logoAlt, 'sita-logo', true)}<span>${e(hero.eyebrow)}</span></div><h1>${e(hero.title)}</h1>${hero.subtitle ? `<p class="sita-subtitle">${e(hero.subtitle)}</p>` : ''}<p class="sita-tagline">${e(hero.tagline)}</p><p class="sita-hero-intro">${e(hero.intro)}</p><div class="sita-brand-words">${hero.brandWords.map(word => `<span>${e(word)}</span>`).join('')}</div><div class="sita-actions">${hero.primaryVisible ? button(hero.primaryLabel, hero.primaryUrl, true) : ''}${hero.secondaryVisible ? button(hero.secondaryLabel, hero.secondaryUrl) : ''}</div></div></section>`,
    about: `<section class="sita-section" id="about-sita"><div class="container sita-about"><div><span class="sita-kicker">LEARNING WITH PURPOSE</span><h2>${e(content.about.heading)}</h2>${paragraphs(content.about.description)}${content.about.image ? image(content.about.image, content.about.imageAlt, 'sita-about-image') : ''}${content.about.buttonVisible ? button(content.about.buttonLabel, content.about.buttonUrl) : ''}</div><div class="sita-values">${ordered(content.about.values).filter(v => v.enabled).map(v => `<article class="sita-value"><span class="sita-value-icon">${icon(v.icon)}</span><h3>${e(v.title)}</h3><p>${e(v.description)}</p></article>`).join('')}</div></div></section>`,
    programs: `<section class="sita-section sita-section-tinted" id="featured-programs"><div class="container">${intro(content.programsHeading, content.programsIntro)}<div class="sita-grid sita-program-grid">${ordered(content.programs).filter(p => p.initiative === 'SITA' && p.featured && p.active).map(programCard).join('') || '<p class="sita-empty">New learning programs coming soon.</p>'}</div><div class="sita-section-action">${button('View All Programs', '/sita/programs/')}</div></div></section>`,
    opportunities: `<section class="sita-section" id="opportunities"><div class="container">${intro(content.opportunitiesHeading, content.opportunitiesIntro)}<div class="sita-filters"><label>Registration Type<select data-opportunity-filter="type"><option value="">All Types</option>${Object.entries(TYPES).map(([key,t]) => `<option value="${key}">${e(t.label)}</option>`).join('')}</select></label><label>Program Category<select data-opportunity-filter="category"><option value="">All Programs</option>${[...new Set(publicOpportunities(content).map(o => content.programs.find(p => p.id === o.programId)?.category).filter(Boolean))].map(c => `<option>${e(c)}</option>`).join('')}</select></label><label>Audience<select data-opportunity-filter="audience"><option value="">All Ages</option>${[...new Set(publicOpportunities(content).map(o => o.audience).filter(Boolean))].map(a => `<option>${e(a)}</option>`).join('')}</select></label><label>Search<input data-opportunity-filter="search" type="search" placeholder="Find a program" /></label></div><p class="sita-result-count" data-opportunity-count aria-live="polite">${publicOpportunities(content).length} opportunities</p><div class="sita-grid sita-opportunity-grid" data-opportunity-list>${publicOpportunities(content).map(o => opportunityCard(o,content)).join('')}</div><p class="sita-empty" data-opportunity-empty ${publicOpportunities(content).length ? 'hidden' : ''}>No opportunities match your selection. Please check back soon or contact our team.</p><section id="selected-opportunity" class="sita-selected-form" data-selected-opportunity hidden tabindex="-1" aria-labelledby="selected-form-heading"></section></div></section>`,
    journey: themed(content.journey,'journey'),
    why: themed(content.why,'why'),
    testimonials: `<div data-testimonials-host>${testimonialMarkup(testimonials,content.programs)}</div>`,
    videos: renderVideos(content) ? `<section class="sita-section sita-section-tinted" id="sita-videos"><div class="container">${renderVideos(content)}</div></section>` : '',
    articles: `<section class="sita-section" id="sita-articles"><div class="container">${intro(content.articlesHeading,content.articlesIntro)}<div class="sita-grid sita-article-grid">${articles.slice(0,3).map(articleCard).join('') || '<p class="sita-empty">New insights coming soon.</p>'}</div><div class="sita-section-action">${button('View All Articles','/sita/articles/')}</div></div></section>`,
    involved: `<section class="sita-section sita-involved" id="sita-involved"><div class="container">${intro(content.involvedHeading,content.involvedIntro)}<div class="sita-grid sita-involved-grid">${ordered(content.involved).filter(c => c.enabled).map(c => `<a class="sita-involved-card" href="${e(safeUrl(c.url))}">${icon(c.icon)}<h3>${e(c.title)}</h3><p>${e(c.description)}</p></a>`).join('')}</div></div></section>`
  };
  return content.sections.filter(s => s.visible).map(s => sections[s.id] || '').join('');
}
export function questionMarkup(question) {
  if (!question.enabled) return '';
  const required = question.required ? 'required' : '';
  const label = `${e(question.label)}${question.required ? ' <span aria-hidden="true">*</span>' : ''}`;
  const help = question.description ? `<small>${e(question.description)}</small>` : '';
  const id = `sita-q-${question.id}`;
  if (question.type === 'heading') return `<h3>${e(question.label)}</h3>`;
  if (question.type === 'info') return `<p>${e(question.label)}</p>`;
  if (question.type === 'consent' || question.type === 'checkbox') return `<label class="sita-checkbox"><input type="checkbox" name="${e(question.id)}" value="Yes" ${required}>${label}${help}</label>`;
  if (['singleChoice','multipleChoice','yesNo'].includes(question.type)) {
    const options = question.type === 'yesNo' ? ['Yes','No'] : question.options || [];
    return `<fieldset class="sita-question-group" data-required-group="${question.type === 'multipleChoice' && question.required}"><legend>${label}</legend>${help}${options.map(o => `<label class="sita-checkbox"><input name="${e(question.id)}" type="${question.type === 'multipleChoice' ? 'checkbox' : 'radio'}" value="${e(o)}" ${question.type !== 'multipleChoice' ? required : ''}>${e(o)}</label>`).join('')}</fieldset>`;
  }
  let control;
  if (question.type === 'longText') control = `<textarea id="${id}" name="${e(question.id)}" rows="3" ${required}></textarea>`;
  else if (question.type === 'dropdown') control = `<select id="${id}" name="${e(question.id)}" ${required}><option value="">Select an option</option>${(question.options || []).map(o => `<option>${e(o)}</option>`).join('')}</select>`;
  else control = `<input id="${id}" name="${e(question.id)}" type="${({email:'email',phone:'tel',number:'number',date:'date'})[question.type] || 'text'}" ${question.type === 'number' ? 'min="0"' : ''} placeholder="${e(question.placeholder || '')}" ${required}>`;
  return `<label for="${id}">${label}${help}${control}</label>`;
}
export function renderSelectedForm(opportunity, content, preview = false) {
  const form = content.forms.find(f => f.id === opportunity.formId);
  return `<div class="sita-selected-top"><div><span class="sita-badge" data-tone="${TYPES[opportunity.registrationType].tone}">${e(TYPES[opportunity.registrationType].label)}</span><h2 id="selected-form-heading">${e(form.heading)}</h2><p>${e(form.description)}</p><p class="sita-form-schedule">${e(opportunity.format)} / ${e(opportunity.audience)} / ${e(opportunity.schedule)} / ${e(opportunity.timezone)}</p></div><button class="sita-icon-button" type="button" data-close-form title="Close form" aria-label="Close form">${icon('X')}</button></div>${preview ? '<p class="sita-preview-notice">Draft preview: submissions are disabled.</p>' : ''}<form data-sita-registration="${e(opportunity.id)}" class="sita-registration-form">${form.questions.map(questionMarkup).join('')}<div class="sita-submit-row"><button class="button button--primary" type="submit" ${preview ? 'disabled' : ''}>${e(form.submitLabel)}</button><p role="status" data-submission-status></p></div></form>`;
}
export function renderSuccess(opportunity, form, program, contactEmail) {
  const success = successSettings(opportunity,form);
  const calendar = new URL('https://calendar.google.com/calendar/render');
  calendar.searchParams.set('action','TEMPLATE'); calendar.searchParams.set('text',opportunity.name); calendar.searchParams.set('details',opportunity.schedule || ''); calendar.searchParams.set('location',opportunity.location || ''); calendar.searchParams.set('ctz',opportunity.timezone);
  if (opportunity.startDate) { const end = new Date(`${opportunity.endDate || opportunity.startDate}T12:00:00Z`); end.setUTCDate(end.getUTCDate()+1); calendar.searchParams.set('dates',`${opportunity.startDate.replaceAll('-','')}/${end.toISOString().slice(0,10).replaceAll('-','')}`); }
  return `<div class="sita-confirmation" role="status"><span class="sita-value-icon">${icon('CircleCheck')}</span><h2 id="selected-form-heading">${e(success.heading)}</h2><p>${e(success.message)}</p>${success.nextSteps ? `<h3>${e(success.nextStepsHeading)}</h3><p>${e(success.nextSteps)}</p>` : ''}<div class="sita-actions">${success.primaryEnabled && success.primaryUrl ? button(success.primaryLabel,success.primaryUrl,true) : ''}${success.secondaryEnabled && success.secondaryUrl ? button(success.secondaryLabel,success.secondaryUrl) : ''}${success.showGroup && success.groupUrl ? button(success.groupLabel,success.groupUrl,true) : ''}${success.calendar && opportunity.startDate ? button(success.calendarLabel,calendar.toString()) : ''}${success.showRelated ? button(success.relatedLabel,programUrl(program)) : ''}${success.showContact ? button(success.contactLabel,success.contactUrl || `mailto:${contactEmail}`) : ''}</div>${success.showClose ? '<button class="sita-text-link" type="button" data-close-form>Close</button>' : ''}</div>`;
}
