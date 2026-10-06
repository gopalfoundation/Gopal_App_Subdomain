export async function confirmedSubmission(settings, payload, request = fetch) {
  const proxy = settings.adapter === 'privateProxy';
  if (proxy ? settings.endpoint !== '/api/ram/registrations/submit' : !['googleAppsScript','hostingForms'].includes(settings.adapter) || !/^https:\/\//.test(settings.endpoint || '')) throw new Error('Registration is not available yet. Please contact our team for help.');
  const response = await request(settings.endpoint, { method:'POST', headers:{ 'Content-Type':proxy ? 'application/json' : 'text/plain;charset=utf-8' }, body:JSON.stringify(payload), signal:AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error('We could not confirm your submission. Please try again.');
  const acknowledgement = await response.json().catch(() => null);
  if (acknowledgement?.success !== true && (proxy || acknowledgement?.ok !== true)) throw new Error('We could not confirm your submission. Please try again.');
  return acknowledgement;
}
