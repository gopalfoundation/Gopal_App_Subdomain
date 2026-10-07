import { RESPONSE_STATUSES } from './model.mjs';

export function answerValue(record, pattern) {
  return (record.answers || []).find(a => pattern.test(`${a.id} ${a.label} ${a.type}`))?.value || '';
}
export function responseColumns(records, form) {
  const fields = new Map();
  for (const q of form?.questions || []) if (!['info','heading'].includes(q.type)) fields.set(q.id,{id:q.id,label:q.label});
  for (const record of records) for (const answer of record.answers || []) fields.set(answer.id,{id:answer.id,label:answer.label});
  return [...fields.values()];
}
export function filterResponses(records,{search = '',status = '',opportunityId = '',registrationType = '',sort = 'newest',from = '',to = ''} = {}) {
  const needle = search.trim().toLocaleLowerCase();
  return records.filter(r => (!opportunityId || r.opportunityId === opportunityId) && (!registrationType || r.registrationType === registrationType) && (!status || r.status === status) && (!from || r.submittedAt.slice(0,10) >= from) && (!to || r.submittedAt.slice(0,10) <= to) && (!needle || [r.submittedAt,r.status,r.programName,r.opportunityName,...(r.answers || []).map(a => a.value)].join(' ').toLocaleLowerCase().includes(needle))).sort((a,b) => sort === 'name' ? String(answerValue(a,/name/i)).localeCompare(String(answerValue(b,/name/i))) : sort === 'status' ? a.status.localeCompare(b.status) : sort === 'oldest' ? a.submittedAt.localeCompare(b.submittedAt) : b.submittedAt.localeCompare(a.submittedAt));
}
export function responseCsv(records, form) {
  const fields = responseColumns(records,form);
  // Neutralize spreadsheet formulas before quoting; participant values are untrusted.
  const cell = value => '"'+String(value ?? '').replace(/^[\s\uFEFF]*(?=[=+@-])/,'\'').replaceAll('"','""')+'"';
  const rows = [['Submission Date','Initiative','Program','Opportunity','Response Type','Registration Status',...fields.map(f => f.label)],...records.map(r => [r.submittedAt,r.initiative,r.programName,r.opportunityName,r.registrationType,r.status,...fields.map(f => (r.answers || []).find(a => a.id === f.id)?.value || '')])];
  return '\uFEFF'+rows.map(row => row.map(cell).join(',')).join('\r\n');
}
export function validResponseStatus(value) { return RESPONSE_STATUSES.includes(value); }
