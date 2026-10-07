(function () {
  const STATE_KEY = 'sitaRamAdminState';
  const SUBMISSIONS_KEY = 'sitaRamRsvpSubmissions';
  const defaults = window.SITA_RAM_DEFAULT_ADMIN_STATE;
  const questionTypes = window.SITA_RAM_QUESTION_TYPES;
  const createForm = window.SITA_RAM_CREATE_FORM;
  const form = document.getElementById('admin-form');
  const status = document.querySelector('[data-status]');
  const programEditor = document.querySelector('[data-program-editor]');
  const rsvpEditor = document.querySelector('[data-rsvp-editor]');
  const submissionsTable = document.querySelector('[data-submissions-table]');
  const initiativeEditor = document.querySelector('[data-initiative-editor]');
  const initiativeSwitcher = document.querySelector('[data-initiative-switcher]');
  let selectedInitiative = 'ram';

  const initiativeLabels = {
    ram: 'RAM',
    sita: 'SITA',
    community: 'Community Programs'
  };

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function merge(base, saved) {
    const next = clone(base);
    if (!saved || typeof saved !== 'object') return next;
    for (const key of Object.keys(saved)) {
      if (Array.isArray(saved[key])) next[key] = saved[key];
      else if (saved[key] && typeof saved[key] === 'object') next[key] = merge(next[key] || {}, saved[key]);
      else next[key] = saved[key];
    }
    return next;
  }
  function loadState() {
    try { return window.SITA_RAM_GET_ADMIN_STATE?.() || merge(defaults, JSON.parse(localStorage.getItem(STATE_KEY) || '{}')); }
    catch { return clone(defaults); }
  }
  function saveState(state) {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
    window.SITA_RAM_APPLY_ADMIN_STATE?.();
    showStatus('Saved. Refresh public pages to see updates if already open.');
  }
  function showStatus(message) {
    status.textContent = message;
    clearTimeout(showStatus.timer);
    showStatus.timer = setTimeout(() => { status.textContent = ''; }, 4500);
  }
  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }
  function escapeAttr(value = '') { return escapeHtml(value).replace(/`/g, '&#96;'); }
  function field(name) { return form.elements.namedItem(name); }
  function setField(name, value) { const item = field(name); if (item) item.value = value ?? ''; }
  function getField(name) { const item = field(name); return item ? item.value : ''; }
  function lines(value = []) { return Array.isArray(value) ? value.join('\n') : String(value || ''); }
  function parseLines(value = '') { return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean); }

  function renderPrograms(programs, forms = []) {
    const formOptions = ['<option value="">None</option>', ...forms.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`)].join('');
    programEditor.innerHTML = programs.map((program, index) => `
      <div class="row-card" data-program-row="${index}">
        <div class="grid">
          <label>Title <input data-program-field="title" value="${escapeAttr(program.title)}" /></label>
          <label>Subtitle <input data-program-field="subtitle" value="${escapeAttr(program.subtitle)}" /></label>
          <label>Link <input data-program-field="href" value="${escapeAttr(program.href)}" /></label>
          <label>Logo Path <input data-program-field="logo" value="${escapeAttr(program.logo)}" /></label>
          <label>Card Color <select data-program-field="tone">${['gold', 'rose', 'sky', 'blue'].map((tone) => `<option value="${tone}" ${program.tone === tone ? 'selected' : ''}>${tone}</option>`).join('')}</select></label>
          <label>Show on Site <select data-program-field="featured"><option value="true" ${program.featured !== false ? 'selected' : ''}>Yes</option><option value="false" ${program.featured === false ? 'selected' : ''}>No</option></select></label>
          <label>Enable Registration <select data-program-field="registrationEnabled"><option value="false" ${!program.registrationEnabled ? 'selected' : ''}>No</option><option value="true" ${program.registrationEnabled ? 'selected' : ''}>Yes</option></select></label>
          <label>Registration Method <select data-program-field="registrationMode">${['INTERNAL_INLINE_FORM', 'INTERNAL_FORM_PAGE', 'EXTERNAL_URL', 'EMAIL', 'NONE'].map((mode) => `<option value="${mode}" ${program.registrationMode === mode ? 'selected' : ''}>${mode}</option>`).join('')}</select></label>
          <label>RSVP Form <select data-program-field="rsvpFormId">${formOptions.replace(`value="${program.rsvpFormId || ''}"`, `value="${program.rsvpFormId || ''}" selected`)}</select></label>
        </div>
        <label style="margin-top: 14px;">Description <textarea data-program-field="description">${escapeHtml(program.description)}</textarea></label>
        <div class="actions"><button type="button" class="button-danger" data-remove-program="${index}">Remove Program</button></div>
      </div>
    `).join('');
  }

  function renderQuestion(question, questionIndex) {
    const optionsText = (question.options || []).join('\n');
    return `
      <div class="row-card" data-question-row="${questionIndex}">
        <div class="grid">
          <label>Label <input data-question-field="label" value="${escapeAttr(question.label)}" /></label>
          <label>Type <select data-question-field="type">${Object.entries(questionTypes).map(([key, label]) => `<option value="${key}" ${question.type === key ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
          <label>Required <select data-question-field="required"><option value="true" ${question.required ? 'selected' : ''}>Yes</option><option value="false" ${!question.required ? 'selected' : ''}>No</option></select></label>
          <label>Enabled <select data-question-field="enabled"><option value="true" ${question.enabled !== false ? 'selected' : ''}>Yes</option><option value="false" ${question.enabled === false ? 'selected' : ''}>No</option></select></label>
          <label>Placeholder <input data-question-field="placeholder" value="${escapeAttr(question.placeholder || '')}" /></label>
          <label>Help Text <input data-question-field="description" value="${escapeAttr(question.description || '')}" /></label>
        </div>
        <label style="margin-top: 12px;">Answer Options <textarea data-question-field="options" placeholder="One option per line">${escapeHtml(optionsText)}</textarea></label>
        <div class="actions">
          <button type="button" data-move-question-up="${questionIndex}">Move Up</button>
          <button type="button" data-move-question-down="${questionIndex}">Move Down</button>
          <button type="button" class="button-danger" data-remove-question="${questionIndex}">Remove Question</button>
        </div>
      </div>
    `;
  }

  function renderRsvpForms(forms) {
    rsvpEditor.innerHTML = forms.map((item, index) => `
      <div class="row-card" data-rsvp-row="${index}">
        <h4>${escapeHtml(item.name || 'RSVP Form')}</h4>
        <div class="grid">
          <label>Form Name <input data-rsvp-field="name" value="${escapeAttr(item.name)}" /></label>
          <label>Associated Initiative <input data-rsvp-field="initiative" value="${escapeAttr(item.initiative)}" /></label>
          <label>Associated Program <input data-rsvp-field="programName" value="${escapeAttr(item.programName)}" /></label>
          <label>Program / Batch Key <input data-rsvp-field="associatedProgram" value="${escapeAttr(item.associatedProgram || item.programName || '')}" /></label>
          <label>Event Name <input data-rsvp-field="eventName" value="${escapeAttr(item.eventName || '')}" /></label>
          <label>Status <select data-rsvp-field="status">${['DRAFT', 'SCHEDULED', 'OPEN', 'CLOSED', 'ARCHIVED'].map((state) => `<option value="${state}" ${item.status === state ? 'selected' : ''}>${state}</option>`).join('')}</select></label>
          <label>Featured <select data-rsvp-field="featured"><option value="false" ${!item.featured ? 'selected' : ''}>No</option><option value="true" ${item.featured ? 'selected' : ''}>Yes</option></select></label>
          <label>Show on Initiative Page <select data-rsvp-field="displayOnInitiativePage"><option value="true" ${item.displayOnInitiativePage !== false ? 'selected' : ''}>Yes</option><option value="false" ${item.displayOnInitiativePage === false ? 'selected' : ''}>No</option></select></label>
          <label>Show on Program Page <select data-rsvp-field="displayOnProgramPage"><option value="true" ${item.displayOnProgramPage !== false ? 'selected' : ''}>Yes</option><option value="false" ${item.displayOnProgramPage === false ? 'selected' : ''}>No</option></select></label>
          <label>Display Mode <select data-rsvp-field="displayMode">${['INLINE_COLLAPSIBLE', 'FULL_INLINE', 'CARD_LINK_ONLY'].map((mode) => `<option value="${mode}" ${item.displayMode === mode ? 'selected' : ''}>${mode}</option>`).join('')}</select></label>
          <label>Display Order <input type="number" data-rsvp-field="displayOrder" value="${escapeAttr(item.displayOrder ?? index + 1)}" /></label>
          <label>Registration Mode <select data-rsvp-field="registrationMode">${['INTERNAL_INLINE_FORM', 'INTERNAL_FORM_PAGE', 'EXTERNAL_URL', 'EMAIL', 'NONE'].map((mode) => `<option value="${mode}" ${item.registrationMode === mode ? 'selected' : ''}>${mode}</option>`).join('')}</select></label>
          <label>Timezone <input data-rsvp-field="timezone" value="${escapeAttr(item.timezone || 'America/Los_Angeles')}" /></label>
          <label>Registration Opens <input type="datetime-local" data-rsvp-field="opensAt" value="${escapeAttr(item.opensAt || '')}" /></label>
          <label>Registration Closes <input type="datetime-local" data-rsvp-field="closesAt" value="${escapeAttr(item.closesAt || '')}" /></label>
          <label>Intro Title <input data-rsvp-field="introTitle" value="${escapeAttr(item.introTitle || '')}" /></label>
          <label>Schedule Text <input data-rsvp-field="scheduleText" value="${escapeAttr(item.scheduleText || '')}" /></label>
          <label>Location <input data-rsvp-field="location" value="${escapeAttr(item.location || '')}" /></label>
        </div>
        <label style="margin-top: 12px;">Introduction <textarea data-rsvp-field="introText">${escapeHtml(item.introText || '')}</textarea></label>
        <h4>Questions</h4>
        <div class="repeater" data-question-editor>${(item.questions || []).map((question, qIndex) => renderQuestion(question, qIndex)).join('')}</div>
        <div class="actions"><button type="button" data-add-question="${index}">+ Add Question</button></div>
        <h4>After Registration</h4>
        <div class="grid">
          <label>Success Modal <select data-success-field="modalEnabled"><option value="true" ${item.success?.modalEnabled !== false ? 'selected' : ''}>On</option><option value="false" ${item.success?.modalEnabled === false ? 'selected' : ''}>Off</option></select></label>
          <label>Success Icon <select data-success-field="iconEnabled"><option value="true" ${item.success?.iconEnabled !== false ? 'selected' : ''}>On</option><option value="false" ${item.success?.iconEnabled === false ? 'selected' : ''}>Off</option></select></label>
          <label>Success Heading <input data-success-field="heading" value="${escapeAttr(item.success?.heading || '')}" /></label>
          <label>Next Steps Heading <input data-success-field="nextStepsHeading" value="${escapeAttr(item.success?.nextStepsHeading || '')}" /></label>
          <label>Primary Button Enabled <select data-success-field="primaryEnabled"><option value="true" ${item.success?.primaryEnabled ? 'selected' : ''}>On</option><option value="false" ${!item.success?.primaryEnabled ? 'selected' : ''}>Off</option></select></label>
          <label>Primary Button Label <input data-success-field="primaryLabel" value="${escapeAttr(item.success?.primaryLabel || '')}" /></label>
          <label>Primary Button URL <input data-success-field="primaryUrl" value="${escapeAttr(item.success?.primaryUrl || '')}" /></label>
          <label>Secondary Button Enabled <select data-success-field="secondaryEnabled"><option value="true" ${item.success?.secondaryEnabled !== false ? 'selected' : ''}>On</option><option value="false" ${item.success?.secondaryEnabled === false ? 'selected' : ''}>Off</option></select></label>
          <label>Secondary Button Label <input data-success-field="secondaryLabel" value="${escapeAttr(item.success?.secondaryLabel || '')}" /></label>
          <label>Third Button Enabled <select data-success-field="thirdEnabled"><option value="true" ${item.success?.thirdEnabled !== false ? 'selected' : ''}>On</option><option value="false" ${item.success?.thirdEnabled === false ? 'selected' : ''}>Off</option></select></label>
          <label>Third Button Label <input data-success-field="thirdLabel" value="${escapeAttr(item.success?.thirdLabel || '')}" /></label>
          <label>Third Button URL <input data-success-field="thirdUrl" value="${escapeAttr(item.success?.thirdUrl || '')}" /></label>
        </div>
        <label style="margin-top: 12px;">Success Message <textarea data-success-field="message">${escapeHtml(item.success?.message || '')}</textarea></label>
        <label style="margin-top: 12px;">Next Steps <textarea data-success-field="nextStepsText">${escapeHtml(item.success?.nextStepsText || '')}</textarea></label>
        <h4>When Registration Is Closed</h4>
        <div class="grid">
          <label>Closed Heading <input data-closed-field="heading" value="${escapeAttr(item.closed?.heading || '')}" /></label>
          <label>Closed Button Label <input data-closed-field="primaryLabel" value="${escapeAttr(item.closed?.primaryLabel || '')}" /></label>
          <label>Closed Button URL <input data-closed-field="primaryUrl" value="${escapeAttr(item.closed?.primaryUrl || '')}" /></label>
          <label>Contact Button Label <input data-closed-field="secondaryLabel" value="${escapeAttr(item.closed?.secondaryLabel || '')}" /></label>
          <label>Contact Button URL <input data-closed-field="secondaryUrl" value="${escapeAttr(item.closed?.secondaryUrl || '')}" /></label>
        </div>
        <label style="margin-top: 12px;">Closed Message <textarea data-closed-field="message">${escapeHtml(item.closed?.message || '')}</textarea></label>
        <div class="actions">
          <button type="button" data-duplicate-rsvp="${index}">Duplicate</button>
          <button type="button" data-preview-rsvp="${index}">Preview Success</button>
          <button type="button" data-open-rsvp="${index}">Open Registration</button>
          <button type="button" data-close-rsvp="${index}">Close Registration</button>
          <button type="button" class="button-danger" data-remove-rsvp="${index}">Remove</button>
        </div>
      </div>
    `).join('');
  }

  function renderInitiativeSwitcher() {
    if (!initiativeSwitcher) return;
    initiativeSwitcher.innerHTML = Object.entries(initiativeLabels).map(([key, label]) => `<button type="button" data-select-initiative="${key}" class="${selectedInitiative === key ? 'button-gold' : ''}">${label}</button>`).join('');
  }

  function initiativeForms(forms, key) {
    const label = initiativeLabels[key] || key;
    return (forms || [])
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => (item.initiative || '').toLowerCase().includes(label.toLowerCase().split(' ')[0]) || key === 'community' && (item.initiative || '').toLowerCase().includes('community'))
      .sort((a, b) => Number(a.item.displayOrder || 50) - Number(b.item.displayOrder || 50));
  }

  function renderInitiativeForms(forms, key) {
    const rows = initiativeForms(forms, key);
    if (!rows.length) return '<p class="helper">No RSVP forms connected to this initiative yet.</p>';
    return `<div class="repeater">${rows.map(({ item, index }) => `
      <div class="row-card">
        <strong>${escapeHtml(item.name || 'RSVP Form')}</strong>
        <p class="helper">${escapeHtml(item.programName || '')} · ${escapeHtml(item.status || 'DRAFT')} · ${escapeHtml(item.displayMode || 'INLINE_COLLAPSIBLE')}</p>
        <div class="actions">
          <button type="button" data-initiative-duplicate-rsvp="${index}">Duplicate</button>
          <button type="button" data-initiative-open-rsvp="${index}">Launch</button>
          <button type="button" data-initiative-close-rsvp="${index}">Close</button>
          <button type="button" data-initiative-archive-rsvp="${index}">Archive</button>
          <button type="button" data-initiative-form-up="${index}">Move Up</button>
          <button type="button" data-initiative-form-down="${index}">Move Down</button>
        </div>
      </div>
    `).join('')}</div>`;
  }

  function renderInitiatives(state) {
    if (!initiativeEditor) return;
    renderInitiativeSwitcher();
    if (selectedInitiative === 'sita') {
      initiativeEditor.innerHTML = '<div class="card"><h3>SITA Page Control Center</h3><a class="button button-primary" href="/admin/sita/">Open SITA Page Control Center</a></div>'; return;
    }
    if (selectedInitiative === 'ram') {
      initiativeEditor.innerHTML = '<div class="card"><h3>RAM Page Control Center</h3><p class="helper">Manage RAM page content, programs, opportunities, forms, videos and articles.</p><a class="button button-primary" href="/admin/ram/">Open RAM Page Control Center</a></div>';
      return;
    }
    const item = state.initiatives?.[selectedInitiative] || {};
    initiativeEditor.innerHTML = `
      <div class="card" data-initiative-row="${selectedInitiative}">
        <h3>${escapeHtml(initiativeLabels[selectedInitiative])} Control Center</h3>
        <p class="helper">Tabs covered here: Overview, Page Content, Programs, Registrations/RSVP, Videos, Articles, Events, Testimonials, SEO and Page Settings.</p>
        <div class="grid">
          <label>Name <input data-initiative-field="name" value="${escapeAttr(item.name || '')}" /></label>
          <label>Short Name <input data-initiative-field="shortName" value="${escapeAttr(item.shortName || '')}" /></label>
          <label>Tagline <input data-initiative-field="tagline" value="${escapeAttr(item.tagline || '')}" /></label>
          <label>Eyebrow <input data-initiative-field="eyebrow" value="${escapeAttr(item.eyebrow || '')}" /></label>
          <label>Logo Path <input data-initiative-field="logo" value="${escapeAttr(item.logo || '')}" /></label>
          <label>Hero Title <input data-initiative-field="heroTitle" value="${escapeAttr(item.heroTitle || '')}" /></label>
        </div>
        <label style="margin-top: 12px;">Hero Intro <textarea data-initiative-field="heroIntro">${escapeHtml(item.heroIntro || '')}</textarea></label>
        <label style="margin-top: 12px;">Description <textarea data-initiative-field="description">${escapeHtml(item.description || '')}</textarea></label>
        <div class="grid" style="margin-top: 12px;">
          <label>Mission <textarea data-initiative-field="mission">${escapeHtml(item.mission || '')}</textarea></label>
          <label>Vision <textarea data-initiative-field="vision">${escapeHtml(item.vision || '')}</textarea></label>
          <label>Core Areas <textarea data-initiative-field="coreAreas">${escapeHtml(lines(item.coreAreas))}</textarea></label>
          <label>Signature Programs <textarea data-initiative-field="signaturePrograms">${escapeHtml(lines(item.signaturePrograms))}</textarea></label>
          <label>Audiences <textarea data-initiative-field="audiences">${escapeHtml(lines(item.audiences))}</textarea></label>
          <label>Distinct Points <textarea data-initiative-field="uniquePoints">${escapeHtml(lines(item.uniquePoints))}</textarea></label>
          <label>Videos <textarea data-initiative-field="videos">${escapeHtml(lines(item.videos))}</textarea></label>
          <label>Articles <textarea data-initiative-field="articles">${escapeHtml(lines(item.articles))}</textarea></label>
          <label>Events <textarea data-initiative-field="events">${escapeHtml(lines(item.events))}</textarea></label>
          <label>Testimonials <textarea data-initiative-field="testimonials">${escapeHtml(lines(item.testimonials))}</textarea></label>
          <label>SEO Title <input data-initiative-field="seoTitle" value="${escapeAttr(item.seoTitle || '')}" /></label>
          <label>SEO Description <input data-initiative-field="seoDescription" value="${escapeAttr(item.seoDescription || '')}" /></label>
          <label>Section Order <textarea data-initiative-field="sections">${escapeHtml(lines(item.sections))}</textarea></label>
          <label>Visible Sections <textarea data-initiative-field="visibleSections">${escapeHtml(lines(item.visibleSections))}</textarea></label>
        </div>
        ${selectedInitiative === 'sita' ? `<div class="grid" style="margin-top: 12px;"><label>Session Journey / Why It Matters <textarea data-initiative-field="whyItMatters">${escapeHtml(lines(item.whyItMatters))}</textarea></label><label>Session Modules <textarea data-initiative-field="accessModules">${escapeHtml((item.accessModules || []).map((module) => `${module.name} | ${module.access}`).join('\n'))}</textarea></label></div>` : ''}
      </div>
      <div class="card">
        <h3>${escapeHtml(initiativeLabels[selectedInitiative])} Registrations / RSVP</h3>
        <p class="helper">Create multiple future batches for this initiative. Launched forms appear automatically on the public initiative page.</p>
        ${renderInitiativeForms(state.rsvp.forms || [], selectedInitiative)}
        <div class="actions">
          <button type="button" class="button-gold" data-add-initiative-rsvp="${selectedInitiative}">Create RSVP Form for ${escapeHtml(initiativeLabels[selectedInitiative])}</button>
        </div>
      </div>
    `;
  }

  function readInitiatives(existing = {}) {
    const next = clone(existing || {});
    document.querySelectorAll('[data-initiative-row]').forEach((row) => {
      const key = row.dataset.initiativeRow;
      const get = (name) => row.querySelector(`[data-initiative-field="${name}"]`)?.value || '';
      next[key] = {
        ...(next[key] || {}),
        name: get('name'),
        shortName: get('shortName'),
        tagline: get('tagline'),
        eyebrow: get('eyebrow'),
        logo: get('logo'),
        heroTitle: get('heroTitle'),
        heroIntro: get('heroIntro'),
        description: get('description'),
        mission: get('mission'),
        vision: get('vision'),
        coreAreas: parseLines(get('coreAreas')),
        signaturePrograms: parseLines(get('signaturePrograms')),
        audiences: parseLines(get('audiences')),
        uniquePoints: parseLines(get('uniquePoints')),
        videos: parseLines(get('videos')),
        articles: parseLines(get('articles')),
        events: parseLines(get('events')),
        testimonials: parseLines(get('testimonials')),
        seoTitle: get('seoTitle'),
        seoDescription: get('seoDescription'),
        sections: parseLines(get('sections')),
        visibleSections: parseLines(get('visibleSections'))
      };
      if (key === 'sita') {
        next[key].whyItMatters = parseLines(get('whyItMatters'));
        next[key].accessModules = parseLines(get('accessModules')).map((line) => {
          const [name, access = 'PUBLIC'] = line.split('|').map((part) => part.trim());
          return { name, access };
        }).filter((module) => module.name);
      }
    });
    return next;
  }

  function readQuestionRows(row) {
    return Array.from(row.querySelectorAll('[data-question-row]')).map((qRow, index) => {
      const get = (name) => qRow.querySelector(`[data-question-field="${name}"]`)?.value || '';
      return {
        id: `q-${index + 1}-${get('label').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        label: get('label'),
        type: get('type'),
        required: get('required') === 'true',
        enabled: get('enabled') === 'true',
        placeholder: get('placeholder'),
        description: get('description'),
        options: get('options').split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
      };
    });
  }

  function readRsvpForms() {
    return Array.from(document.querySelectorAll('[data-rsvp-row]')).map((row) => {
      const get = (name) => row.querySelector(`[data-rsvp-field="${name}"]`)?.value || '';
      const success = (name) => row.querySelector(`[data-success-field="${name}"]`)?.value || '';
      const closed = (name) => row.querySelector(`[data-closed-field="${name}"]`)?.value || '';
      const existing = loadState().rsvp.forms[Number(row.dataset.rsvpRow)] || {};
      return {
        ...existing,
        name: get('name'),
        initiative: get('initiative'),
        programName: get('programName'),
        associatedProgram: get('associatedProgram'),
        eventName: get('eventName'),
        status: get('status'),
        featured: get('featured') === 'true',
        displayOnInitiativePage: get('displayOnInitiativePage') === 'true',
        displayOnProgramPage: get('displayOnProgramPage') === 'true',
        displayMode: get('displayMode') || 'INLINE_COLLAPSIBLE',
        displayOrder: Number(get('displayOrder') || 50),
        registrationMode: get('registrationMode'),
        timezone: get('timezone'),
        opensAt: get('opensAt'),
        closesAt: get('closesAt'),
        introTitle: get('introTitle'),
        introText: get('introText'),
        scheduleText: get('scheduleText'),
        location: get('location'),
        questions: readQuestionRows(row),
        success: {
          ...existing.success,
          modalEnabled: success('modalEnabled') === 'true',
          iconEnabled: success('iconEnabled') === 'true',
          heading: success('heading'),
          message: success('message'),
          nextStepsHeading: success('nextStepsHeading'),
          nextStepsText: success('nextStepsText'),
          primaryEnabled: success('primaryEnabled') === 'true',
          primaryLabel: success('primaryLabel'),
          primaryUrl: success('primaryUrl'),
          secondaryEnabled: success('secondaryEnabled') === 'true',
          secondaryLabel: success('secondaryLabel'),
          thirdEnabled: success('thirdEnabled') === 'true',
          thirdLabel: success('thirdLabel'),
          thirdUrl: success('thirdUrl')
        },
        closed: {
          heading: closed('heading'),
          message: closed('message'),
          primaryLabel: closed('primaryLabel'),
          primaryUrl: closed('primaryUrl'),
          secondaryLabel: closed('secondaryLabel'),
          secondaryUrl: closed('secondaryUrl')
        }
      };
    });
  }

  function readPrograms() {
    return Array.from(document.querySelectorAll('[data-program-row]')).map((row) => {
      const get = (name) => row.querySelector(`[data-program-field="${name}"]`)?.value || '';
      return { title: get('title'), subtitle: get('subtitle'), description: get('description'), href: get('href'), logo: get('logo'), tone: get('tone'), featured: get('featured') === 'true', registrationEnabled: get('registrationEnabled') === 'true', registrationMode: get('registrationMode'), rsvpFormId: get('rsvpFormId') };
    });
  }

  function populate() {
    const state = loadState();
    setField('site.organizationName', state.site.organizationName);
    setField('site.organizationShortName', state.site.organizationShortName);
    setField('site.brandTitle', state.site.brandTitle);
    setField('site.tagline', state.site.tagline);
    setField('site.mainWebsiteUrl', state.site.mainWebsiteUrl);
    setField('site.donationUrl', state.site.donationUrl);
    setField('site.contactEmail', state.site.contactEmail);
    setField('home.eyebrow', state.home.eyebrow);
    setField('home.headline', state.home.headline);
    setField('home.description', state.home.description);
    setField('home.primaryCtaLabel', state.home.primaryCtaLabel);
    setField('home.primaryCtaHref', state.home.primaryCtaHref);
    setField('home.secondaryCtaLabel', state.home.secondaryCtaLabel);
    setField('home.secondaryCtaHref', state.home.secondaryCtaHref);
    setField('rsvp.enabled', String(Boolean(state.rsvp.enabled)));
    setField('rsvp.intro', state.rsvp.intro);
    setField('rsvp.adapter', state.rsvp.adapter || 'local');
    setField('rsvp.endpoint', state.rsvp.endpoint || '');
    renderPrograms(state.programs || [], state.rsvp.forms || []);
    renderRsvpForms(state.rsvp.forms || []);
    renderInitiatives(state);
    renderSubmissions();
  }

  function collectState() {
    const existing = loadState();
    return {
      site: { organizationName: getField('site.organizationName'), organizationShortName: getField('site.organizationShortName'), brandTitle: getField('site.brandTitle'), tagline: getField('site.tagline'), mainWebsiteUrl: getField('site.mainWebsiteUrl'), donationUrl: getField('site.donationUrl'), contactEmail: getField('site.contactEmail') },
      home: { eyebrow: getField('home.eyebrow'), headline: getField('home.headline'), description: getField('home.description'), primaryCtaLabel: getField('home.primaryCtaLabel'), primaryCtaHref: getField('home.primaryCtaHref'), secondaryCtaLabel: getField('home.secondaryCtaLabel'), secondaryCtaHref: getField('home.secondaryCtaHref') },
      programs: readPrograms(),
      initiatives: readInitiatives(existing.initiatives),
      rsvp: { enabled: getField('rsvp.enabled') === 'true', intro: getField('rsvp.intro'), adapter: getField('rsvp.adapter'), endpoint: getField('rsvp.endpoint'), forms: readRsvpForms() }
    };
  }

  function renderSubmissions() {
    const submissions = JSON.parse(localStorage.getItem(SUBMISSIONS_KEY) || '[]');
    if (!submissions.length) { submissionsTable.innerHTML = '<p class="helper">No registrations yet.</p>'; return; }
    submissionsTable.innerHTML = `<table><thead><tr><th>Date</th><th>Form</th><th>Program</th><th>Initiative</th><th>Responses</th></tr></thead><tbody>${submissions.map((entry) => `<tr><td>${escapeHtml(new Date(entry.submittedAt).toLocaleString())}</td><td>${escapeHtml(entry.formName || '')}</td><td>${escapeHtml(entry.programName || '')}</td><td>${escapeHtml(entry.initiative || '')}</td><td>${escapeHtml(JSON.stringify(entry.responses || {}))}</td></tr>`).join('')}</tbody></table>`;
  }

  function exportCsv() {
    const submissions = JSON.parse(localStorage.getItem(SUBMISSIONS_KEY) || '[]');
    const rows = submissions.map((entry) => ({ submittedAt: entry.submittedAt, submissionId: entry.submissionId, formId: entry.formId, formName: entry.formName, programName: entry.programName, initiative: entry.initiative, ...(entry.responses || {}) }));
    const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const csv = [headers.join(','), ...rows.map((row) => headers.map((key) => `"${String(row[key] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sita-ram-rsvp-registrations.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-tab]').forEach((item) => item.setAttribute('aria-selected', String(item === button)));
      document.querySelectorAll('[data-panel]').forEach((panel) => { panel.dataset.active = String(panel.dataset.panel === button.dataset.tab); });
      if (button.dataset.tab === 'submissions') renderSubmissions();
    });
  });

  document.addEventListener('click', (event) => {
    const state = collectState();
    const selectInitiative = event.target.closest('[data-select-initiative]');
    if (selectInitiative) {
      selectedInitiative = selectInitiative.dataset.selectInitiative;
      renderInitiatives(state);
      return;
    }
    const addInitiativeRsvp = event.target.closest('[data-add-initiative-rsvp]');
    if (addInitiativeRsvp) {
      const key = addInitiativeRsvp.dataset.addInitiativeRsvp;
      const templateKey = key === 'community' ? 'community' : key;
      const nextForm = createForm(templateKey);
      nextForm.initiative = initiativeLabels[key];
      nextForm.programName = key === 'sita' ? 'Vedic Garbh Vigyan' : `${initiativeLabels[key]} Program`;
      nextForm.associatedProgram = nextForm.programName;
      nextForm.name = `${nextForm.programName} - New Batch`;
      nextForm.displayOnInitiativePage = true;
      nextForm.displayOnProgramPage = true;
      nextForm.displayMode = 'INLINE_COLLAPSIBLE';
      nextForm.displayOrder = (state.rsvp.forms || []).length + 1;
      state.rsvp.forms.push(nextForm);
      renderRsvpForms(state.rsvp.forms);
      renderPrograms(state.programs, state.rsvp.forms);
      renderInitiatives(state);
      return;
    }
    const initiativeDuplicate = event.target.closest('[data-initiative-duplicate-rsvp]');
    if (initiativeDuplicate) {
      const copy = clone(state.rsvp.forms[Number(initiativeDuplicate.dataset.initiativeDuplicateRsvp)]);
      copy.id = `form-${Date.now()}`;
      copy.name = `${copy.name} Copy`;
      copy.status = 'DRAFT';
      copy.displayOrder = (state.rsvp.forms || []).length + 1;
      state.rsvp.forms.push(copy);
      renderRsvpForms(state.rsvp.forms);
      renderPrograms(state.programs, state.rsvp.forms);
      renderInitiatives(state);
      return;
    }
    const initiativeOpen = event.target.closest('[data-initiative-open-rsvp]');
    if (initiativeOpen) {
      state.rsvp.forms[Number(initiativeOpen.dataset.initiativeOpenRsvp)].status = 'OPEN';
      renderRsvpForms(state.rsvp.forms);
      renderInitiatives(state);
      return;
    }
    const initiativeClose = event.target.closest('[data-initiative-close-rsvp]');
    if (initiativeClose) {
      state.rsvp.forms[Number(initiativeClose.dataset.initiativeCloseRsvp)].status = 'CLOSED';
      renderRsvpForms(state.rsvp.forms);
      renderInitiatives(state);
      return;
    }
    const initiativeArchive = event.target.closest('[data-initiative-archive-rsvp]');
    if (initiativeArchive) {
      state.rsvp.forms[Number(initiativeArchive.dataset.initiativeArchiveRsvp)].status = 'ARCHIVED';
      renderRsvpForms(state.rsvp.forms);
      renderInitiatives(state);
      return;
    }
    const initiativeUp = event.target.closest('[data-initiative-form-up]');
    if (initiativeUp) {
      const form = state.rsvp.forms[Number(initiativeUp.dataset.initiativeFormUp)];
      form.displayOrder = Number(form.displayOrder || 50) - 1;
      renderRsvpForms(state.rsvp.forms);
      renderInitiatives(state);
      return;
    }
    const initiativeDown = event.target.closest('[data-initiative-form-down]');
    if (initiativeDown) {
      const form = state.rsvp.forms[Number(initiativeDown.dataset.initiativeFormDown)];
      form.displayOrder = Number(form.displayOrder || 50) + 1;
      renderRsvpForms(state.rsvp.forms);
      renderInitiatives(state);
      return;
    }
    const addProgram = event.target.closest('[data-add-program]');
    if (addProgram) { state.programs.push({ title: 'New Program', subtitle: 'Program subtitle', description: 'Program description.', href: '/programs', logo: '/logos/gopal-logo.png', tone: 'gold', featured: true, registrationEnabled: false, registrationMode: 'INTERNAL_INLINE_FORM', rsvpFormId: '' }); renderPrograms(state.programs, state.rsvp.forms); }
    const templateButton = event.target.closest('[data-template]');
    if (templateButton) { state.rsvp.forms.push(createForm(templateButton.dataset.template)); renderRsvpForms(state.rsvp.forms); renderPrograms(state.programs, state.rsvp.forms); }
    const addRsvp = event.target.closest('[data-add-rsvp]');
    if (addRsvp) { state.rsvp.forms.push(createForm('basic')); renderRsvpForms(state.rsvp.forms); renderPrograms(state.programs, state.rsvp.forms); }
    const removeProgram = event.target.closest('[data-remove-program]');
    if (removeProgram) { state.programs.splice(Number(removeProgram.dataset.removeProgram), 1); renderPrograms(state.programs, state.rsvp.forms); }
    const removeRsvp = event.target.closest('[data-remove-rsvp]');
    if (removeRsvp) { state.rsvp.forms.splice(Number(removeRsvp.dataset.removeRsvp), 1); renderRsvpForms(state.rsvp.forms); renderPrograms(state.programs, state.rsvp.forms); }
    const duplicate = event.target.closest('[data-duplicate-rsvp]');
    if (duplicate) { const copy = clone(state.rsvp.forms[Number(duplicate.dataset.duplicateRsvp)]); copy.id = `form-${Date.now()}`; copy.name = `${copy.name} Copy`; copy.status = 'DRAFT'; state.rsvp.forms.push(copy); renderRsvpForms(state.rsvp.forms); renderPrograms(state.programs, state.rsvp.forms); }
    const open = event.target.closest('[data-open-rsvp]');
    if (open) { state.rsvp.forms[Number(open.dataset.openRsvp)].status = 'OPEN'; renderRsvpForms(state.rsvp.forms); }
    const close = event.target.closest('[data-close-rsvp]');
    if (close) { state.rsvp.forms[Number(close.dataset.closeRsvp)].status = 'CLOSED'; renderRsvpForms(state.rsvp.forms); }
    const addQuestion = event.target.closest('[data-add-question]');
    if (addQuestion) { state.rsvp.forms[Number(addQuestion.dataset.addQuestion)].questions.push({ id: `q-${Date.now()}`, type: 'shortText', label: 'New Question', required: false, enabled: true, options: [] }); renderRsvpForms(state.rsvp.forms); }
    const removeQuestion = event.target.closest('[data-remove-question]');
    if (removeQuestion) { const row = removeQuestion.closest('[data-rsvp-row]'); state.rsvp.forms[Number(row.dataset.rsvpRow)].questions.splice(Number(removeQuestion.dataset.removeQuestion), 1); renderRsvpForms(state.rsvp.forms); }
    const up = event.target.closest('[data-move-question-up]');
    if (up) { const row = up.closest('[data-rsvp-row]'); const questions = state.rsvp.forms[Number(row.dataset.rsvpRow)].questions; const i = Number(up.dataset.moveQuestionUp); if (i > 0) [questions[i - 1], questions[i]] = [questions[i], questions[i - 1]]; renderRsvpForms(state.rsvp.forms); }
    const down = event.target.closest('[data-move-question-down]');
    if (down) { const row = down.closest('[data-rsvp-row]'); const questions = state.rsvp.forms[Number(row.dataset.rsvpRow)].questions; const i = Number(down.dataset.moveQuestionDown); if (i < questions.length - 1) [questions[i + 1], questions[i]] = [questions[i], questions[i + 1]]; renderRsvpForms(state.rsvp.forms); }
  });

  form.addEventListener('submit', (event) => { event.preventDefault(); saveState(collectState()); populate(); });
  document.querySelector('[data-reset-defaults]')?.addEventListener('click', () => { if (!confirm('Reset all admin changes in this browser?')) return; localStorage.removeItem(STATE_KEY); populate(); window.SITA_RAM_APPLY_ADMIN_STATE?.(); showStatus('Admin data reset.'); });
  document.querySelector('[data-export-csv]')?.addEventListener('click', exportCsv);
  document.querySelector('[data-clear-submissions]')?.addEventListener('click', () => { if (!confirm('Clear all local RSVP entries?')) return; localStorage.removeItem(SUBMISSIONS_KEY); renderSubmissions(); showStatus('Registration entries cleared.'); });

  populate();
})();
