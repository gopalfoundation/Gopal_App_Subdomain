// Script Properties: REGISTRATION_SHEET_ID and REGISTRATION_BACKEND_SECRET.
var RESPONSE_HEADERS = ['Timestamp','Submission ID','Initiative','Program ID','Program Name','Opportunity ID','Opportunity Name','Opportunity Type','Form ID','Response Status','Name','Email','Phone','City / State','Answer Snapshot'];
var INTERNAL_STATUSES = ['NEW','REVIEWED','CONFIRMED','CONTACTED','WAITLIST','CANCELLED'];
function output_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function doGet() { return output_({success:false,error:'UNAUTHORIZED'}); }
function equalSecret_(a,b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  var diff = a.length ^ b.length;
  for (var i=0;i<Math.max(a.length,b.length);i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    if (!e || !e.postData || e.postData.contents.length > 65536) throw new Error('Invalid request');
    var p = JSON.parse(e.postData.contents);
    var properties = PropertiesService.getScriptProperties();
    var secret = properties.getProperty('REGISTRATION_BACKEND_SECRET');
    if (!secret || secret.length < 32 || !equalSecret_(p.token,secret)) return output_({success:false,error:'UNAUTHORIZED'});
    if (!/^[A-Z][A-Z0-9_-]{0,39}$/.test(p.initiative || '')) throw new Error('Invalid initiative');
    lock.waitLock(10000);
    var book = SpreadsheetApp.openById(properties.getProperty('REGISTRATION_SHEET_ID'));
    var sheet = book.getSheetByName('Master Responses');
    if (!sheet) { sheet = book.insertSheet('Master Responses'); sheet.appendRow(RESPONSE_HEADERS); sheet.setFrozenRows(1); }
    if (sheet.getRange(1,1,1,RESPONSE_HEADERS.length).getValues()[0].join('|') !== RESPONSE_HEADERS.join('|')) throw new Error('Unexpected sheet schema');
    var rows = sheet.getLastRow() > 1 ? sheet.getRange(2,1,sheet.getLastRow()-1,RESPONSE_HEADERS.length).getValues() : [];
    var result;
    if (p.action === 'submitRegistration') result = submitRegistration(p,sheet,rows);
    else if (p.action === 'getResponses') result = getResponses(p,book,rows);
    else if (p.action === 'getResponse') result = getResponse(p,rows);
    else if (p.action === 'updateResponseStatus') result = updateResponseStatus(p,sheet,rows);
    else if (p.action === 'summary') {
      result = {success:true,counts:{},totals:{total:0,OPEN_REGISTRATION:0,OPEN_WAITLIST:0,FUTURE_INTEREST:0}};
      rows.filter(function(row) {return row[2] === p.initiative;}).forEach(function(row) {result.counts[row[5]] = (result.counts[row[5]] || 0)+1; result.totals.total++; if (Object.prototype.hasOwnProperty.call(result.totals,row[7])) result.totals[row[7]]++;});
    } else if (p.action === 'testConnection') result = {success:true};
    else throw new Error('Invalid action');
    return output_(result);
  } catch (error) {
    // No participant data, secrets, or provider diagnostics in responses or logs.
    return output_({success:false,error:'REQUEST_FAILED'});
  } finally { if (lock.hasLock()) lock.releaseLock(); }
}
function textCell_(value) { var s = String(value || ''); return /^[\s\uFEFF]*[=+@-]/.test(s) ? "'"+s : s; }
function identity_(answers,pattern) { var a = answers.filter(function(a) {return pattern.test(a.id+' '+a.label+' '+a.type);})[0]; return a ? a.value : ''; }
function submitRegistration(p,sheet,rows) {
  var r = p.record;
  if (!r || !/^[\w-]{16,100}$/.test(r.id || '') || r.submissionId !== r.id || r.initiative !== p.initiative || !Array.isArray(r.answers) || r.answers.length > 100) throw new Error('Invalid response');
  ['programId','opportunityId','formId'].forEach(function(key) {if (!/^[\w-]{1,120}$/.test(r[key] || '')) throw new Error('Invalid identifier');});
  ['programName','opportunityName'].forEach(function(key) {if (typeof r[key] !== 'string' || r[key].length > 1000) throw new Error('Invalid name');});
  if (['OPEN_REGISTRATION','OPEN_WAITLIST','FUTURE_INTEREST'].indexOf(r.registrationType) < 0) throw new Error('Invalid type');
  r.answers.forEach(function(a) {if (!a || typeof a.id !== 'string' || a.id.length > 120 || typeof a.label !== 'string' || a.label.length > 1000 || typeof a.type !== 'string' || typeof a.value !== 'string' || a.value.length > 4000) throw new Error('Invalid answer');});
  if (JSON.stringify(r).length > 45000) throw new Error('Answers too large');
  var existing = rows.filter(function(row) {return row[1] === r.id;})[0];
  if (existing) {
    if (existing[2] !== r.initiative || existing[3] !== r.programId || existing[5] !== r.opportunityId || existing[8] !== r.formId) throw new Error('Duplicate identifier');
    return {success:true,submissionId:r.id};
  }
  // Script-wide protection persists across serverless isolates. No IPs or personal data are cached.
  var cache = CacheService.getScriptCache(), minute = Math.floor(Date.now()/60000), key = 'submissions:'+minute;
  var count = Number(cache.get(key) || 0); if (count >= 120) throw new Error('Submission limit'); cache.put(key,String(count+1),120);
  r.submittedAt = new Date().toISOString(); r.status = 'NEW';
  var city = r.answers.filter(function(a) {return /city|state/i.test(a.id+' '+a.label);}).map(function(a) {return a.value;}).filter(Boolean).join(' / ');
  var values = [r.submittedAt,r.id,r.initiative,r.programId,r.programName,r.opportunityId,r.opportunityName,r.registrationType,r.formId,'NEW',identity_(r.answers,/name/i),identity_(r.answers,/email/i),identity_(r.answers,/phone|tel/i),city,JSON.stringify(r)];
  sheet.appendRow(values.map(textCell_)); SpreadsheetApp.flush();
  return {success:true,submissionId:r.id};
}
function rowRecord_(row) { var r = JSON.parse(row[14]); r.status = row[9]; return r; }
function getResponses(p,book,rows) {
  return {success:true,records:rows.filter(function(row) {return row[2] === p.initiative && (!p.opportunityId || row[5] === p.opportunityId);}).map(rowRecord_),sheetUrl:book.getUrl()};
}
function getResponse(p,rows) {
  var row = rows.filter(function(row) {return row[2] === p.initiative && row[5] === p.opportunityId && row[1] === p.id;})[0];
  if (!row) throw new Error('Not found'); return {success:true,record:rowRecord_(row)};
}
function updateResponseStatus(p,sheet,rows) {
  if (INTERNAL_STATUSES.indexOf(p.status) < 0) throw new Error('Invalid status');
  var index = rows.findIndex(function(row) {return row[2] === p.initiative && row[5] === p.opportunityId && row[1] === p.id;});
  if (index < 0) throw new Error('Not found');
  sheet.getRange(index+2,10).setValue(p.status); SpreadsheetApp.flush(); return {success:true};
}
