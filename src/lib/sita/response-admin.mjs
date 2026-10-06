import { createIcons, Eye, Download, RefreshCw, LogOut, ArrowLeft, Save, Activity } from 'lucide';
import { escape as e, safeUrl, TYPES, RESPONSE_STATUSES } from './model.mjs';
import { answerValue, filterResponses, responseCsv, responseColumns } from './responses.mjs';

export function initResponseAdmin(root,content,opportunityId = '') {
  let alive = true, authenticated = false, backendConfigured = false, totals = null, records = [], sheetUrl = '', detail = null, busy = false, loaded = false;
  const filters = {programId:'',opportunityId,registrationType:'',search:'',status:'',sort:'newest',from:'',to:''};
  const abort = new AbortController();
  const status = text => { if (alive) root.querySelector('[data-response-message]').textContent = text; };
  const date = value => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString() : value;
  const typeName = type => ({OPEN_REGISTRATION:'Registration',OPEN_WAITLIST:'Waitlist',FUTURE_INTEREST:'Future Interest'}[type] || type);
  const button = (label,action,icon,id = '') => `<button type="button" data-response-action="${action}" data-id="${e(id)}"><i data-lucide="${icon}" aria-hidden="true"></i>${e(label)}</button>`;
  const select = (label,key,choices,all) => `<label class="rc-field">${label}<select data-response-filter="${key}">${all ? `<option value="">${all}</option>` : ''}${choices.map(([value,name]) => `<option value="${e(value)}" ${filters[key] === value ? 'selected' : ''}>${e(name)}</option>`).join('')}</select></label>`;
  const icons = () => createIcons({icons:{Eye,Download,RefreshCw,LogOut,ArrowLeft,Save,Activity}});
  async function api(action,data) {
    const result = await fetch('/api/sita/registrations/'+action,{cache:'no-store',signal:abort.signal,...(data ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)} : {})});
    const body = await result.json();
    if (!alive) throw new Error('Closed');
    if (result.status === 401) { authenticated = false; records = []; totals = null; detail = null; loaded = false; render(); }
    if (!result.ok) throw new Error(body.error || 'Unable to load registration responses.');
    return body;
  }
  function table() {
    const rows = filterResponses(records,filters);
    const form = content.forms.find(f => f.id === content.opportunities.find(o => o.id === filters.opportunityId)?.formId);
    const extra = filters.opportunityId ? responseColumns(rows,form).filter(q => !/name|email|phone|tel|city|state/i.test(q.id+' '+q.label)) : [];
    const headings = ['Submitted','Name','Email','Phone','City / State','Opportunity','Response Type','Status',...extra.map(q=>q.label),'Actions'];
    return `<p class="rc-muted">${loaded ? `${rows.length} of ${records.length} responses` : 'Responses unavailable'}</p><div class="rc-table-scroll"><table class="rc-response-table"><thead><tr>${headings.map(h=>`<th scope="col">${e(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr><td>${e(date(r.submittedAt))}</td><td>${e(answerValue(r,/name/i)||'Participant')}</td><td>${e(answerValue(r,/email/i))}</td><td>${e(answerValue(r,/phone|tel/i))}</td><td>${e((r.answers||[]).filter(a=>/city|state/i.test(a.id+' '+a.label)).map(a=>a.value).filter(Boolean).join(' / '))}</td><td>${e(r.opportunityName)}</td><td>${e(typeName(r.registrationType))}</td><td>${e(r.status)}</td>${extra.map(q=>`<td>${e((r.answers||[]).find(a=>a.id===q.id)?.value||'')}</td>`).join('')}<td>${button('View','detail','Eye',r.id)}</td></tr>`).join('')||`<tr><td colspan="${headings.length}">${loaded?'No responses match this selection.':'Connect the private backend to load responses.'}</td></tr>`}</tbody></table></div>`;
  }
  function render() {
    if (!alive) return;
    root.innerHTML = '<h3>Registration Responses</h3><p role="status" data-response-message></p>';
    if (!authenticated) {
      root.insertAdjacentHTML('beforeend','<p>Sign in to the SITA RAM Admin portal to view private responses.</p><a class="rc-button" href="/admin/login/?returnTo=%2Fadmin%2Fsita%2F%23responses">Open Admin Sign In</a>');
      return;
    }
    root.insertAdjacentHTML('beforeend',`<div class="rc-actions">${button('Refresh','refresh','RefreshCw')}${button('Test Connection','connection','Activity')}${button('Sign Out','logout','LogOut')}</div><p class="rc-muted">Registration Backend: ${backendConfigured ? 'Configured' : 'Not Configured'}</p>`);
    if (detail) {
      const r = detail;
      const city = (r.answers || []).filter(a => /city|state/i.test(a.id+' '+a.label)).map(a => a.value).filter(Boolean).join(' / ');
      root.insertAdjacentHTML('beforeend',`${button('Back to Responses','detail-back','ArrowLeft')}<h3>Participant Information</h3><dl class="rc-response-detail">${[['Name',answerValue(r,/name/i)],['Email',answerValue(r,/email/i)],['Phone',answerValue(r,/phone|tel/i)],['City / State',city]].map(([label,value]) => `<dt>${label}</dt><dd>${e(value || 'Not provided')}</dd>`).join('')}</dl><h3>Registration</h3><dl class="rc-response-detail">${[['Program',r.programName],['Opportunity',r.opportunityName],['Registration Type',typeName(r.registrationType)],['Submission Date',date(r.submittedAt)]].map(([label,value]) => `<dt>${label}</dt><dd>${e(value)}</dd>`).join('')}</dl><h3>Responses</h3><dl class="rc-response-detail">${(r.answers || []).filter(a => !['consent','checkbox'].includes(a.type)).map(a => `<dt>${e(a.label)}</dt><dd>${e(a.value || 'Not provided')}</dd>`).join('')}</dl>${(r.answers || []).some(a => ['consent','checkbox'].includes(a.type)) ? `<h3>Consent</h3><dl class="rc-response-detail">${r.answers.filter(a => ['consent','checkbox'].includes(a.type)).map(a => `<dt>${e(a.label)}</dt><dd>${e(a.value || 'Not provided')}</dd>`).join('')}</dl>` : ''}<form data-response-status><label class="rc-field">Internal Response Status<select name="status">${RESPONSE_STATUSES.map(value => `<option ${value === r.status ? 'selected' : ''}>${value}</option>`).join('')}</select></label><button type="submit"><i data-lucide="Save" aria-hidden="true"></i>Save Status</button></form>`);
      icons(); return;
    }
    const opportunities = new Map(content.opportunities.map(o => [o.id,o.name]));
    records.forEach(r => {if (!opportunities.has(r.opportunityId)) opportunities.set(r.opportunityId,r.opportunityName);});
    root.insertAdjacentHTML('beforeend',`<div class="rc-stats">${[['Total Responses','total'],['Registrations','OPEN_REGISTRATION'],['Waitlist','OPEN_WAITLIST'],['Future Interest','FUTURE_INTEREST']].map(([label,key]) => `<div class="rc-stat"><strong>${totals ? Number(totals[key] || 0) : 'Unavailable'}</strong><span>${label}</span></div>`).join('')}</div><div class="rc-response-filters">${select('Program','programId',content.programs.map(p=>[p.id,p.title]),'All SITA Programs')}${select('Opportunity','opportunityId',[...opportunities],'All SITA Opportunities')}${select('Response Type','registrationType',Object.keys(TYPES).map(type => [type,typeName(type)]),'All Types')}${select('Status','status',RESPONSE_STATUSES.map(s => [s,s]),'All Statuses')}<label class="rc-field">From Date<input type="date" data-response-filter="from" value="${e(filters.from)}"></label><label class="rc-field">Through Date<input type="date" data-response-filter="to" value="${e(filters.to)}"></label><label class="rc-field">Search<input type="search" data-response-filter="search" value="${e(filters.search)}"></label>${select('Sort','sort',[['newest','Newest First'],['oldest','Oldest First'],['name','Name'],['status','Status']])}</div><div class="rc-actions">${button('Export Current Filter','export-filtered','Download')}${button('Export All Responses for Opportunity','export','Download')}${sheetUrl ? `<a class="rc-button" href="${e(safeUrl(sheetUrl))}" target="_blank" rel="noopener noreferrer">Open Response Sheet</a>` : ''}</div><div data-response-table>${table()}</div>`);
    root.querySelectorAll('[data-response-action^="export"]').forEach(b => {b.disabled = !loaded || !filters.opportunityId && b.dataset.responseAction === 'export';});
    icons();
  }
  async function load() {
    status('Loading private responses...');
    const summary = await api('summary');
    const result = await api('responses');
    totals = summary.totals; records = result.records; sheetUrl = result.sheetUrl; loaded = true; render();
  }
  root.addEventListener('input',event => {
    const field = event.target.closest('[data-response-filter]'); if (!field) return;
    filters[field.dataset.responseFilter] = field.value;
    root.querySelector('[data-response-table]').innerHTML = table();
    root.querySelector('[data-response-action="export"]').disabled = !loaded || !filters.opportunityId; icons();
  },{signal:abort.signal});
  root.addEventListener('click',async event => {
    const b = event.target.closest('[data-response-action]'); if (!b || busy) return;
    busy = true; b.disabled = true;
    try {
      const action = b.dataset.responseAction;
      if (action === 'logout') { await api('logout',{}); records = []; totals = null; location.assign('/admin/login/'); }
      if (action === 'refresh') await load();
      if (action === 'connection') { const result = await api('connection'); status(result.message); }
      if (action === 'detail') {
        const row = records.find(r => r.id === b.dataset.id);
        detail = (await api('response?opportunityId='+encodeURIComponent(row.opportunityId)+'&id='+encodeURIComponent(row.id))).record; render();
      }
      if (action === 'detail-back') { detail = null; render(); }
      if (action.startsWith('export')) {
        if (!(await api('session')).authenticated) { authenticated = false; records = []; render(); throw new Error('Please sign in again.'); }
        // Fetch again so exports reflect stored statuses and current authorization.
        const fresh = (await api('responses'+(filters.opportunityId ? '?opportunityId='+encodeURIComponent(filters.opportunityId) : ''))).records;
        const rows = action === 'export-filtered' ? filterResponses(fresh,filters) : fresh;
        const url = URL.createObjectURL(new Blob([responseCsv(rows)],{type:'text/csv;charset=utf-8'}));
        const link = document.createElement('a'); link.href = url; link.download = `${filters.opportunityId || 'sita'}-responses.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
      }
    } catch(error) { if (alive) status(error.message); }
    finally { busy = false; if (b.isConnected) b.disabled = false; }
  },{signal:abort.signal});
  root.addEventListener('submit',async event => {
    event.preventDefault(); if (busy || !detail) return; busy = true;
    const b = event.target.querySelector('button'); b.disabled = true;
    try {
      const value = new FormData(event.target).get('status');
      await api('status',{opportunityId:detail.opportunityId,id:detail.id,status:value});
      detail.status = value; const row = records.find(r => r.id === detail.id); if (row) row.status = value;
      render(); status('Internal status saved. The public registration status is unchanged.');
    } catch(error) { if (alive) status(error.message); }
    finally { busy = false; if (b.isConnected) b.disabled = false; }
  },{signal:abort.signal});
  async function checkSession(initial = false) {
    try {
      const session = await api('session'); backendConfigured = session.backendConfigured;
      if (!session.authenticated) { authenticated = false; records = []; totals = null; detail = null; loaded = false; render(); }
      else if (initial) { authenticated = true; render(); await load(); }
    } catch(error) { if (alive) { records = []; totals = null; detail = null; loaded = false; render(); status(error.message); } }
  }
  render(); checkSession(true);
  const timer = setInterval(() => checkSession(),30000);
  return () => {alive = false; abort.abort(); clearInterval(timer); records = []; totals = null; detail = null; root.replaceChildren();};
}

export function initOpportunityResponseCounts(root) {
  const controller = new AbortController();
  fetch('/api/sita/registrations/summary',{cache:'no-store',signal:controller.signal}).then(async result => {
    if (!result.ok) throw new Error('Unavailable');
    const {counts} = await result.json();
    root.querySelectorAll('[data-response-count]').forEach(node => {const count = Number(counts[node.dataset.responseCount] || 0); node.textContent = `${count} ${count === 1 ? 'Response' : 'Responses'}`;});
  }).catch(() => {if (!controller.signal.aborted) root.querySelectorAll('[data-response-count]').forEach(node => {node.textContent = 'Responses unavailable';});});
  return () => controller.abort();
}
