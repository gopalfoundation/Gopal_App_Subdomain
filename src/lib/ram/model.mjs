export const TYPES = {
  OPEN_REGISTRATION: { label: 'Open Registration', button: 'Register Now', tone: 'green' },
  OPEN_WAITLIST: { label: 'Open Waitlist', button: 'Join Waitlist', tone: 'gold' },
  FUTURE_INTEREST: { label: 'Future Interest', button: "I'm Interested", tone: 'blue' }
};
export const STATUSES = { DRAFT: 'Draft', SCHEDULED: 'Scheduled', ...Object.fromEntries(Object.entries(TYPES).map(([key, value]) => [key, value.label])), CLOSED: 'Closed', ARCHIVED: 'Archived' };
export const SECTION_IDS = ['hero', 'about', 'programs', 'opportunities', 'videos', 'articles', 'involved'];
export const RESPONSE_STATUSES = ['NEW','REVIEWED','CONFIRMED','WAITLIST','CONTACTED','CANCELLED'];
export function successSettings(opportunity, form) {
  const old = form?.success || {};
  return { heading:old.heading || 'Registration Received!', message:old.message || 'Thank you for registering.', nextStepsHeading:old.nextStepsHeading || 'Next Steps', nextSteps:old.nextSteps || '', primaryEnabled:Boolean(old.actions?.[0]), primaryLabel:old.actions?.[0]?.label || '', primaryUrl:old.actions?.[0]?.url || '', secondaryEnabled:Boolean(old.actions?.[1]), secondaryLabel:old.actions?.[1]?.label || '', secondaryUrl:old.actions?.[1]?.url || '', calendar:Boolean(old.calendar), calendarLabel:old.calendarLabel || 'Add to Calendar', showGroup:Boolean(old.groupUrl), groupLabel:old.groupLabel || 'Join Participant Group', groupUrl:old.groupUrl || '', showContact:Boolean(old.contactLabel), contactLabel:old.contactLabel || 'Contact Us', contactUrl:old.contactUrl || '', showRelated:Boolean(old.relatedLabel), relatedLabel:old.relatedLabel || 'Related Program', showClose:true, ...opportunity.success };
}
export const escape = (value = '') => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
export const copy = value => JSON.parse(JSON.stringify(value));
export const ordered = items => [...items].sort((a,b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));
export const slugify = value => String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export function safeUrl(value, fallback = '#') {
  const url = String(value || '').trim();
  if (/^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(url)) return url;
  return fallback;
}
export function videoId(url) {
  try {
    const parsed = new URL(url);
    let id = '';
    if (['youtube.com','www.youtube.com','m.youtube.com'].includes(parsed.hostname)) id = parsed.searchParams.get('v') || parsed.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1] || '';
    if (parsed.hostname === 'youtu.be') id = parsed.pathname.slice(1).split('/')[0];
    return /^[\w-]{11}$/.test(id) ? id : '';
  } catch { return ''; }
}
export function opportunityType(opportunity, now = Date.now()) {
  if (['DRAFT','CLOSED','ARCHIVED'].includes(opportunity.status)) return '';
  if (opportunity.opensAt && Date.parse(opportunity.opensAt) > now) return '';
  if (opportunity.closesAt && Date.parse(opportunity.closesAt) <= now) return '';
  if (opportunity.status === 'SCHEDULED' && !opportunity.opensAt) return '';
  return TYPES[opportunity.registrationType] ? opportunity.registrationType : '';
}
export function publicOpportunities(content, now) {
  return ordered(content.opportunities).filter(opportunity => opportunity.displayOnRamPage && opportunityType(opportunity, now) && content.programs.some(p => p.id === opportunity.programId && p.active && p.initiative === 'RAM') && content.forms.some(f => f.id === opportunity.formId));
}
export function programUrl(program) {
  return safeUrl(program.pageUrl, `/ram/programs/${encodeURIComponent(program.slug)}/`);
}
export function localDateTime(iso, timezone) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('sv-SE', {timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso)).replace(' ','T');
}
export function zonedDateTime(value, timezone) {
  if (!value) return '';
  const desired = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(desired)) throw new Error('Please enter a valid date and time.');
  let instant = desired;
  // Resolve the timezone offset at the selected instant, including daylight saving.
  for (let attempt = 0; attempt < 4; attempt++) {
    const displayed = localDateTime(new Date(instant).toISOString(),timezone);
    const delta = desired - Date.parse(`${displayed}:00Z`);
    if (!delta) return new Date(instant).toISOString();
    instant += delta;
  }
  throw new Error('This local time does not exist in the selected timezone. Please choose another time.');
}
export function validateContent(content) {
  if (!content || content.version !== 1) throw new Error('This RAM content version is not supported.');
  const privateKeys = ['responses','submissions','participants','backendToken','passwordHash','privateKey','clientSecret','accessToken','refreshToken','sheetCredentials'];
  function rejectPrivate(value) {
    if (!value || typeof value !== 'object') return;
    for (const [key,item] of Object.entries(value)) { if (privateKeys.includes(key)) throw new Error('Participant records and private credentials must stay outside public page content.'); rejectPrivate(item); }
  }
  rejectPrivate(content);
  for (const record of [content,...(content.forms || []),...(content.opportunities || [])]) if (['responses','submissions','participants'].some(key => key in record)) throw new Error('Participant records must be kept in the registration service, separate from page content.');
  for (const key of ['hero','about','seo','videoSettings','submission']) if (!content[key] || typeof content[key] !== 'object') throw new Error(`Please complete ${key} settings.`);
  for (const key of ['programs','opportunities','forms','videos','articles','involved','sections','media']) {
    if (!Array.isArray(content[key])) throw new Error(`Please check the ${key} list.`);
    const ids = content[key].map(item => item.id);
    if (ids.some(id => typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id)) || new Set(ids).size !== ids.length) throw new Error(`Each ${key} entry must have a unique identifier.`);
  }
  if (content.sections.length !== SECTION_IDS.length || SECTION_IDS.some(id => !content.sections.some(s => s.id === id))) throw new Error('Please include each RAM section once.');
  const slugs = content.programs.map(p => p.slug);
  if (new Set(slugs).size !== slugs.length) throw new Error('Each program needs a different page name.');
  const articleSlugs = content.articles.map(a => a.slug);
  if (new Set(articleSlugs).size !== articleSlugs.length) throw new Error('Each article needs a different page name.');
  for (const program of content.programs) if (!program.title || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(program.slug) || !program.category || !program.audience || program.initiative !== 'RAM') throw new Error('Each RAM program needs a title, category, audience and a page name using lowercase words separated by hyphens.');
  for (const article of content.articles) if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)) throw new Error('Each article needs a page name using lowercase words separated by hyphens.');
  for (const opportunity of content.opportunities) {
    try { new Intl.DateTimeFormat('en-US',{timeZone:opportunity.timezone}); } catch { throw new Error('Please enter a valid timezone, such as America/Los_Angeles.'); }
    if (!opportunity.name || !content.programs.some(p => p.id === opportunity.programId)) throw new Error('Each opportunity needs a name and a related RAM program.');
    if (!TYPES[opportunity.registrationType] || !STATUSES[opportunity.status]) throw new Error('Please choose a valid opportunity type and status.');
    if (!content.forms.some(f => f.id === opportunity.formId)) throw new Error('Please select a form for each opportunity.');
    if (opportunity.success && !opportunity.success.heading?.trim()) throw new Error('Each opportunity needs a success heading.');
    if (opportunity.status === 'SCHEDULED' && !opportunity.opensAt) throw new Error('A scheduled opportunity needs an opening date.');
    if (opportunity.startDate && opportunity.endDate && opportunity.startDate > opportunity.endDate) throw new Error('The end date must follow the start date.');
    if (opportunity.opensAt && opportunity.closesAt && Date.parse(opportunity.opensAt) >= Date.parse(opportunity.closesAt)) throw new Error('Registration must close after it opens.');
    for (const key of ['opensAt','closesAt']) if (opportunity[key] && !Number.isFinite(Date.parse(opportunity[key]))) throw new Error('Please use a valid registration date.');
    if (['OPEN_REGISTRATION','OPEN_WAITLIST','FUTURE_INTEREST'].includes(opportunity.status) && opportunity.status !== opportunity.registrationType) throw new Error('The open status must match the opportunity registration type.');
  }
  for (const form of content.forms) {
    if (!form.heading || !Array.isArray(form.questions)) throw new Error('Each form needs a heading and questions.');
    const ids = form.questions.map(q => q.id);
    if (new Set(ids).size !== ids.length || ids.some(id => !/^[a-zA-Z0-9_-]+$/.test(id))) throw new Error('Each form question needs a unique identifier.');
    for (const question of form.questions) if (!question.label || !['shortText','longText','email','phone','number','date','dropdown','singleChoice','multipleChoice','yesNo','checkbox','consent','info','heading'].includes(question.type)) throw new Error('Please complete each question label and type.');
  }
  for (const video of content.videos) if (!videoId(video.url)) throw new Error('Please enter a valid YouTube video link.');
  if (content.videoSettings.channelId && !/^UC[\w-]{22}$/.test(content.videoSettings.channelId)) throw new Error('The YouTube channel ID should start with UC and contain 24 characters.');
  if (content.submission.endpoint && content.submission.endpoint !== '/api/ram/registrations/submit' && !/^https:\/\//.test(content.submission.endpoint)) throw new Error('The registration service address must use HTTPS or the private RAM proxy.');
  return content;
}
export function duplicateOpportunity(content, id, newId) {
  const source = content.opportunities.find(item => item.id === id);
  if (!source) throw new Error('Opportunity not found.');
  const form = copy(content.forms.find(item => item.id === source.formId));
  for (const key of ['responses','submissions','participants']) delete form[key];
  form.id = `form-${newId}`;
  form.name += ' Copy';
  content.forms.push(form);
  const result = { ...copy(source), id: newId, formId: form.id, name: `${source.name} Copy`, status: 'DRAFT', opensAt: '', closesAt: '', displayOrder: content.opportunities.length + 1 };
  for (const key of ['responses','submissions','participants']) delete result[key];
  content.opportunities.push(result);
  return result;
}
