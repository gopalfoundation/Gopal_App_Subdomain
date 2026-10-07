(function () {
  const STATE_KEY = 'sitaRamAdminState';
  const SUBMISSIONS_KEY = 'sitaRamRsvpSubmissions';

  const questionTypes = {
    shortText: 'Short Text',
    longText: 'Long Text',
    email: 'Email',
    phone: 'Phone',
    number: 'Number',
    date: 'Date',
    dropdown: 'Dropdown',
    singleChoice: 'Single Choice',
    multipleChoice: 'Multiple Choice',
    yesNo: 'Yes / No',
    checkbox: 'Checkbox',
    consent: 'Consent',
    info: 'Information Text',
    heading: 'Section Heading'
  };

  const defaultQuestions = [
    { id: 'email', type: 'email', label: 'Email', required: true, enabled: true, placeholder: 'you@example.com' },
    { id: 'name', type: 'shortText', label: 'First and Last Name', required: true, enabled: true },
    { id: 'cityState', type: 'shortText', label: 'City / State', required: true, enabled: true },
    { id: 'phone', type: 'phone', label: 'Phone Number', required: true, enabled: true },
    {
      id: 'goals',
      type: 'multipleChoice',
      label: 'What are your primary goals?',
      required: false,
      enabled: true,
      options: ['Stress reduction', 'Emotional wellbeing', 'Spiritual connection', 'Diet & lifestyle guidance', 'Other']
    },
    {
      id: 'hindiUnderstanding',
      type: 'singleChoice',
      label: 'Do you understand Hindi?',
      required: false,
      enabled: true,
      options: ['Speak / Understand', 'Understand', 'Can Manage', 'Cannot Understand']
    },
    { id: 'questions', type: 'longText', label: 'Any questions for us?', required: false, enabled: true },
    {
      id: 'consent',
      type: 'consent',
      label: 'I understand how my information will be used for program registration and communication.',
      required: true,
      enabled: true
    }
  ];

  const templates = {
    basic: { name: 'Basic RSVP', initiative: 'Community Programs', programName: 'General Program', questions: defaultQuestions },
    ram: { name: 'RAM Program Registration', initiative: 'RAM', programName: 'RAM Program', questions: defaultQuestions },
    sita: {
      name: 'SITA Program Registration',
      initiative: 'SITA',
      programName: 'SITA Program',
      questions: [
        ...defaultQuestions.slice(0, 4),
        { id: 'pregnancyDuration', type: 'shortText', label: 'How many months pregnant?', required: false, enabled: true },
        ...defaultQuestions.slice(4)
      ]
    },
    community: { name: 'Community Program Registration', initiative: 'Community Programs', programName: 'Community Program', questions: defaultQuestions },
    workshop: { name: 'Workshop Registration', initiative: 'SITA RAM', programName: 'Workshop', questions: defaultQuestions },
    online: { name: 'Online Class Registration', initiative: 'SITA RAM', programName: 'Online Class', questions: defaultQuestions }
  };

  function createForm(templateKey = 'basic') {
    const template = templates[templateKey] || templates.basic;
    return {
      id: `form-${Date.now()}`,
      name: `${template.name} - New Batch`,
      initiative: template.initiative,
      programName: template.programName,
      associatedProgram: template.programName,
      eventName: '',
      status: 'DRAFT',
      featured: false,
      displayOnInitiativePage: true,
      displayOnProgramPage: true,
      displayMode: 'INLINE_COLLAPSIBLE',
      displayOrder: 50,
      registrationMode: 'INTERNAL_INLINE_FORM',
      showOnStandalonePage: true,
      showInlineOnProgramPage: true,
      opensAt: '',
      closesAt: '',
      timezone: 'America/Los_Angeles',
      introTitle: `Register for ${template.programName}`,
      introText: 'Please complete the form below to register for this program.',
      scheduleText: 'Schedule to be announced.',
      location: 'Online',
      questions: clone(template.questions),
      success: {
        modalEnabled: true,
        iconEnabled: true,
        heading: 'Registration Received!',
        message: `Thank you for registering for ${template.programName}.`,
        nextStepsHeading: 'What Happens Next?',
        nextStepsText: 'Please save the program details and follow the instructions below for participant communication.',
        primaryEnabled: false,
        primaryLabel: 'Join Participant Group',
        primaryUrl: '',
        primaryNewTab: true,
        secondaryEnabled: true,
        secondaryLabel: 'Add to Calendar',
        secondaryAction: 'ADD_TO_CALENDAR',
        thirdEnabled: true,
        thirdLabel: 'Explore More Programs',
        thirdUrl: '/programs',
        showAddToCalendar: true,
        showContactInformation: true,
        showProgramSchedule: true,
        showRelatedPrograms: true,
        showCloseButton: true
      },
      closed: {
        heading: 'Registration Closed',
        message: 'Registration for this batch has now closed. Thank you for your interest.',
        primaryLabel: 'See Upcoming Programs',
        primaryUrl: '/programs',
        secondaryLabel: 'Contact Us',
        secondaryUrl: '/contact'
      }
    };
  }

  const sitaVedicForm = {
    ...createForm('sita'),
    id: 'sita-vedic-garbh-vigyan-oct-2026',
    name: 'Vedic Garbh Vigyan - Prenatal Care Registration',
    initiative: 'SITA',
    programName: 'Vedic Garbh Vigyan',
    associatedProgram: 'Vedic Garbh Vigyan',
    status: 'OPEN',
    featured: true,
    displayOrder: 1,
    introTitle: 'Register for Vedic Garbh Vigyan',
    introText: 'A SITA program for expectant mothers and families, centered on Garbh Sanskar, spiritual practices, mindful living and family support.',
    scheduleText: 'Upcoming batch details will be shared after registration.',
    location: 'Online / Community Session',
    questions: [
      { id: 'email', type: 'email', label: 'Email', required: true, enabled: true, placeholder: 'you@example.com' },
      { id: 'name', type: 'shortText', label: 'First and Last Name', required: true, enabled: true },
      { id: 'cityState', type: 'shortText', label: 'City / State', required: true, enabled: true },
      { id: 'pregnancyDuration', type: 'shortText', label: 'Pregnancy Duration', required: false, enabled: true, placeholder: 'Example: 5 months' },
      {
        id: 'primaryGoals',
        type: 'multipleChoice',
        label: 'Primary Goals',
        required: false,
        enabled: true,
        options: ['Spiritual practices', 'Yoga and meditation', 'Nutrition guidance', 'Positive thinking', 'Music and art', 'Family support']
      },
      { id: 'howDidYouHear', type: 'shortText', label: 'How did you hear about this program?', required: false, enabled: true },
      {
        id: 'hindiUnderstanding',
        type: 'singleChoice',
        label: 'Hindi Understanding',
        required: false,
        enabled: true,
        options: ['Speak / Understand', 'Understand', 'Can Manage', 'Cannot Understand']
      },
      { id: 'specificQuestions', type: 'longText', label: 'Specific Questions', required: false, enabled: true },
      {
        id: 'commitment',
        type: 'singleChoice',
        label: 'Participation Commitment',
        required: true,
        enabled: true,
        options: ['I plan to attend regularly', 'I need schedule details first', 'I am registering interest only']
      },
      { id: 'phone', type: 'phone', label: 'Phone Number', required: true, enabled: true },
      {
        id: 'consent',
        type: 'consent',
        label: 'I understand this program provides educational and spiritual support, not medical advice, and I consent to be contacted about program details.',
        required: true,
        enabled: true
      }
    ],
    success: {
      modalEnabled: true,
      iconEnabled: true,
      heading: 'Registration Received!',
      message: 'Thank you for registering for Vedic Garbh Vigyan.',
      nextStepsHeading: 'Next Steps',
      nextStepsText: 'Our team will review your registration, share batch timing and send participation guidance before the program begins.',
      primaryEnabled: false,
      primaryLabel: 'Join Participant Group',
      primaryUrl: '',
      primaryNewTab: true,
      secondaryEnabled: true,
      secondaryLabel: 'Add to Calendar',
      thirdEnabled: true,
      thirdLabel: 'Explore SITA',
      thirdUrl: '/sita',
      showProgramSchedule: true,
      showCloseButton: true
    }
  };

  const initiativeDefaults = {
    ram: {
      key: 'ram',
      name: 'Ritambhar Academy of Mind (RAM)',
      shortName: 'RAM',
      tagline: 'Empowering Minds. Guiding Lives.',
      eyebrow: 'Ritambhar Academy of Mind',
      logo: '/logos/ram-logo.png',
      heroTitle: 'Ritambhar Academy of Mind',
      heroIntro: 'RAM empowers minds through clarity, character, consciousness and practical values for daily living.',
      description: 'A transformative learning initiative rooted in Vedic knowledge, human values and applied personal growth.',
      mission: 'To help individuals cultivate emotional balance, communication, leadership and inner freedom through value-based learning.',
      vision: 'A society where clarity of mind, strength of character and compassionate action guide everyday life.',
      uniquePoints: ['Mind and emotional well-being', 'Personal growth and leadership', 'Relationships and society'],
      coreAreas: ['Mind & Emotional Well-being', 'Personal Growth & Leadership', 'Relationships & Society'],
      signaturePrograms: ['Gita learning series', 'Youth and adult development', 'Community and youth empowerment'],
      audiences: ['Youth', 'Adults', 'Families', 'Community facilitators'],
      videos: [],
      articles: [],
      events: [],
      testimonials: [],
      seoTitle: 'RAM | Ritambhar Academy of Mind',
      seoDescription: 'RAM programs for mind training, character development, communication, leadership and value-based living.',
      sections: ['overview', 'programs', 'registrations', 'videos', 'articles', 'events', 'testimonials'],
      visibleSections: ['overview', 'programs', 'registrations']
    },
    sita: {
      key: 'sita',
      name: 'Sanskar Initiator Training Academy',
      shortName: 'SITA',
      tagline: 'Nurturing values from the beginning.',
      eyebrow: 'Sanskar Initiator Training Academy',
      logo: '/logos/sita-logo.png',
      heroTitle: 'SITA',
      heroIntro: 'SITA supports individuals, expectant mothers and families through Sanskar, parenting, wellbeing and value-based life skills.',
      description: 'A family-centered initiative with Vedic Garbh Sanskar as a featured program area.',
      mission: 'To support families with spiritual practices, mindful habits, positive thinking and value-based guidance.',
      vision: 'Homes and communities where children are welcomed into an atmosphere of peace, wisdom and care.',
      uniquePoints: ['Spiritual practices', 'Yoga and meditation', 'Nutritional guidance', 'Music and art', 'Positive thinking'],
      coreAreas: ['Kirtan Dhun', 'Garbh Samvad', 'Dhyan', 'Prarthana', 'Relaxing Kirtan'],
      signaturePrograms: ['Vedic Garbh Vigyan', 'Parenting and Sanskar programs', 'Family wellbeing sessions'],
      audiences: ['Expectant mothers', 'Parents', 'Families', 'Sanskar facilitators'],
      accessModules: [
        { name: 'Kirtan Dhun', access: 'PUBLIC' },
        { name: 'Garbh Samvad', access: 'REGISTERED_PARTICIPANTS' },
        { name: 'Dhyan', access: 'PUBLIC' },
        { name: 'Prarthana', access: 'PUBLIC' },
        { name: 'Relaxing Kirtan', access: 'REGISTERED_PARTICIPANTS' }
      ],
      whyItMatters: ['Builds a peaceful family rhythm', 'Encourages mindful communication', 'Supports spiritual and emotional preparation'],
      videos: [],
      articles: [],
      events: [],
      testimonials: [],
      seoTitle: 'SITA | Sanskar Initiator Training Academy',
      seoDescription: 'SITA programs for Garbh Sanskar, family wellbeing, parenting and value-based life skills.',
      sections: ['overview', 'programs', 'registrations', 'videos', 'articles', 'events', 'testimonials'],
      visibleSections: ['overview', 'programs', 'registrations']
    },
    community: {
      key: 'community',
      name: 'Community Programs',
      shortName: 'Community Programs',
      tagline: 'Values and service in action.',
      eyebrow: 'Values and Service',
      logo: '/logos/bhaktisurabh-logo.jpg',
      heroTitle: 'Community Programs',
      heroIntro: 'Community Programs bring educational, spiritual, cultural, youth and family initiatives together through service and shared values.',
      description: 'A growing home for gatherings, youth programs, family programs, volunteer opportunities and community service.',
      mission: 'To create accessible programs that strengthen families, serve communities and nurture values in practical ways.',
      vision: 'A more harmonious community shaped by learning, devotion, culture and service.',
      uniquePoints: ['Educational and cultural gatherings', 'Youth and family programs', 'Volunteer and service opportunities'],
      coreAreas: ['Education', 'Culture', 'Service'],
      signaturePrograms: ['Community orientation', 'Family gatherings', 'Volunteer programs'],
      audiences: ['Individuals', 'Families', 'Youth', 'Volunteers'],
      videos: [],
      articles: [],
      events: [],
      testimonials: [],
      seoTitle: 'Community Programs | SITA RAM Initiatives',
      seoDescription: 'Community programs rooted in values, service, education, family wellbeing and spiritual learning.',
      sections: ['overview', 'programs', 'registrations', 'videos', 'articles', 'events', 'testimonials'],
      visibleSections: ['overview', 'programs', 'registrations']
    }
  };

  const defaults = {
    site: {
      organizationName: 'Glory of Peace and Love',
      organizationShortName: 'GOPAL Foundation',
      brandTitle: 'SITA RAM',
      tagline: 'Values, learning and service for a brighter tomorrow.',
      mainWebsiteUrl: 'https://gloryofpeaceandlove.org',
      donationUrl: 'https://gloryofpeaceandlove.org',
      contactEmail: 'info@sitaram.gloryofpeaceandlove.org'
    },
    home: {
      eyebrow: 'VALUES • LEARNING • SERVICE • A BRIGHTER TOMORROW',
      headline: 'Nurturing Values for a Kinder World',
      description: 'SITA RAM represents value-based initiatives of Glory of Peace and Love (GOPAL Foundation), focused on personal growth, family wellbeing, character development, education and community service.',
      primaryCtaLabel: 'Explore Programs',
      primaryCtaHref: '/programs',
      secondaryCtaLabel: 'About the Foundation',
      secondaryCtaHref: '/about'
    },
    programs: [
      { title: 'RAM', subtitle: 'Ritambhar Academy of Mind', description: 'Character development, mind training, leadership, life skills and value-based learning.', href: '/ram', logo: '/logos/ram-logo.png', tone: 'gold', featured: true, registrationEnabled: false, registrationMode: 'INTERNAL_INLINE_FORM', rsvpFormId: '' },
      { title: 'SITA', subtitle: 'Sanskar Initiator Training Academy', description: 'Supporting individuals and families through Sanskar, parenting, wellbeing, training and value-based life skills.', href: '/sita', logo: '/logos/sita-logo.png', tone: 'rose', featured: true, registrationEnabled: false, registrationMode: 'INTERNAL_INLINE_FORM', rsvpFormId: '' },
      { title: 'Community Programs', subtitle: 'Programs rooted in values and service', description: 'Educational, spiritual, youth, family, cultural and community programs rooted in values and service.', href: '/community-programs', logo: '/logos/bhaktisurabh-logo.jpg', tone: 'sky', featured: true, registrationEnabled: false, registrationMode: 'INTERNAL_INLINE_FORM', rsvpFormId: '' }
    ],
    initiatives: initiativeDefaults,
    rsvp: {
      enabled: true,
      intro: 'Register interest for upcoming SITA RAM programs.',
      adapter: 'local',
      endpoint: '',
      forms: [sitaVedicForm]
    }
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

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

  function normalizeState(state) {
    const next = merge(defaults, state);
    next.rsvp = next.rsvp || clone(defaults.rsvp);
    next.rsvp.forms = Array.isArray(next.rsvp.forms) ? next.rsvp.forms : [];
    if (!next.rsvp.forms.length) next.rsvp.forms = clone(defaults.rsvp.forms);
    next.rsvp.forms = next.rsvp.forms.map((form, index) => ({
      ...createForm('basic'),
      ...form,
      associatedProgram: form.associatedProgram || form.programName || '',
      eventName: form.eventName || '',
      featured: Boolean(form.featured),
      displayOnInitiativePage: form.displayOnInitiativePage !== false,
      displayOnProgramPage: form.displayOnProgramPage !== false,
      displayMode: form.displayMode || 'INLINE_COLLAPSIBLE',
      displayOrder: Number.isFinite(Number(form.displayOrder)) ? Number(form.displayOrder) : index + 1,
      showInlineOnProgramPage: form.showInlineOnProgramPage !== false
    }));
    next.initiatives = merge(initiativeDefaults, next.initiatives || {});
    return next;
  }

  function getState() {
    try {
      return normalizeState(JSON.parse(localStorage.getItem(STATE_KEY) || '{}'));
    } catch {
      return clone(defaults);
    }
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function slug(value = '') {
    return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function setText(key, value) {
    document.querySelectorAll(`[data-admin-text="${key}"]`).forEach((node) => { node.textContent = value; });
  }

  function setHref(key, value) {
    document.querySelectorAll(`[data-admin-href="${key}"]`).forEach((node) => { node.setAttribute('href', value); });
  }

  function renderProgramCard(program) {
    const href = program.registrationEnabled && program.registrationMode !== 'EXTERNAL_URL' ? '/rsvp/' : (program.href || '/programs/');
    return `<a class="initiative-card" data-tone="${program.tone || 'gold'}" href="${href}"><img src="${program.logo || '/logos/gopal-logo.png'}" alt="${escapeHtml(program.title || 'Program')} logo" loading="lazy" width="160" height="160" /><span><h3>${escapeHtml(program.title || 'Program')}</h3><p><strong>${escapeHtml(program.subtitle || '')}</strong></p><p>${escapeHtml(program.description || '')}</p></span></a>`;
  }

  function renderContentCard(program) {
    const href = program.registrationEnabled && program.registrationMode !== 'EXTERNAL_URL' ? '/rsvp/' : (program.href || '/programs/');
    return `<a class="content-card" href="${href}"><h3>${escapeHtml(program.title || 'Program')}</h3><p>${escapeHtml(program.description || '')}</p></a>`;
  }

  function isFormOpen(form) {
    if (!form || form.status !== 'OPEN') return false;
    const now = Date.now();
    if (form.opensAt && new Date(form.opensAt).getTime() > now) return false;
    if (form.closesAt && new Date(form.closesAt).getTime() < now) return false;
    return true;
  }

  function visibleForms(state) {
    return (state.rsvp.forms || []).filter((form) => ['OPEN', 'SCHEDULED', 'CLOSED'].includes(form.status));
  }

  function openForms(state) {
    return visibleForms(state).filter(isFormOpen);
  }

  function findProgramForm(state, programTitle, programId) {
    const normalizedTitle = slug(programTitle);
    const normalizedId = slug(programId);
    const connectedProgram = (state.programs || []).find((program) => slug(program.title) === normalizedTitle || slug(program.href).replace(/^\//, '') === normalizedId);
    if (connectedProgram?.rsvpFormId) {
      const byId = (state.rsvp.forms || []).find((form) => form.id === connectedProgram.rsvpFormId);
      if (byId) return byId;
    }
    return (state.rsvp.forms || []).find((form) => slug(form.programName) === normalizedTitle || slug(form.programName) === normalizedId);
  }

  function initiativeKey(value = '') {
    const normalized = slug(value);
    if (normalized.includes('ram') && !normalized.includes('sita')) return 'ram';
    if (normalized.includes('sita')) return 'sita';
    if (normalized.includes('community') || normalized.includes('bhaktisaurabh')) return 'community';
    return normalized;
  }

  function formMatchesPage(form, page) {
    const pageKey = initiativeKey(page.dataset.programId || page.dataset.programTitle || '');
    const formKey = initiativeKey(form.initiative || '');
    const programSlug = slug(form.programName || form.associatedProgram || '');
    const titleSlug = slug(page.dataset.programTitle || '');
    const idSlug = slug(page.dataset.programId || '');
    return formKey === pageKey || programSlug === titleSlug || programSlug === idSlug;
  }

  function pageForms(state, page) {
    return visibleForms(state)
      .filter((form) => form.registrationMode !== 'EXTERNAL_URL' && form.registrationMode !== 'NONE')
      .filter((form) => form.displayOnInitiativePage !== false || form.displayOnProgramPage !== false)
      .filter((form) => formMatchesPage(form, page))
      .sort((a, b) => Number(a.displayOrder || 50) - Number(b.displayOrder || 50));
  }

  function questionName(question) {
    return question.id || slug(question.label);
  }

  function renderQuestion(question) {
    if (!question.enabled) return '';
    const name = questionName(question);
    const required = question.required ? 'required' : '';
    const req = question.required ? '<span class="rsvp-required">*</span>' : '';
    const help = question.description ? `<span class="rsvp-help">${escapeHtml(question.description)}</span>` : '';
    const options = (question.options || []).filter(Boolean);
    if (question.type === 'heading') return `<h3>${escapeHtml(question.label)}</h3>`;
    if (question.type === 'info') return `<div class="rsvp-info">${escapeHtml(question.label)}</div>`;
    if (question.type === 'longText') return `<label>${escapeHtml(question.label)} ${req}${help}<textarea name="${name}" rows="4" placeholder="${escapeHtml(question.placeholder || '')}" ${required}></textarea></label>`;
    if (question.type === 'dropdown') return `<label>${escapeHtml(question.label)} ${req}${help}<select name="${name}" ${required}>${options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join('')}</select></label>`;
    if (question.type === 'singleChoice' || question.type === 'yesNo') {
      const values = question.type === 'yesNo' ? ['Yes', 'No'] : options;
      return `<div class="rsvp-question"><strong>${escapeHtml(question.label)} ${req}</strong>${help}<div class="rsvp-options">${values.map((option) => `<label><input type="radio" name="${name}" value="${escapeHtml(option)}" ${required} /> ${escapeHtml(option)}</label>`).join('')}</div></div>`;
    }
    if (question.type === 'multipleChoice') return `<div class="rsvp-question"><strong>${escapeHtml(question.label)} ${req}</strong>${help}<div class="rsvp-options">${options.map((option) => `<label><input type="checkbox" name="${name}" value="${escapeHtml(option)}" /> ${escapeHtml(option)}</label>`).join('')}</div></div>`;
    if (question.type === 'checkbox' || question.type === 'consent') return `<div class="rsvp-options"><label><input type="checkbox" name="${name}" value="Yes" ${required} /> ${escapeHtml(question.label)} ${req}</label>${help}</div>`;
    const inputType = { email: 'email', phone: 'tel', number: 'number', date: 'date' }[question.type] || 'text';
    return `<label>${escapeHtml(question.label)} ${req}${help}<input type="${inputType}" name="${name}" placeholder="${escapeHtml(question.placeholder || '')}" ${required} /></label>`;
  }

  function renderRsvpForm(form, options = {}) {
    const closed = !isFormOpen(form);
    if (closed) {
      return `<div class="closed-message"><h2>${escapeHtml(form.closed?.heading || 'Registration Closed')}</h2><p>${escapeHtml(form.closed?.message || 'Registration for this batch has now closed.')}</p><div class="actions"><a class="button button--primary" href="${form.closed?.primaryUrl || '/programs'}">${escapeHtml(form.closed?.primaryLabel || 'See Upcoming Programs')}</a><a class="button" href="${form.closed?.secondaryUrl || '/contact'}">${escapeHtml(form.closed?.secondaryLabel || 'Contact Us')}</a></div></div>`;
    }
    return `<div class="rsvp-inline"><h2>${escapeHtml(form.introTitle || `Register for ${form.programName}`)}</h2><p class="lede">${escapeHtml(form.introText || '')}</p>${form.success?.showProgramSchedule && form.scheduleText ? `<p class="rsvp-info">${escapeHtml(form.scheduleText)}</p>` : ''}<form class="rsvp-form" data-managed-rsvp-form data-form-id="${form.id}" data-preview="${options.preview ? 'true' : 'false'}">${(form.questions || []).map(renderQuestion).join('')}<button class="button button--primary" type="submit">Register Now</button><p data-rsvp-status></p></form></div>`;
  }

  function statusLabel(form) {
    if (isFormOpen(form)) return 'Open';
    if (form.status === 'SCHEDULED') return 'Scheduled';
    if (form.status === 'CLOSED') return 'Closed';
    return form.status || 'Draft';
  }

  function renderRegistrationCards(forms) {
    if (!forms.length) return '<p class="lede">No registration forms are currently active for this initiative.</p>';
    return `<div class="registration-card-grid">${forms.map((form) => {
      const open = isFormOpen(form);
      const body = open ? renderRsvpForm(form) : renderRsvpForm(form);
      return `<article class="registration-card" data-featured="${form.featured ? 'true' : 'false'}">
        <div class="registration-card__meta">
          <span>${escapeHtml(form.initiative || 'SITA RAM')}</span>
          <strong>${escapeHtml(statusLabel(form))}</strong>
        </div>
        <h3>${escapeHtml(form.name || form.programName || 'Registration')}</h3>
        <p>${escapeHtml(form.introText || 'Registration details are available below.')}</p>
        ${form.scheduleText ? `<p class="registration-card__schedule">${escapeHtml(form.scheduleText)}</p>` : ''}
        <details class="registration-card__details" ${form.displayMode === 'FULL_INLINE' ? 'open' : ''}>
          <summary>${open ? 'Open Registration Form' : 'View Details'}</summary>
          ${body}
        </details>
      </article>`;
    }).join('')}</div>`;
  }

  function renderList(title, items = []) {
    const clean = (items || []).filter(Boolean);
    if (!clean.length) return '';
    return `<div><h3>${escapeHtml(title)}</h3><ul>${clean.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>`;
  }

  function renderInitiativeContent(initiative) {
    if (!initiative) return '';
    const blocks = [
      `<div><h2>${escapeHtml(initiative.name || '')}</h2><p class="lede">${escapeHtml(initiative.description || '')}</p></div>`,
      `<div class="content-grid">${initiative.mission ? `<article class="content-card"><h3>Mission</h3><p>${escapeHtml(initiative.mission)}</p></article>` : ''}${initiative.vision ? `<article class="content-card"><h3>Vision</h3><p>${escapeHtml(initiative.vision)}</p></article>` : ''}${initiative.tagline ? `<article class="content-card"><h3>Focus</h3><p>${escapeHtml(initiative.tagline)}</p></article>` : ''}</div>`,
      `<div class="initiative-detail-grid">${renderList('Core Areas', initiative.coreAreas)}${renderList('Signature Programs', initiative.signaturePrograms)}${renderList('For', initiative.audiences)}${renderList('What Makes It Distinct', initiative.uniquePoints)}${renderList('Why It Matters', initiative.whyItMatters)}</div>`
    ];
    if (initiative.accessModules?.length) {
      blocks.push(`<div><h3>Session Modules</h3><div class="module-list">${initiative.accessModules.map((module) => `<span>${escapeHtml(module.name)} <strong>${escapeHtml(module.access)}</strong></span>`).join('')}</div></div>`);
    }
    return blocks.join('');
  }

  function setupInitiativePage(state) {
    const page = document.querySelector('[data-program-page]');
    if (!page) return;
    const key = initiativeKey(page.dataset.programId || page.dataset.programTitle || '');
    const initiative = state.initiatives?.[key];
    if (!initiative) return;
    document.querySelectorAll('[data-initiative-logo]').forEach((node) => {
      node.setAttribute('src', initiative.logo || node.getAttribute('src'));
      node.setAttribute('alt', `${initiative.shortName || initiative.name} logo`);
    });
    setText('initiativeEyebrow', initiative.eyebrow || '');
    setText('initiativeTitle', initiative.heroTitle || initiative.name || '');
    setText('initiativeIntro', initiative.heroIntro || initiative.description || '');
    document.querySelectorAll('[data-initiative-content]').forEach((node) => { node.innerHTML = renderInitiativeContent(initiative); });
    document.querySelectorAll('[data-initiative-registrations]').forEach((node) => { node.innerHTML = renderRegistrationCards(pageForms(state, page)); });
  }

  function setupStandaloneRsvp(state) {
    const root = document.querySelector('[data-standalone-rsvp]');
    if (!root) return;
    const forms = openForms(state).filter((form) => form.showOnStandalonePage !== false);
    if (!state.rsvp.enabled || !forms.length) {
      root.innerHTML = '<h2>Registration</h2><p class="lede">No RSVP form is currently active. Please check back later or contact the organization.</p>';
      return;
    }
    root.innerHTML = `<h2>Registration Form</h2><p class="lede">${escapeHtml(state.rsvp.intro || '')}</p><label class="rsvp-form">Choose Program<select data-standalone-form-picker>${forms.map((form) => `<option value="${form.id}">${escapeHtml(form.name)}</option>`).join('')}</select></label><div data-standalone-form-host>${renderRsvpForm(forms[0])}</div>`;
    root.querySelector('[data-standalone-form-picker]')?.addEventListener('change', (event) => {
      const selected = forms.find((form) => form.id === event.target.value) || forms[0];
      root.querySelector('[data-standalone-form-host]').innerHTML = renderRsvpForm(selected);
    });
  }

  function setupInlineRsvp(state) {
    const page = document.querySelector('[data-program-page]');
    const host = document.querySelector('[data-inline-rsvp]');
    const section = document.querySelector('[data-inline-rsvp-section]');
    if (!page || !host || !section) return;
    if (document.querySelector('[data-initiative-registrations]')) {
      section.hidden = true;
      return;
    }
    const forms = pageForms(state, page);
    if (!forms.length) {
      const form = findProgramForm(state, page.dataset.programTitle, page.dataset.programId);
      if (!form || form.showInlineOnProgramPage === false || form.registrationMode === 'EXTERNAL_URL' || form.registrationMode === 'NONE') {
        section.hidden = true;
        return;
      }
      section.hidden = false;
      host.innerHTML = renderRegistrationCards([form]);
      return;
    }
    const visible = forms.filter((form) => form.displayOnProgramPage !== false || form.displayOnInitiativePage !== false);
    if (!visible.length) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    host.innerHTML = renderRegistrationCards(visible);
  }

  function bindRegistrationCards() {
    document.querySelectorAll('.registration-card__details summary').forEach((summary) => {
      if (summary.dataset.bound === 'true') return;
      summary.dataset.bound = 'true';
      summary.addEventListener('click', (event) => {
        event.preventDefault();
        const details = summary.closest('details');
        if (details) details.open = !details.open;
      });
    });
  }

  function buildCalendarUrl(form) {
    const text = encodeURIComponent(form.programName || form.name);
    const details = encodeURIComponent(form.scheduleText || form.introText || '');
    const location = encodeURIComponent(form.location || '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&location=${location}`;
  }

  async function submitRegistration(formElement, state) {
    const formId = formElement.dataset.formId;
    const form = (state.rsvp.forms || []).find((item) => item.id === formId);
    const status = formElement.querySelector('[data-rsvp-status]');
    const button = formElement.querySelector('button[type="submit"]');
    if (!form || !formElement.reportValidity()) return;
    if (formElement.dataset.preview === 'true') {
      showSuccessModal(form, { preview: true });
      return;
    }
    button.disabled = true;
    button.textContent = 'Submitting Registration...';
    status.textContent = '';
    try {
      const payload = collectFormPayload(formElement, form);
      await sendSubmission(state, payload);
      showSuccessModal(form, payload);
      formElement.reset();
    } catch (error) {
      status.textContent = error.message || 'Submission failed. Please try again.';
    } finally {
      button.disabled = false;
      button.textContent = 'Register Now';
    }
  }

  function collectFormPayload(formElement, form) {
    const data = {};
    const formData = new FormData(formElement);
    for (const question of form.questions || []) {
      const name = questionName(question);
      const values = formData.getAll(name);
      if (values.length > 1) data[name] = values.join('; ');
      else data[name] = values[0] || '';
    }
    return { submittedAt: new Date().toISOString(), submissionId: `sub-${Date.now()}`, formId: form.id, formName: form.name, programName: form.programName, initiative: form.initiative, responses: data };
  }

  async function sendSubmission(state, payload) {
    if (!/^\/api\/(ram|sita)\/registrations\/submit$/.test(state.rsvp.endpoint || '') || !payload.opportunityId) {
      throw new Error('This form is not accepting submissions. Please choose an open opportunity on the RAM or SITA page.');
    }
    const response = await fetch(state.rsvp.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const receipt = await response.json().catch(() => null);
    if (!response.ok || receipt?.success !== true || receipt.submissionId !== payload.submissionId) throw new Error('The registration backend did not confirm the submission. Please retry.');
  }

  function showSuccessModal(form) {
    if (form.success?.modalEnabled === false) return;
    const modal = document.createElement('div');
    modal.className = 'rsvp-modal';
    modal.dataset.open = 'true';
    const calendarUrl = buildCalendarUrl(form);
    modal.innerHTML = `<div class="rsvp-modal__content" role="dialog" aria-modal="true" aria-labelledby="rsvp-success-heading">${form.success?.iconEnabled === false ? '' : '<div class="rsvp-modal__icon">✓</div>'}<h2 id="rsvp-success-heading">${escapeHtml(form.success?.heading || 'Registration Received!')}</h2><p>${escapeHtml(form.success?.message || `Thank you for registering for ${form.programName}.`)}</p><h3>${escapeHtml(form.success?.nextStepsHeading || 'What Happens Next?')}</h3><p>${escapeHtml(form.success?.nextStepsText || '')}</p><div class="rsvp-modal__actions">${form.success?.primaryEnabled && form.success?.primaryUrl ? `<a class="button button--primary" href="${form.success.primaryUrl}" ${form.success.primaryNewTab ? 'target="_blank" rel="noreferrer"' : ''}>${escapeHtml(form.success.primaryLabel || 'Join Participant Group')}</a>` : ''}${form.success?.secondaryEnabled ? `<a class="button" href="${calendarUrl}" target="_blank" rel="noreferrer">${escapeHtml(form.success.secondaryLabel || 'Add to Calendar')}</a>` : ''}${form.success?.thirdEnabled ? `<a class="button" href="${form.success.thirdUrl || '/programs'}">${escapeHtml(form.success.thirdLabel || 'Explore More Programs')}</a>` : ''}${form.success?.showCloseButton === false ? '' : '<button class="button" type="button" data-close-modal>Close</button>'}</div></div>`;
    modal.addEventListener('click', (event) => {
      if (event.target === modal || event.target.closest('[data-close-modal]')) modal.remove();
    });
    document.body.append(modal);
  }

  function applyState() {
    const state = getState();
    setText('topbarLabel', `Programs by ${state.site.organizationName} (${state.site.organizationShortName})`);
    setText('brandTitle', state.site.brandTitle);
    setText('tagline', state.site.tagline);
    setText('heroEyebrow', state.home.eyebrow);
    setText('heroHeadline', state.home.headline);
    setText('heroDescription', state.home.description);
    setText('primaryCtaLabel', state.home.primaryCtaLabel);
    setText('secondaryCtaLabel', state.home.secondaryCtaLabel);
    setHref('mainWebsiteUrl', state.site.mainWebsiteUrl);
    setHref('donationUrl', state.site.donationUrl);
    setHref('primaryCtaHref', state.home.primaryCtaHref);
    setHref('secondaryCtaHref', state.home.secondaryCtaHref);
    document.querySelectorAll('[data-admin-email]').forEach((node) => { node.textContent = state.site.contactEmail; node.setAttribute('href', `mailto:${state.site.contactEmail}`); });
    document.querySelectorAll('[data-admin-footer]').forEach((node) => { node.textContent = `© ${new Date().getFullYear()} ${state.site.organizationName}. SITA RAM Initiatives is a program identity of ${state.site.organizationShortName}.`; });
    const featuredPrograms = (state.programs || []).filter((program) => program.featured !== false);
    document.querySelectorAll('[data-dynamic-initiatives]').forEach((node) => { node.innerHTML = featuredPrograms.map(renderProgramCard).join(''); });
    document.querySelectorAll('[data-dynamic-programs]').forEach((node) => { node.innerHTML = featuredPrograms.map(renderContentCard).join(''); });
    setupInitiativePage(state);
    setupStandaloneRsvp(state);
    setupInlineRsvp(state);
    bindRegistrationCards();
    document.querySelectorAll('[data-managed-rsvp-form]').forEach((formElement) => {
      if (formElement.dataset.bound === 'true') return;
      formElement.dataset.bound = 'true';
      formElement.addEventListener('submit', (event) => {
        event.preventDefault();
        submitRegistration(formElement, getState());
      });
    });
  }

  window.SITA_RAM_DEFAULT_ADMIN_STATE = defaults;
  window.SITA_RAM_QUESTION_TYPES = questionTypes;
  window.SITA_RAM_FORM_TEMPLATES = templates;
  window.SITA_RAM_CREATE_FORM = createForm;
  window.SITA_RAM_GET_ADMIN_STATE = getState;
  window.SITA_RAM_APPLY_ADMIN_STATE = applyState;
  window.SITA_RAM_SUBMISSIONS_KEY = SUBMISSIONS_KEY;
  document.addEventListener('DOMContentLoaded', applyState);
})();
