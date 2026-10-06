import { createIcons, BookOpen, Sprout, Users, HeartHandshake, HandHeart, Heart, Mail, CalendarDays, MapPin, Play, X, CircleCheck } from 'lucide';
import { escape as e, safeUrl, publicOpportunities, opportunityType, videoId } from './model.mjs';
import { renderPage, renderSelectedForm, renderSuccess, opportunityCard, programCard, articleCard } from './render.mjs';
import { confirmedSubmission } from './submission.mjs';
import { mountPublicTestimonials } from '../testimonials/public.mjs';
const icons = { BookOpen, Sprout, Users, HeartHandshake, HandHeart, Heart, Mail, CalendarDays, MapPin, Play, X, CircleCheck };
export const refreshIcons = () => createIcons({ icons });

async function loadContent(preview) {
  if (preview) {
    const response = await fetch('/api/sita/content', { cache:'no-store' });
    if (!response.ok) throw new Error('Draft preview is available while the local editor is running.');
    const data = await response.json();
    return data.draft || data.published;
  }
  const response = await fetch('/content/sita.json', { cache:'no-store' });
  if (!response.ok) throw new Error('Unable to load SITA content.');
  return response.json();
}
export async function initSitaPage() {
  const root = document.querySelector('[data-sita-root]');
  if (!root) return;
  const navigation = document.querySelector('.site-header .nav');
  if (navigation) navigation.id = 'primary-menu';
  document.querySelector('.site-header')?.addEventListener('keydown',event => {
    if (event.key === 'Escape') {
      const header = document.querySelector('.site-header');
      header.dataset.open = 'false';
      const toggle = header.querySelector('.mobile-toggle');
      toggle?.setAttribute('aria-expanded','false'); toggle?.focus();
    }
  });
  const query = new URLSearchParams(location.search);
  const preview = query.get('preview') === 'draft';
  let content;
  try { content = await loadContent(preview); }
  catch (error) { if (preview) root.insertAdjacentHTML('afterbegin', `<p class="sita-preview-notice" role="alert">${e(error.message)}</p>`); refreshIcons(); return; }
  root.innerHTML = renderPage(content);
  if (preview) root.insertAdjacentHTML('afterbegin','<div class="sita-preview-notice">SITA draft preview <a href="/admin/sita/">Return to Control Center</a></div>');
  mountPublicTestimonials(root.querySelector('[data-testimonials-host]'),'SITA',content.programs);
  applySeo(content.seo);
  refreshIcons();
  let selectedId = '';
  let submitting = false;
  const host = root.querySelector('[data-selected-opportunity]');
  const filters = { type:'', category:'', audience:'', search:'' };
  function filterOpportunities() {
    const opportunities = publicOpportunities(content).filter(o => {
      const program = content.programs.find(p => p.id === o.programId);
      return (!filters.type || opportunityType(o) === filters.type) && (!filters.category || program.category === filters.category) && (!filters.audience || o.audience === filters.audience) && (!filters.search || `${o.name} ${o.description} ${program.title}`.toLowerCase().includes(filters.search.toLowerCase()));
    });
    root.querySelector('[data-opportunity-list]').innerHTML = opportunities.map(o => opportunityCard(o,content)).join('');
    root.querySelector('[data-opportunity-count]').textContent = `${opportunities.length} ${opportunities.length === 1 ? 'opportunity' : 'opportunities'}`;
    root.querySelector('[data-opportunity-empty]').hidden = opportunities.length > 0;
    if (!opportunities.some(o => o.id === selectedId)) { host.hidden = true; host.innerHTML = ''; selectedId = ''; }
    refreshIcons();
  }
  root.addEventListener('input', event => {
    const filter = event.target.closest('[data-opportunity-filter]');
    if (filter && !submitting) { filters[filter.dataset.opportunityFilter] = filter.value; filterOpportunities(); }
    const group = event.target.closest('[data-required-group="true"]');
    if (group) group.querySelector('input')?.setCustomValidity('');
  });
  const scrollTo = node => { node.focus({preventScroll:true}); node.scrollIntoView({ behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start' }); };
  function selectOpportunity(id) {
    if (submitting || !host) return;
    const opportunity = content.opportunities.find(o => o.id === id);
    if (!opportunity || (!preview && !publicOpportunities(content).some(o => o.id === id))) return;
    selectedId = id;
    host.innerHTML = renderSelectedForm(opportunity,content,preview);
    host.hidden = false;
    refreshIcons(); scrollTo(host);
  }
  function playVideo(id,title) {
    document.querySelectorAll('iframe[src*="youtube-nocookie.com"]').forEach(frame=>frame.remove());
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1`;
    iframe.title = `Play ${title}`;
    iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true; iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    root.querySelector('[data-video-player]').replaceChildren(iframe);
  }
  root.addEventListener('click', event => {
    const select = event.target.closest('[data-select-opportunity]');
    if (select) selectOpportunity(select.dataset.selectOpportunity);
    if (event.target.closest('[data-close-form]') && !submitting) { host.hidden = true; host.innerHTML = ''; root.querySelector(`[data-select-opportunity="${selectedId}"]`)?.focus(); selectedId = ''; }
    const switchVideo = event.target.closest('[data-switch-video]');
    if (switchVideo) {
      const video = content.videos.find(v => v.id === switchVideo.dataset.switchVideo);
      if (!video?.enabled || !videoId(video.url)) return;
      playVideo(videoId(video.url),video.title);
      root.querySelector('[data-video-title]').textContent = video.title;
      root.querySelector('[data-video-description]').textContent = String(video.description || '').slice(0,320);
      root.querySelectorAll('[data-switch-video]').forEach(row => row.setAttribute('aria-pressed',String(row === switchVideo)));
    }
    const play = event.target.closest('[data-play-video]');
    if (play) {
      playVideo(play.dataset.playVideo,root.querySelector('[data-video-title]')?.textContent || 'SITA video');
    }
  });
  root.addEventListener('submit', async event => {
    const element = event.target.closest('[data-sita-registration]');
    if (!element) return;
    event.preventDefault();
    if (preview || submitting) return;
    for (const group of element.querySelectorAll('[data-required-group="true"]')) group.querySelector('input')?.setCustomValidity(group.querySelector('input:checked') ? '' : 'Please select at least one option.');
    if (!element.reportValidity()) return;
    const opportunity = content.opportunities.find(o => o.id === element.dataset.sitaRegistration);
    const status = element.querySelector('[data-submission-status]');
    if (!opportunityType(opportunity)) { status.textContent = 'This opportunity is no longer open.'; return; }
    const definition = content.forms.find(f => f.id === opportunity.formId);
    const data = new FormData(element);
    const responses = Object.fromEntries(definition.questions.filter(q => q.enabled).map(q => [q.id, data.getAll(q.id).join('; ')]));
    const submissionId = element.dataset.submissionId || crypto.randomUUID();
    element.dataset.submissionId = submissionId;
    const payload = { submissionId, submittedAt:new Date().toISOString(), opportunityId:opportunity.id, opportunityName:opportunity.name, registrationType:opportunity.registrationType, formId:definition.id, formName:definition.name, programId:opportunity.programId, programName:content.programs.find(p => p.id === opportunity.programId).title, initiative:'SITA', responses };
    const global = window.SITA_RAM_GET_ADMIN_STATE?.();
    const settings = {adapter:'privateProxy',endpoint:'/api/sita/registrations/submit'};
    const button = element.querySelector('[type="submit"]');
    submitting = true; button.disabled = true; button.textContent = 'Submitting...'; status.textContent = '';
    root.querySelectorAll('[data-opportunity-filter]').forEach(control => {control.disabled = true;});
    try {
      await confirmedSubmission(settings,payload);
      host.innerHTML = '<p role="status">Your submission has been received.</p>';
      const popup = document.createElement('dialog'); popup.className = 'sita-success-dialog';
      popup.innerHTML = renderSuccess(opportunity,definition,content.programs.find(p => p.id === opportunity.programId),global?.site.contactEmail || 'info@sitaram.gloryofpeaceandlove.org');
      root.append(popup); popup.querySelector('[data-close-form]')?.addEventListener('click',() => popup.close());
      popup.addEventListener('close',() => { popup.remove(); host.focus(); },{once:true});
      refreshIcons(); popup.showModal();
    } catch { status.textContent = 'We could not confirm your submission. Please try again.'; }
    finally { submitting = false; root.querySelectorAll('[data-opportunity-filter]').forEach(control => {control.disabled = false;}); if (button.isConnected) { button.disabled = false; button.textContent = definition.submitLabel; } }
  });
  if (query.get('opportunity')) selectOpportunity(query.get('opportunity'));
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}
function applySeo(seo) {
  document.title = seo.title;
  const setMeta = (selector,value) => document.querySelector(selector)?.setAttribute('content',value);
  setMeta('meta[name="description"]',seo.description);
  setMeta('meta[property="og:title"]',seo.socialTitle || seo.title);
  setMeta('meta[property="og:description"]',seo.socialDescription || seo.description);
  document.querySelector('link[rel="canonical"]')?.setAttribute('href',safeUrl(seo.canonical));
}
export async function initSitaDetail(kind) {
  const root = document.querySelector('[data-sita-detail]');
  const preview = new URLSearchParams(location.search).get('preview') === 'draft';
  const content = await loadContent(preview).catch(() => null);
  if (!content || !root) return;
  const query = new URLSearchParams(location.search);
  const records = kind === 'program' ? content.programs.filter(p => p.active || preview) : content.articles.filter(a => a.published || preview);
  const record = records.find(r => r.slug === (query.get('slug') || root.dataset.sitaRecordSlug));
  if (!record) { root.innerHTML = '<h1>Page unavailable</h1><p>This page is not currently published.</p><a href="/sita/">Return to SITA</a>'; return; }
  root.innerHTML = `<a class="sita-text-link" href="/sita/">Back to SITA</a><h1>${e(record.title)}</h1><img src="${e(safeUrl(record.image))}" alt="${e(record.imageAlt)}"><p>${e(record.fullDescription || record.body)}</p>${kind === 'program' ? '<a class="button button--primary" href="/sita/#opportunities">Find Open Opportunities</a>' : ''}`;
  applySeo({ title:record.seoTitle || record.title, description:record.seoDescription || record.shortDescription || record.excerpt, canonical:`https://programs.gloryofpeaceandlove.org/sita/${kind === 'program' ? 'programs' : 'articles'}/${encodeURIComponent(record.slug)}/` });
}
export async function initSitaList(kind) {
  const content = await loadContent(false).catch(() => null);
  const root = document.querySelector('[data-sita-list]');
  if (content && root) root.innerHTML = kind === 'programs' ? content.programs.filter(p => p.active).map(programCard).join('') : content.articles.filter(a => a.published).map(articleCard).join('');
}
