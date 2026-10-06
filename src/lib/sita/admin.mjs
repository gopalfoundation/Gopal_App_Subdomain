import { createIcons, LayoutDashboard, Image, BookOpen, CalendarDays, Video, FileText, HeartHandshake, Search, Settings, Eye, Save, Upload, X, Plus, Pencil, Copy, ArrowUp, ArrowDown, Trash2, Play, CircleCheck, Sprout, Users, HandHeart, Heart, Mail } from 'lucide';
import { escape as e, safeUrl, copy, ordered, TYPES, STATUSES, validateContent, duplicateOpportunity, publicOpportunities, videoId, localDateTime, zonedDateTime, successSettings } from './model.mjs';
import { renderSuccess, videoFacade } from './render.mjs';
import { initResponseAdmin, initOpportunityResponseCounts } from './response-admin.mjs';
import { initTestimonialsAdmin } from '../testimonials/admin.mjs';
const icons = { LayoutDashboard, Image, BookOpen, CalendarDays, Video, FileText, HeartHandshake, Search, Settings, Eye, Save, Upload, X, Plus, Pencil, Copy, ArrowUp, ArrowDown, Trash2, Play, CircleCheck, Sprout, Users, HandHeart, Heart, Mail };
const tabs = [ ['overview','Overview','LayoutDashboard'], ['hero','Hero','Image'], ['about','About','BookOpen'], ['programs','Featured Programs','BookOpen'], ['opportunities','Registrations','CalendarDays'], ['journey','Journey / Why It Matters','Sprout'], ['videos','Videos','Video'], ['articles','Articles','FileText'], ['testimonials','Testimonials','Heart'], ['involved','Get Involved','HeartHandshake'], ['media','Images / Media','Image'], ['seo','SEO','Search'], ['settings','Page Settings','Settings'] ];
const uid = prefix => `${prefix}-${crypto.randomUUID()}`;
const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
const button = (label, action, id = '', iconName = '', extra = '') => `<button type="button" data-action="${action}" data-id="${e(id)}" ${extra}>${iconName ? icon(iconName) : ''}${e(label)}</button>`;
const tool = (label, action, id, iconName, extra = '') => `<button type="button" class="rc-icon" title="${e(label)}" aria-label="${e(label)}" data-action="${action}" data-id="${e(id)}" ${extra}>${icon(iconName)}</button>`;
const group = (title, fields) => `<section class="rc-editor-section"><h3>${e(title)}</h3><div class="rc-field-grid">${fields}</div></section>`;
const iconOptions = ['BookOpen','Sprout','Users','HeartHandshake','HandHeart','Heart','Mail','CalendarDays'];

export async function initSitaAdmin() {
  let online = false;
  let content, revision, savedSnapshot, publicationLabel = 'Published locally', dirty = false, selectedTab = location.hash.slice(1) || 'overview', editing = null, beforeEdit = null, mediaTarget = null;
  let testimonialEditor = null;
  let registrationTab = 'opportunities', opportunityTab = 'details', closeResponses = null, responseOpportunity = '';
  if (selectedTab === 'responses') { selectedTab = 'opportunities'; registrationTab = 'responses'; }
  const view = document.querySelector('[data-sita-admin-view]');
  const dialog = document.querySelector('#sita-record-dialog');
  const mediaDialog = document.querySelector('#sita-media-dialog');
  const previewDialog = document.querySelector('#sita-preview-dialog');
  const status = document.querySelector('[data-sita-admin-status]');
  function message(text, error = false) { status.textContent = text; status.dataset.error = String(error); }
  function markDirty() { dirty = true; document.querySelector('[data-publication-state]').textContent = 'Unpublished changes'; }
  function get(path) { return path.split('.').reduce((value,key) => value?.[key], content); }
  function set(path,value) { const keys = path.split('.'); const last = keys.pop(); const parent = keys.reduce((value,key) => value[key],content); parent[last] = value; markDirty(); }
  function field(path,label,type = 'text',options = [],hint = '') {
    if (/^opportunities\..*\.(opensAt|closesAt)$/.test(path)) { type = 'datetime-local'; hint = 'Times use the timezone selected for this opportunity.'; }
    if (/^opportunities\..*\.timezone$/.test(path)) { type = 'select'; options = [...new Set([get(path),'America/Los_Angeles','America/Denver','America/Chicago','America/New_York','Asia/Kolkata','Europe/London','UTC'].filter(Boolean))]; }
    let value = get(path) ?? '';
    const timezone = type === 'datetime-local' ? get(path.replace(/\.[^.]+$/,'.timezone')) : '';
    if (type === 'datetime-local') value = localDateTime(value,timezone);
    const attr = `data-path="${e(path)}"`;
    if (type === 'toggle') return `<label class="rc-switch"><input type="checkbox" ${attr} ${value ? 'checked' : ''} role="switch">${e(label)}</label>`;
    let control;
    if (type === 'select') control = `<select ${attr}>${options.map(option => { const key = typeof option === 'object' ? option.value : option; const name = typeof option === 'object' ? option.label : option; return `<option value="${e(key)}" ${String(key) === String(value) ? 'selected' : ''}>${e(name)}</option>`; }).join('')}</select>`;
    else if (['textarea','lines'].includes(type)) control = `<textarea ${attr} ${type === 'lines' ? 'data-lines' : ''} rows="3">${e(type === 'lines' ? (Array.isArray(value) ? value : []).join('\n') : value)}</textarea>`;
    else control = `<input ${attr} type="${type}" value="${e(value)}" ${type === 'datetime-local' ? `data-timezone="${e(timezone)}"` : ''} ${type === 'number' ? 'min="0"' : ''}>`;
    return `<label class="rc-field ${['textarea','lines'].includes(type) ? 'rc-wide' : ''}">${e(label)}${control}${hint ? `<small>${e(hint)}</small>` : ''}</label>`;
  }
  function imageField(path,label,altPath = '') {
    return `<div class="rc-image-field" data-image-field="${e(path)}"><img src="${e(safeUrl(get(path),'/logos/sita-logo.png'))}" alt="${e(get(altPath) || label)}"><div><strong>${e(label)}</strong>${button(get(path) ? 'Replace Image' : 'Select Image','media-select',path,'Image')}${get(path) ? button('Clear','media-clear',path,'X') : ''}${altPath ? field(altPath,'Alt Text') : ''}</div></div>`;
  }
  const top = (heading,text,action = '',label = '') => `<div class="rc-section-top"><div><h2>${e(heading)}</h2>${text ? `<p>${e(text)}</p>` : ''}</div>${action ? button(label,action,'','Plus') : ''}</div>`;
  function sectionVisibility(id) { const index = content.sections.findIndex(s => s.id === id); return field(`sections.${index}.visible`,'Show this section','toggle'); }
  function list(collection,filter = () => true) {
    return `<div class="rc-list">${ordered(get(collection)).filter(filter).map(record => {
      const name = record.title || record.name;
      const image = record.image || (collection === 'videos' && videoId(record.url) ? `https://i.ytimg.com/vi/${videoId(record.url)}/hqdefault.jpg` : '');
      const state = record.status ? STATUSES[record.status] : collection === 'articles' ? (record.published ? 'Published' : 'Draft') : record.enabled === false || record.active === false ? 'Hidden' : record.featured ? 'Featured' : 'Active';
      return `<article class="rc-record">${image ? `<img src="${e(safeUrl(image))}" alt="${e(record.imageAlt || name)}">` : icon(record.icon || (collection === 'videos' ? 'Video' : 'BookOpen'))}<div><h3>${e(name)}</h3><p>${e(record.category || record.description || record.excerpt || '')}</p><span class="rc-badge" data-tone="${TYPES[record.status]?.tone || ''}">${e(state)}</span>${collection === 'opportunities' ? `<p class="rc-muted" data-response-count="${e(record.id)}">Loading response count...</p>` : ''}</div><div class="rc-actions">${button('Edit','edit',record.id,'Pencil',`data-collection="${collection}"`)}${collection === 'opportunities' ? `${button('View Responses','view-responses',record.id,'Users')}${button('Preview','opportunity-preview',record.id,'Eye')}${tool('Duplicate','duplicate-opportunity',record.id,'Copy')}${['DRAFT','SCHEDULED','CLOSED','ARCHIVED'].includes(record.status) ? button('Launch','launch',record.id,'Play') : button('Close','close',record.id,'X')}${record.status !== 'ARCHIVED' ? tool('Archive','archive',record.id,'Trash2') : ''}` : ''}${['programs','articles'].includes(collection) ? button('Archive','archive-record',record.id,'Trash2',`data-collection="${collection}"`) : ''}${['programs','articles','videos'].includes(collection) ? button(record.featured ? 'Unfeature' : 'Feature','feature',record.id,'CircleCheck',`data-collection="${collection}"`) : ''}${collection === 'programs' ? button('Preview','program-preview',record.id,'Eye')+button(record.active ? 'Hide' : 'Show','toggle-active',record.id,'Eye',`data-collection="${collection}"`) : ''}${collection === 'articles' ? `${button(record.published ? 'Unpublish' : 'Publish','toggle-published',record.id,'Upload',`data-collection="${collection}"`)}${button('Preview','article-preview',record.id,'Eye')}` : ''}${['videos','involved','about.values','journey.items','why.items'].includes(collection) ? button(record.enabled ? 'Hide' : 'Show','toggle-enabled',record.id,'Eye',`data-collection="${collection}"`) : ''}${tool('Move Up','up',record.id,'ArrowUp',`data-collection="${collection}"`)}${tool('Move Down','down',record.id,'ArrowDown',`data-collection="${collection}"`)}${['about.values','involved','videos','journey.items','why.items'].includes(collection) ? tool('Remove','remove',record.id,'Trash2',`data-collection="${collection}"`) : ''}</div></article>`;
    }).join('') || '<p class="rc-muted">No entries yet.</p>'}</div>`;
  }
  function render() {
    closeResponses?.(); closeResponses = null; testimonialEditor?.destroy(); testimonialEditor = null;
    if (!tabs.some(t => t[0] === selectedTab)) selectedTab = 'overview';
    document.querySelector('[data-sita-admin-nav]').innerHTML = tabs.map(([key,label,iconName]) => `<button type="button" data-nav="${key}" ${selectedTab === key ? 'aria-current="page"' : ''}>${icon(iconName)}${label}</button>`).join('');
    const ramOpen = publicOpportunities(content);
    const surfaces = {
      overview: () => `${top('SITA Page',online ? 'Live website /sita/' : 'Local website /sita/')}<div class="rc-stats">${[
        ['Featured Programs',content.programs.filter(p => p.featured && p.active).length], ['Open Registrations',ramOpen.filter(o => o.registrationType === 'OPEN_REGISTRATION').length], ['Waitlists',ramOpen.filter(o => o.registrationType === 'OPEN_WAITLIST').length], ['Future Interest',ramOpen.filter(o => o.registrationType === 'FUTURE_INTEREST').length], ['Videos',content.videos.filter(v => v.enabled).length], ['Articles',content.articles.filter(a => a.published).length], ['Testimonials','Loading...']
      ].map(([label,count]) => `<div class="rc-stat"><strong>${count}</strong><span>${label}</span></div>`).join('')}</div><div class="rc-overview-layout"><div><img class="rc-overview-image" src="${e(safeUrl(content.hero.image))}" alt="${e(content.hero.imageAlt)}"><h3>${e(content.hero.title)}</h3><p class="rc-muted">${e(content.hero.tagline)}</p></div><div><h3>Quick Actions</h3><div class="rc-quick-actions">${button('Edit Hero','go','hero','Pencil')}${button('Add Program','add-program','','Plus')}${button('Create Opportunity','add-opportunity','','CalendarDays')}${button('Add Video','add-video','','Video')}${button('Add Article','add-article','','FileText')}${button('Testimonials','go','testimonials','Heart')}${button('Preview SITA Page','preview','','Eye')}<a class="rc-button" href="/sita/" target="_blank" rel="noreferrer">View Live SITA Page</a></div><p class="rc-muted" style="margin-top:20px">The starter opportunities are examples. Review dates and connect registration delivery before sharing them.</p></div></div>`,
      hero: () => `${top('Hero','The first impression of SITA.')}${sectionVisibility('hero')}${group('Images',imageField('hero.logo','SITA Logo','hero.logoAlt') + imageField('hero.image','Background Image','hero.imageAlt'))}${group('Page Introduction',field('hero.eyebrow','Eyebrow')+field('hero.title','Page Title')+field('hero.subtitle','Subtitle')+field('hero.tagline','Tagline')+field('hero.intro','Introduction','textarea'))}${group('Brand Words',content.hero.brandWords.map((_,i) => field(`hero.brandWords.${i}`,`Brand Word ${i+1}`)).join(''))}${group('Primary Button',field('hero.primaryLabel','Button Label')+field('hero.primaryUrl','Destination')+field('hero.primaryVisible','Show Button','toggle'))}${group('Secondary Button',field('hero.secondaryLabel','Button Label')+field('hero.secondaryUrl','Destination')+field('hero.secondaryVisible','Show Button','toggle'))}`,
      about: () => `${top('About SITA','Introduce SITA and the values it brings to everyday life.','add-value','Add Value')}${sectionVisibility('about')}${group('Introduction',field('about.heading','Section Heading')+field('about.description','Main Description','textarea')+field('about.buttonLabel','Button Label')+field('about.buttonUrl','Button Destination')+field('about.buttonVisible','Show Button','toggle'))}${imageField('about.image','About Image','about.imageAlt')}<h3>Value Cards</h3>${list('about.values')}`,
      programs: () => `${top('Featured Programs','Permanent program pages remain available when registration closes.','add-program','Add Program')}${sectionVisibility('programs')}${group('Section Content',field('programsHeading','Heading')+field('programsIntro','Supporting Text'))}${list('programs')}`,
      opportunities: () => `${top('SITA Registrations','Manage batches, waitlists and future interest separately from programs.','add-opportunity','Create Opportunity')}${sectionVisibility('opportunities')}${group('Section Content',field('opportunitiesHeading','Heading')+field('opportunitiesIntro','Supporting Text'))}${[
        ['Open',o => ['OPEN_REGISTRATION','OPEN_WAITLIST'].includes(o.status)], ['Future Interest',o => o.status === 'FUTURE_INTEREST'], ['Draft / Scheduled',o => ['DRAFT','SCHEDULED'].includes(o.status)], ['Closed / Archived',o => ['CLOSED','ARCHIVED'].includes(o.status)]
      ].map(([heading,filter]) => `<div class="rc-group"><h3>${heading}</h3>${list('opportunities',filter)}</div>`).join('')}<div class="rc-group"><h3>Registration Delivery</h3><p>Shared private Google Sheet. Check its connection from Responses.</p></div>`,
      journey: () => `${top('Journey / Why It Matters','Shape the educational themes and learning experience.')}${['journey','why'].map(key=>`${sectionVisibility(key)}${group(key === 'journey' ? 'The SITA Journey' : 'Why It Matters',field(`${key}.heading`,'Heading')+field(`${key}.intro`,'Introduction'))}${button('Add Item','add-theme',key,'Plus')}${list(`${key}.items`)}`).join('')}`,
      videos: () => `${top('SITA Videos','Curate videos or import the latest uploads from your channel.','add-video','Add YouTube Video')}${sectionVisibility('videos')}${group('Section Content',field('videosHeading','Heading')+field('videosIntro','Supporting Text'))}${group('Video Source',field('videoSettings.sourceType','Video Source Type','select',['CHANNEL','PLAYLIST','MANUAL_CURATION'])+field('videoSettings.playlistId','Playlist ID'))+group('YouTube Channel',field('videoSettings.channelUrl','Channel URL','url')+field('videoSettings.channelId','Channel ID')+field('videoSettings.automatic','Automatically Import Latest Videos','toggle')+field('videoSettings.count','Number of Videos','number')+field('videoSettings.featuredMode','Featured Video Mode','select',[{value:'AUTO_LATEST',label:'Latest Upload'},{value:'MANUAL',label:'Choose a Video'}])+field('videoSettings.featuredId','Featured Video','select',[{value:'',label:'Select Video'},...content.videos.map(v => ({value:v.id,label:v.title}))])+field('videoSettings.showChannelButton','Show Channel Button','toggle')+field('videoSettings.channelButtonLabel','Channel Button Label'))}${button('Import Latest Videos','import-videos','','Video')}<div class="rc-group"><h3>Selected Videos</h3>${list('videos')}</div>`,
      articles: () => `${top('Articles & Insights','Write, preview and publish articles within SITA.','add-article','Create Article')}${sectionVisibility('articles')}${group('Section Content',field('articlesHeading','Heading')+field('articlesIntro','Supporting Text'))}${list('articles')}`,
      testimonials: () => '<div data-testimonial-admin></div>',
      involved: () => `${top('Get Involved','Connect visitors with programs, volunteering and support.','add-involved','Add Card')}${sectionVisibility('involved')}${group('Section Content',field('involvedHeading','Heading')+field('involvedIntro','Supporting Text'))}${list('involved')}`,
      media: () => `${top('Page Images / Media','Select and replace images with a visual preview.')}${imageField('hero.logo','SITA Logo','hero.logoAlt')}${imageField('hero.image','Hero Image','hero.imageAlt')}${imageField('about.image','About Image','about.imageAlt')}${['programs','opportunities','articles','journey.items','why.items'].map(collection => `<div class="rc-group"><h3>${collection}</h3>${get(collection).map((record,index) => imageField(`${collection}.${index}.image`,record.title || record.name,`${collection}.${index}.imageAlt`)).join('')}</div>`).join('')}`,
      seo: () => `${top('Search & Social','Control how SITA appears in search and shared links.')}${group('Search',field('seo.title','SEO Title','text',[],`${content.seo.title.length} characters. Aim for about 50-60.`)+field('seo.description','Meta Description','textarea',[],`${content.seo.description.length} characters. Aim for about 140-160.`)+field('seo.canonical','Canonical URL','url')+field('seo.index','Allow Search Indexing','toggle'))}${group('Social Sharing',field('seo.socialTitle','Social Title')+field('seo.socialDescription','Social Description','textarea'))}${imageField('seo.socialImage','Social Image')}`,
      settings: () => `${top('Page Settings','Choose which sections appear and adjust their order.')}<div class="rc-list">${content.sections.map((section,index) => `<div class="rc-record"><span>${icon('LayoutDashboard')}</span><div><h3>${e(section.label)}</h3>${field(`sections.${index}.visible`,'Visible','toggle')}</div><div class="rc-actions">${tool('Move Section Up','section-up',section.id,'ArrowUp',''+(index === 0 || section.id === 'hero' || index === 1 ? 'disabled' : ''))}${tool('Move Section Down','section-down',section.id,'ArrowDown',index === content.sections.length-1 || section.id === 'hero' ? 'disabled' : '')}</div></div>`).join('')}</div>`
    };
    view.innerHTML = surfaces[selectedTab]();
    if (selectedTab === 'testimonials') testimonialEditor = initTestimonialsAdmin(view.querySelector('[data-testimonial-admin]'),'SITA',content.programs,content.media);
    if (selectedTab === 'overview') { fetch('/api/testimonials/content',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{if (selectedTab !== 'overview') return; const box=[...view.querySelectorAll('.rc-stat')].find(n=>n.querySelector('span')?.textContent === 'Testimonials'); if (box) box.querySelector('strong').textContent=data ? String(data.published.records.filter(r=>(Array.isArray(r.initiative)?r.initiative:[r.initiative]).includes('SITA')&&r.published&&r.consentConfirmed&&!r.archived).length) : 'Unavailable';}).catch(()=>{}); }
    if (selectedTab === 'opportunities') {
      view.insertAdjacentHTML('afterbegin',`<div class="rc-form-subtabs">${button('Opportunities','registration-tab','opportunities','','aria-pressed="'+(registrationTab === 'opportunities')+'"')}${button('Responses','registration-tab','responses','','aria-pressed="'+(registrationTab === 'responses')+'"')}</div>`);
      if (registrationTab === 'responses') {
        const nav = view.firstElementChild; view.replaceChildren(nav);
        const container = document.createElement('section'); view.append(container); closeResponses = initResponseAdmin(container,content,responseOpportunity);
      }
    }
    if (selectedTab === 'opportunities' && registrationTab === 'opportunities') closeResponses = initOpportunityResponseCounts(view);
    if (selectedTab === 'videos') {
      view.insertAdjacentHTML('beforeend',group('Playlist Display',field('videoSettings.showDate','Show Published Date','toggle')+field('videoSettings.showDuration','Show Duration When Available','toggle')+field('videoSettings.showDescription','Show Video Descriptions','toggle')+field('videoSettings.channelNewTab','Open Channel in New Tab','toggle')));
      view.querySelectorAll('.rc-record').forEach(row => {
        const id = row.querySelector('[data-action="edit"]')?.dataset.id;
        const video = content.videos.find(v => v.id === id); if (!video) return;
        row.querySelector('.rc-actions').insertAdjacentHTML('afterbegin',button('Preview','video-preview',id,'Eye'));
        row.querySelector('h3').insertAdjacentHTML('afterend',`<p>${video.source === 'feed' ? 'YouTube Feed' : 'Manual'} / ${video.enabled ? 'Visible' : 'Hidden'} / Featured: ${content.videoSettings.featuredMode === 'MANUAL' ? (id === content.videoSettings.featuredId ? 'Yes' : 'No') : (id === [...content.videos].filter(v => v.enabled).sort((a,b) => String(b.publishedAt).localeCompare(String(a.publishedAt)))[0]?.id ? 'Yes' : 'No')}</p>`);
      });
    }
    createIcons({icons});
  }
  function afterSubmissionFields(index) {
    const p = `opportunities.${index}.success`;
    return group('Success Message',field(`${p}.heading`,'Success Heading')+field(`${p}.message`,'Success Message','textarea')+field(`${p}.nextStepsHeading`,'Next Steps Heading')+field(`${p}.nextSteps`,'Next Steps Content','textarea'))+group('Primary Button',field(`${p}.primaryEnabled`,'Primary Button Enabled','toggle')+field(`${p}.primaryLabel`,'Primary Button Label')+field(`${p}.primaryUrl`,'Primary Button URL'))+group('Secondary Button',field(`${p}.secondaryEnabled`,'Secondary Button Enabled','toggle')+field(`${p}.secondaryLabel`,'Secondary Button Label')+field(`${p}.secondaryUrl`,'Secondary Button URL'))+group('After Submission Options',field(`${p}.calendar`,'Show Add to Calendar','toggle')+field(`${p}.calendarLabel`,'Calendar Button Label')+field(`${p}.showGroup`,'Show Participant Group Button','toggle')+field(`${p}.groupLabel`,'Participant Group Button Label')+field(`${p}.groupUrl`,'Participant Group URL')+field(`${p}.showContact`,'Show Contact Information','toggle')+field(`${p}.contactLabel`,'Contact Button Label')+field(`${p}.contactUrl`,'Contact Button URL')+field(`${p}.showRelated`,'Show Related Programs','toggle')+field(`${p}.relatedLabel`,'Related Program Button Label')+field(`${p}.showClose`,'Show Close Button','toggle'))+button('Preview Success Message','success-preview',content.opportunities[index].id,'Eye');
  }
  function programFields(index) {
    const p = `programs.${index}`;
    return group('Program Details',field(`${p}.title`,'Program Name')+field(`${p}.slug`,'Page Name')+field(`${p}.shortDescription`,'Short Description','textarea')+field(`${p}.fullDescription`,'Full Description','textarea')+field(`${p}.category`,'Category')+field(`${p}.audience`,'Audience')+field(`${p}.featured`,'Featured','toggle')+field(`${p}.active`,'Active','toggle')+field(`${p}.displayOrder`,'Display Order','number')+field(`${p}.pageUrl`,'Custom Program Link (Optional)'))+imageField(`${p}.image`,'Program Image',`${p}.imageAlt`)+group('Search',field(`${p}.seoTitle`,'SEO Title')+field(`${p}.seoDescription`,'SEO Description','textarea')+field(`${p}.index`,'Allow Search Indexing','toggle'))+imageField(`${p}.socialImage`,'Social Image')+group('Program Experience',field(`${p}.explore`,'What Participants Explore (One Item Per Line)','textarea')+field(`${p}.journey`,'Program Journey (One Step Per Line)','textarea')+field(`${p}.schedule`,'Schedule','textarea')+field(`${p}.faqText`,'FAQs (Question | Answer Per Line)','textarea'));
  }
  function opportunityFields(index) {
    const p = `opportunities.${index}`;
    return group('Basic Information',field(`${p}.name`,'Opportunity Name')+field(`${p}.programId`,'Related Program','select',content.programs.map(p => ({value:p.id,label:p.title})))+field(`${p}.registrationType`,'Registration Type','select',Object.entries(TYPES).map(([value,type]) => ({value,label:type.label})))+field(`${p}.status`,'Status','select',Object.entries(STATUSES).map(([value,label]) => ({value,label})))+field(`${p}.description`,'Short Description','textarea'))+imageField(`${p}.image`,'Opportunity Image (Optional)',`${p}.imageAlt`)+group('Schedule',field(`${p}.startDate`,'Start Date','date')+field(`${p}.endDate`,'End Date','date')+field(`${p}.timezone`,'Timezone')+field(`${p}.location`,'Location')+field(`${p}.format`,'Session Format','select',['Online','In Person','Hybrid'])+field(`${p}.schedule`,'Session Details'))+group('Audience',field(`${p}.audience`,'Audience')+field(`${p}.ageRange`,'Age Range'))+group('Registration',field(`${p}.formId`,'Associated RSVP Form','select',content.forms.map(f => ({value:f.id,label:f.name})))+field(`${p}.opensAt`,'Opening Date & Time','text',[],'Include the timezone offset, for example 2026-12-01T09:00:00-08:00.')+field(`${p}.closesAt`,'Closing Date & Time','text',[],'Include the timezone offset.')+field(`${p}.displayOnSitaPage`,'Display on SITA Page','toggle')+field(`${p}.featured`,'Featured','toggle')+field(`${p}.displayOrder`,'Display Order','number'))+`<div class="rc-actions">${button('Edit Selected Form','edit-associated-form',content.opportunities[index].id,'Pencil')}${button('Create New Form','new-associated-form',content.opportunities[index].id,'Plus')}${button('Duplicate Selected Form','duplicate-associated-form',content.opportunities[index].id,'Copy')}</div>`+group('Button',field(`${p}.buttonLabel`,'Button Label'))+group('Search (Optional)',field(`${p}.seoTitle`,'SEO Title')+field(`${p}.seoDescription`,'SEO Description','textarea'));
  }
  function formFields(index) {
    const p = `forms.${index}`;
    const form = content.forms[index];
    const basics = group('Form Introduction',field(`${p}.name`,'Form Name')+field(`${p}.heading`,'Heading')+field(`${p}.description`,'Introduction','textarea')+field(`${p}.submitLabel`,'Submit Button Label'));
    const types = window.SITA_RAM_QUESTION_TYPES || { shortText:'Short Answer', longText:'Paragraph', email:'Email', phone:'Phone', number:'Number', date:'Date', dropdown:'Dropdown', singleChoice:'Single Choice', multipleChoice:'Multiple Choice', yesNo:'Yes / No', consent:'Consent', info:'Information', heading:'Section Heading' };
    return basics + `<div class="rc-actions">${button('Add Question','add-question','','Plus')}</div>${form.questions.map((q,i) => `<section class="rc-question"><div class="rc-actions"><strong>Question ${i+1}</strong><div>${tool('Move Question Up','question-up',String(i),'ArrowUp')}${tool('Move Question Down','question-down',String(i),'ArrowDown')}${tool('Remove Question','question-remove',String(i),'Trash2')}</div></div><div class="rc-field-grid">${field(`${p}.questions.${i}.label`,'Question Label')}${field(`${p}.questions.${i}.type`,'Answer Type','select',Object.entries(types).map(([value,label]) => ({value,label})))}${field(`${p}.questions.${i}.required`,'Required','toggle')}${field(`${p}.questions.${i}.enabled`,'Visible','toggle')}${field(`${p}.questions.${i}.placeholder`,'Placeholder')}${field(`${p}.questions.${i}.description`,'Help Text')}${['dropdown','singleChoice','multipleChoice'].includes(q.type) ? field(`${p}.questions.${i}.options`,'Answer Options','lines',[],'One option per line.') : ''}</div></section>`).join('')}`;
  }
  function recordFields(collection,index) {
    const p = `${collection}.${index}`;
    if (collection === 'programs') return programFields(index);
    if (collection === 'opportunities') {
      const tabs = `<div class="rc-form-subtabs">${button('Opportunity Details','opportunity-tab','details','','aria-pressed="'+(opportunityTab === 'details')+'"')}${button('After Submission','opportunity-tab','success','','aria-pressed="'+(opportunityTab === 'success')+'"')}</div>`;
      return tabs+(opportunityTab === 'success' ? afterSubmissionFields(index) : opportunityFields(index));
    }
    if (collection === 'forms') return formFields(index);
    if (collection === 'articles') return group('Article',field(`${p}.title`,'Title')+field(`${p}.slug`,'Page Name')+field(`${p}.excerpt`,'Excerpt','textarea')+field(`${p}.body`,'Article Content','textarea')+field(`${p}.programId`,'Related Program','select',[{value:'',label:'No Program'},...content.programs.map(p=>({value:p.id,label:p.title}))])+field(`${p}.author`,'Author')+field(`${p}.category`,'Category')+field(`${p}.tags`,'Tags (Comma Separated)')+field(`${p}.publishDate`,'Publish Date','date')+field(`${p}.published`,'Published','toggle')+field(`${p}.featured`,'Featured','toggle')+field(`${p}.displayOrder`,'Display Order','number'))+imageField(`${p}.image`,'Article Image',`${p}.imageAlt`)+group('Search',field(`${p}.seoTitle`,'SEO Title')+field(`${p}.seoDescription`,'SEO Description','textarea'))+imageField(`${p}.socialImage`,'Social Image');
    if (collection === 'videos') return group('YouTube Video',field(`${p}.url`,'YouTube URL','url')+field(`${p}.title`,'Title')+field(`${p}.description`,'Description','textarea')+field(`${p}.programId`,'Related Program','select',[{value:'',label:'No Program'},...content.programs.map(p=>({value:p.id,label:p.title}))])+field(`${p}.publishedAt`,'Upload Date','date')+field(`${p}.enabled`,'Visible','toggle')+field(`${p}.featured`,'Featured','toggle')+field(`${p}.displayOrder`,'Display Order','number'))+imageField(`${p}.thumbnail`,'Thumbnail Override');
    if (['journey.items','why.items'].includes(collection)) return imageField(`${p}.image`,'Item Image (Optional)',`${p}.imageAlt`)+group('Card Content',field(`${p}.title`,'Title')+field(`${p}.description`,'Description','textarea')+field(`${p}.icon`,'Icon','select',iconOptions)+field(`${p}.enabled`,'Enabled','toggle')+field(`${p}.displayOrder`,'Display Order','number'));
    return group('Card Content',field(`${p}.title`,'Title')+field(`${p}.description`,'Description','textarea')+field(`${p}.icon`,'Icon','select',iconOptions)+field(`${p}.enabled`,'Enabled','toggle')+field(`${p}.displayOrder`,'Display Order','number')+(collection === 'involved' ? field(`${p}.url`,'Destination') : ''));
  }
  function renderRecord() {
    if (!editing) return;
    const index = get(editing.collection).findIndex(r => r.id === editing.id);
    const record = get(editing.collection)[index];
    document.querySelector('[data-record-heading]').textContent = editing.collection === 'forms' ? 'RSVP Form Editor' : record.title || record.name || 'Edit Entry';
    document.querySelector('[data-record-fields]').innerHTML = recordFields(editing.collection,index);
    createIcons({icons});
  }
  function openRecord(collection,id,original = copy(content)) {
    beforeEdit = original; editing = {collection,id}; opportunityTab = 'details';
    if (collection === 'opportunities') { const opportunity = content.opportunities.find(o => o.id === id); opportunity.success = successSettings(opportunity,content.forms.find(f => f.id === opportunity.formId)); }
    renderRecord(); if (!dialog.open) dialog.showModal();
  }
  function cancelRecord() { if (beforeEdit) content = beforeEdit; dirty = JSON.stringify(content) !== JSON.stringify(savedSnapshot); document.querySelector('[data-publication-state]').textContent = dirty ? 'Unpublished changes' : publicationLabel; editing = null; beforeEdit = null; dialog.close(); render(); }
  function newForm(type) {
    const source = content.forms.find(f => type === 'OPEN_WAITLIST' ? f.submitLabel === 'Join Waitlist' : type === 'FUTURE_INTEREST' ? f.submitLabel === 'Notify Me About Future Sessions' : true) || content.forms[0];
    const form = copy(source); form.id = uid('form'); form.name = 'New RSVP Form'; content.forms.push(form); return form;
  }
  function addRecord(collection) {
    const original = copy(content);
    const id = uid(collection.replace('.','-'));
    let record;
    if (collection === 'programs') record = {id,initiative:'SITA',title:'New SITA Program',slug:id,image:'',imageAlt:'',shortDescription:'',fullDescription:'',category:'Personal Development',audience:'Adults',featured:false,active:true,displayOrder:content.programs.length+1,pageUrl:'',seoTitle:'',seoDescription:''};
    if (collection === 'opportunities') {
      if (!content.programs.length) { message('Add a SITA program before creating an opportunity.',true); return; }
      const form = newForm('OPEN_REGISTRATION');
      record = {id,programId:content.programs[0].id,name:'New Opportunity',registrationType:'OPEN_REGISTRATION',status:'DRAFT',image:'',imageAlt:'',description:'',startDate:'',endDate:'',timezone:'America/Los_Angeles',location:'Online',format:'Online',audience:'Adults',ageRange:'',schedule:'',formId:form.id,opensAt:'',closesAt:'',displayOnSitaPage:true,featured:false,displayOrder:content.opportunities.length+1,buttonLabel:'Register Now',seoTitle:'',seoDescription:''};
    }
    if (collection === 'articles') record = {id,initiative:'SITA',title:'New Article',slug:id,image:'',imageAlt:'',excerpt:'',body:'',published:false,featured:false,displayOrder:content.articles.length+1,seoTitle:'',seoDescription:''};
    if (collection === 'videos') record = {id,title:'New SITA Video',url:'',description:'',thumbnail:'',publishedAt:'',enabled:true,featured:false,displayOrder:content.videos.length+1};
    if (['involved','about.values','journey.items','why.items'].includes(collection)) record = {id,title:'New Card',description:'',icon:'BookOpen',url:'/contact/',enabled:true,displayOrder:get(collection).length+1};
    get(collection).push(record); markDirty(); openRecord(collection,id,original);
  }
  async function api(path,data) {
    const response = await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const result = await response.json().catch(() => ({error:'The local editor is unavailable. Please restart the website server.'}));
    if (!response.ok) throw new Error(result.error || 'Unable to complete this action.');
    return result;
  }
  async function save(publish = false) {
    validateContent(content);
    message(publish ? 'Publishing SITA changes...' : 'Saving SITA draft...');
    const result = await api(publish ? '/api/sita/publish' : '/api/sita/draft',{content,revision});
    content = result.content; dirty = false; savedSnapshot = copy(content);
    if (publish) revision = content.updatedAt;
    publicationLabel = publish ? (online ? 'Published' : 'Published locally') : 'Draft saved';
    document.querySelector('[data-publication-state]').textContent = publicationLabel;
    message(publish ? (online ? 'SITA changes published to the live website.' : 'SITA changes published to the local website.') : 'SITA draft saved. The published page is unchanged.');
    return true;
  }
  async function preview(opportunityId = '') {
    await save(false);
    document.querySelector('[data-sita-preview-frame]').src = `/sita/?preview=draft${opportunityId ? '&opportunity='+encodeURIComponent(opportunityId) : ''}`;
    previewDialog.showModal();
  }
  function swap(collection,id,direction) {
    const rows = ordered(get(collection)); const index = rows.findIndex(r => r.id === id); const next = index+direction;
    if (next < 0 || next >= rows.length) return;
    [rows[index],rows[next]] = [rows[next],rows[index]];
    rows.forEach((row,i) => { row.displayOrder = i+1; }); markDirty();
  }
  function mediaLibrary() {
    const media = [...content.media];
    for (const collection of ['programs','opportunities','articles']) for (const record of content[collection]) if (record.image && !media.some(m => m.url === record.image)) media.push({id:record.id,name:record.title || record.name,url:record.image,alt:record.imageAlt || ''});
    document.querySelector('[data-media-library]').innerHTML = media.map(item => `<button class="rc-media-item" type="button" data-action="choose-media" data-id="${e(item.url)}"><img src="${e(safeUrl(item.url))}" alt="${e(item.alt)}"><span>${e(item.name)}</span></button>`).join('');
  }
  document.addEventListener('input',event => {
    const node = event.target.closest('[data-path]'); if (!node || !content) return;
    try { set(node.dataset.path,node.type === 'checkbox' ? node.checked : node.type === 'number' ? Number(node.value) : node.type === 'datetime-local' ? zonedDateTime(node.value,node.dataset.timezone) : node.hasAttribute('data-lines') ? node.value.split(/\r?\n/).filter(Boolean) : node.value); node.setCustomValidity(''); }
    catch(error) { node.setCustomValidity(error.message); }
  });
  document.addEventListener('change',event => {
    const node = event.target.closest('[data-path]');
    if (node?.dataset.path.endsWith('.type') && editing?.collection === 'forms') { if (!get(node.dataset.path.replace(/\.type$/,'.options'))) set(node.dataset.path.replace(/\.type$/,'.options'),[]); renderRecord(); }
    if (node?.dataset.path.endsWith('.timezone') && editing?.collection === 'opportunities') renderRecord();
    if (node?.dataset.path.endsWith('.registrationType') && editing?.collection === 'opportunities') {
      const opportunity = content.opportunities.find(o => o.id === editing.id);
      if (TYPES[opportunity.status]) opportunity.status = opportunity.registrationType;
      if (Object.values(TYPES).some(type => type.button === opportunity.buttonLabel)) opportunity.buttonLabel = TYPES[opportunity.registrationType].button;
      renderRecord();
    }
  });
  document.addEventListener('click',async event => {
    const nav = event.target.closest('[data-nav]');
    if (nav) { if (testimonialEditor?.hasUnsaved() && !confirm('Leave unsaved testimonial changes? Save Draft first to keep them.')) return; selectedTab = nav.dataset.nav; history.replaceState(null,'',`#${selectedTab}`); render(); return; }
    const target = event.target.closest('[data-action],[data-admin-action]');
    if (!target || !content) return;
    const action = target.dataset.action || target.dataset.adminAction; const id = target.dataset.id; const collection = target.dataset.collection; const record = collection ? get(collection).find(r => r.id === id) : null;
    try {
      if (action === 'add-theme') { addRecord(id+'.items'); return; }
      if (action === 'archive-record') { if (!confirm('Archive this entry?')) return; record.archived = true; if (collection === 'programs') record.active = false; else record.published = false; markDirty(); render(); return; }
      if (action === 'view-responses') { responseOpportunity = id; registrationTab = 'responses'; history.replaceState(null,'','#responses'); render(); return; }
      if (action === 'registration-tab') { responseOpportunity = ''; registrationTab = id; history.replaceState(null,'',`#${id}`); render(); return; }
      if (action === 'opportunity-tab') { opportunityTab = id; renderRecord(); return; }
      if (action === 'success-preview' || action === 'video-preview') {
        const preview = document.querySelector('#sita-experience-preview');
        const body = preview.querySelector('[data-experience-body]');
        preview.querySelector('h2').textContent = action === 'success-preview' ? 'Success Message Preview' : 'Video Preview';
        if (action === 'success-preview') {
          const opportunity = content.opportunities.find(o => o.id === id);
          body.innerHTML = renderSuccess(opportunity,content.forms.find(f => f.id === opportunity.formId),content.programs.find(p => p.id === opportunity.programId),'info@sitaram.gloryofpeaceandlove.org');
          body.querySelector('[data-close-form]')?.addEventListener('click',() => preview.close());
        } else body.innerHTML = videoFacade(content.videos.find(v => v.id === id));
        createIcons({icons}); preview.showModal(); return;
      }
      if (selectedTab === 'testimonials' && ['save','publish'].includes(action)) { await testimonialEditor.save(action === 'publish'); return; }
      if (selectedTab === 'testimonials' && action === 'preview') { testimonialEditor.preview(); return; }
      if (action === 'save') { await save(); return; }
      if (action === 'publish') { await save(true); render(); return; }
      if (action === 'preview') { await preview(); return; }
      if (action === 'go') { selectedTab = id; render(); return; }
      if (action === 'edit') { openRecord(collection,id); return; }
      const add = {'add-program':'programs','add-opportunity':'opportunities','add-video':'videos','add-article':'articles','add-value':'about.values','add-involved':'involved'};
      if (add[action]) { addRecord(add[action]); return; }
      if (action === 'media-select') { mediaTarget = id; mediaLibrary(); mediaDialog.showModal(); return; }
      if (action === 'choose-media' || action === 'media-clear') {
        set(action === 'media-clear' ? id : mediaTarget,action === 'media-clear' ? '' : id);
        if (action === 'choose-media') mediaDialog.close(); if (editing) renderRecord(); render(); return;
      }
      if (action === 'feature') { record.featured = !record.featured; if (collection === 'videos' && record.featured) { content.videoSettings.featuredMode = 'MANUAL'; content.videoSettings.featuredId = id; content.videos.filter(v => v.id !== id).forEach(v => {v.featured = false;}); } else if (collection === 'videos' && content.videoSettings.featuredId === id) { content.videoSettings.featuredMode = 'AUTO_LATEST'; content.videoSettings.featuredId = ''; } }
      if (action.startsWith('toggle-')) record[action.slice(7)] = !record[action.slice(7)];
      if (action === 'up' || action === 'down') swap(collection,id,action === 'up' ? -1 : 1);
      if (action === 'remove') { if (collection === 'videos' && record.source === 'feed') record.enabled = false; else set(collection,get(collection).filter(r => r.id !== id)); }
      if (['launch','close','archive'].includes(action)) { const opportunity = content.opportunities.find(o => o.id === id); opportunity.status = action === 'launch' ? opportunity.registrationType : action === 'close' ? 'CLOSED' : 'ARCHIVED'; if (action === 'launch') { if (Date.parse(opportunity.opensAt) > Date.now()) opportunity.opensAt = ''; if (Date.parse(opportunity.closesAt) <= Date.now()) opportunity.closesAt = ''; } }
      if (action === 'duplicate-opportunity') { const original = copy(content); const duplicate = duplicateOpportunity(content,id,uid('opportunity')); markDirty(); openRecord('opportunities',duplicate.id,original); return; }
      if (action === 'opportunity-preview') { await preview(id); return; }
      if (action === 'program-preview') { await save(); document.querySelector('[data-sita-preview-frame]').src = `/sita/program/?preview=draft&slug=${encodeURIComponent(content.programs.find(p=>p.id===id).slug)}`; previewDialog.showModal(); return; }
      if (action === 'article-preview') { await save(); document.querySelector('[data-sita-preview-frame]').src = `/sita/article/?preview=draft&slug=${encodeURIComponent(content.articles.find(a => a.id === id).slug)}`; previewDialog.showModal(); return; }
      if (['edit-associated-form','new-associated-form','duplicate-associated-form'].includes(action)) {
        const opportunity = content.opportunities.find(o => o.id === id);
        const original = copy(content);
        if (action === 'new-associated-form') opportunity.formId = newForm(opportunity.registrationType).id;
        if (action === 'duplicate-associated-form') { const duplicate = copy(content.forms.find(f => f.id === opportunity.formId)); duplicate.id = uid('form'); duplicate.name += ' Copy'; content.forms.push(duplicate); opportunity.formId = duplicate.id; }
        markDirty(); openRecord('forms',opportunity.formId,original); return;
      }
      if (editing?.collection === 'forms') {
        const form = content.forms.find(f => f.id === editing.id);
        if (action === 'add-question') form.questions.push({id:uid('question'),label:'New Question',type:'shortText',required:false,enabled:true,placeholder:'',description:'',options:[]});
        if (action === 'question-remove') form.questions.splice(Number(id),1);
        if (action === 'question-up' || action === 'question-down') { const index = Number(id); const next = index+(action === 'question-up' ? -1 : 1); if (next >= 0 && next < form.questions.length) [form.questions[index],form.questions[next]] = [form.questions[next],form.questions[index]]; }
        if (action === 'add-success-action') { form.success.actions ||= []; form.success.actions.push({label:'Contact Us',url:'/contact/'}); }
        if (action === 'remove-success-action') form.success.actions.splice(Number(id),1);
        markDirty(); renderRecord(); return;
      }
      if (action === 'section-up' || action === 'section-down') { const index = content.sections.findIndex(s => s.id === id); const next = index+(action === 'section-up' ? -1 : 1); if (index > 0 && next > 0 && next < content.sections.length) [content.sections[index],content.sections[next]] = [content.sections[next],content.sections[index]]; }
      if (action === 'import-videos') {
        message('Fetching recent SITA uploads...'); const result = await api('/api/sita/videos',{channelId:content.videoSettings.channelId,playlistId:content.videoSettings.playlistId,sourceType:content.videoSettings.sourceType});
        for (const video of result.videos) if (!content.videos.some(v => videoId(v.url) === videoId(video.url))) content.videos.push({...video,displayOrder:content.videos.length+1});
        message(`${result.videos.length} channel uploads found.`);
      }
      markDirty(); render();
    } catch (error) { message(error.message,true); }
  });
  document.querySelector('[data-record-form]').addEventListener('submit',event => { event.preventDefault(); editing = null; beforeEdit = null; dialog.close(); markDirty(); render(); message('Changes applied to your working draft.'); });
  document.querySelectorAll('[data-close-dialog]').forEach(b => b.addEventListener('click',cancelRecord));
  dialog.addEventListener('cancel',event => {event.preventDefault(); cancelRecord();});
  document.querySelector('[data-close-media]').addEventListener('click',() => mediaDialog.close());
  document.querySelector('[data-close-preview]').addEventListener('click',() => previewDialog.close());
  previewDialog.addEventListener('close',() => { document.querySelector('[data-sita-preview-frame]').src = 'about:blank'; });
  const experience = document.querySelector('#sita-experience-preview');
  experience.querySelector('[data-close-experience]').addEventListener('click',() => experience.close());
  experience.addEventListener('close',() => experience.querySelector('[data-experience-body]').replaceChildren());
  experience.addEventListener('click',event => {
    const play = event.target.closest('[data-play-video]'); if (!play) return;
    const iframe = document.createElement('iframe'); iframe.src = `https://www.youtube-nocookie.com/embed/${play.dataset.playVideo}?autoplay=1&playsinline=1`; iframe.title = play.getAttribute('aria-label'); iframe.allow = 'autoplay; encrypted-media; picture-in-picture'; iframe.allowFullscreen = true; play.replaceWith(iframe);
  });
  document.querySelector('[data-media-upload]').addEventListener('change',async event => {
    const file = event.target.files[0]; if (!file) return;
    const mediaStatus = document.querySelector('[data-media-status]'); mediaStatus.textContent = 'Uploading image...';
    try {
      if (file.size > 5*1024*1024) throw new Error('Please choose an image smaller than 5 MB.');
      const data = await new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); });
      const result = await api('/api/sita/upload',{data,name:file.name}); content.media.push(result); markDirty(); mediaLibrary(); mediaStatus.textContent = 'Image uploaded. Select it to use it on the page.';
    } catch (error) { mediaStatus.textContent = error.message; }
    event.target.value = '';
  });
  window.addEventListener('beforeunload',event => {if (dirty) event.preventDefault();});
  try {
    const response = await fetch('/api/sita/content',{cache:'no-store'});
    if (!response.ok) throw new Error('SITA content could not be loaded. Sign in again or retry shortly.');
    const result = await response.json(); online = Boolean(result.online); document.querySelector('.rc-footer').textContent = online ? 'SITA changes are saved online. Participant responses remain in the private registration backend.' : 'Publishing updates the website on this computer. Public hosting requires a separate website release.'; content = result.draft || result.published; revision = result.published.updatedAt;
    content.videoSettings = {showDate:true,showDuration:true,showDescription:false,channelNewTab:true,...content.videoSettings};
    content.opportunities.forEach(o => { o.success = successSettings(o,content.forms.find(f => f.id === o.formId)); });
    savedSnapshot = copy(content);
    publicationLabel = result.draft && JSON.stringify(result.draft) !== JSON.stringify(result.published) ? 'Draft saved' : (online ? 'Published' : 'Published locally');
    document.querySelector('[data-publication-state]').textContent = publicationLabel;
    if (result.staleDraft) message('A newer SITA version is published. This editor has loaded it; the older draft is preserved.');
    const uploads = await fetch('/api/sita/media').then(r => r.json()).catch(() => []);
    for (const item of uploads) if (!content.media.some(m => m.url === item.url)) content.media.push(item);
    render();
  } catch (error) { view.innerHTML = '<p>SITA editing is temporarily unavailable.</p>'; message(error.message,true); }
}
