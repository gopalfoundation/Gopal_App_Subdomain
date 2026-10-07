import {latestVideos} from '../lib/sita/feed.mjs';
import {validateContent} from '../lib/sita/model.mjs';
import {validateContent as validateRam} from '../lib/ram/model.mjs';
import {validateTestimonials,publicTestimonials} from '../lib/testimonials/model.mjs';
import {validateWebsite} from '../lib/website/model.mjs';
const json=(code,data)=>Response.json(data,{status:code,headers:{'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff'}});
export function uploadedImage(data) {
  if(typeof data!=='string'||data.length>7*1024*1024)throw Error('Choose an image smaller than 5 MB.');
  const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));if(!bytes.length||bytes.length>5*1024*1024)throw Error('Choose an image smaller than 5 MB.');
  const starts=values=>values.every((v,i)=>bytes[i]===v),ascii=(a,b)=>String.fromCharCode(...bytes.slice(a,b));
  const extension=starts([137,80,78,71,13,10,26,10])?'png':starts([255,216,255])?'jpg':ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP'?'webp':'';
  if(!extension)throw Error('Upload a PNG, JPEG or WebP image.');
  return {bytes,extension,type:extension==='jpg'?'image/jpeg':'image/'+extension};
}
async function body(req,limit=9*1024*1024) {const reader=req.body?.getReader();const parts=[];let size=0;if(reader)while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw Error('Request too large.');}parts.push(value);}const all=new Uint8Array(size);let n=0;for(const p of parts){all.set(p,n);n+=p.length;}return JSON.parse(new TextDecoder().decode(all));}
export function createFileCms({bucket,seeds,authorize,origin,request=fetch,now=Date.now}) {
  const key=scope=>'cms/'+scope+'.json';
  async function read(scope) {const item=bucket?await bucket.get(key(scope)):null;return {etag:item?.etag||'',state:item?await item.json():{published:structuredClone(seeds[scope]),draft:null,media:[]}};}
  const feedCaches=new Map(),feedRequests=new Map();
  async function published(scope) {
    const content=(await read(scope)).state.published;
    const settings=content.videoSettings;
    if(!['sita','ram'].includes(scope)||!settings?.automatic||settings.sourceType==='MANUAL_CURATION')return content;
    let feedCache=feedCaches.get(scope),feedPending=feedRequests.get(scope);
    const source=scope+':'+(settings.sourceType==='PLAYLIST'?'playlist:'+settings.playlistId:'channel:'+settings.channelId);
    if(source.endsWith(':'))return content;
    // Feed metadata is cached separately, so refreshes never overwrite editorial changes.
    if(!feedCache)try{feedCache=await (await bucket?.get('cms/'+scope+'-feed.json'))?.json();}catch{}
    if(feedCache?.source!==source||now()-feedCache.checkedAt>600000){
      if(!feedPending)feedPending=(async()=>{
        let videos=feedCache?.source===source?feedCache.videos:[];
        try{videos=await latestVideos(settings.channelId,request,settings.sourceType==='PLAYLIST'?settings.playlistId:'');}catch{}
        feedCache={source,checkedAt:now(),videos};
        try{await bucket?.put('cms/'+scope+'-feed.json',JSON.stringify(feedCache),{httpMetadata:{contentType:'application/json'}});}catch{}
        feedCaches.set(scope,feedCache);
      })().finally(()=>{feedRequests.delete(scope);});
      feedRequests.set(scope,feedPending);
      await feedPending;
      feedCache=feedCaches.get(scope);
    }
    const result=structuredClone(content);
    if(feedCache?.source===source)for(const video of feedCache.videos)if(!result.videos.some(v=>v.id===video.id))result.videos.push({...video,displayOrder:result.videos.length+1});
    return result;
  }
  async function write(scope,state,etag) {if(!bucket)throw Error('Online publishing is unavailable. Please contact the website administrator.');const stored=await bucket.put(key(scope),JSON.stringify(state),{onlyIf:etag?{etagMatches:etag}:new Headers({'If-None-Match':'*'}),httpMetadata:{contentType:'application/json'}});if(!stored)return false;return true;}
  async function handle(req) {
    const url=new URL(req.url),scope=url.pathname.startsWith('/api/ram/')?'ram':url.pathname.startsWith('/api/sita/')?'sita':url.pathname.startsWith('/api/testimonials/')?'testimonials':url.pathname.startsWith('/api/website/')?'website':'';
    if(url.pathname==='/content/ram.json'&&req.method==='GET') {try{return json(200,await published('ram'));}catch{return json(503,{error:'Website content is temporarily unavailable.'});}}
    if(url.pathname==='/content/website.json'&&req.method==='GET') {try{return json(200,await published('website'));}catch{return json(503,{error:'Website settings are temporarily unavailable.'});}}
    if(url.pathname==='/content/sita.json'&&req.method==='GET') {try{return json(200,await published('sita'));}catch{return json(503,{error:'Website content is temporarily unavailable.'});}}
    if(url.pathname==='/api/testimonials/public'&&req.method==='GET') {try{return json(200,publicTestimonials(await published('testimonials'),url.searchParams.get('initiative'),url.searchParams.get('program')||''));}catch{return json(503,{records:[],error:'Testimonials are temporarily unavailable.'});}}
    const media=url.pathname.match(/^\/uploads\/(ram|sita|testimonials)\/([a-f0-9-]{36}\.(png|jpg|webp))$/);
    if(media && req.method==='GET' && bucket) {try{if(media[1]==='testimonials'){const c=await published('testimonials');if(!c.records.some(r=>r.published&&r.consentConfirmed&&!r.archived&&r.image===url.pathname)&&!await authorize(req))return new Response('Image unavailable',{status:404});}const obj=await bucket.get('media/'+media[1]+'/'+media[2]);if(obj)return new Response(obj.body,{headers:{'Content-Type':obj.httpMetadata?.contentType||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}catch{return new Response('Image unavailable',{status:503});}return null;}
    if(!scope||url.pathname.includes('/registrations/'))return null;
    if(!await authorize(req))return json(401,{error:'Sign in to the SITA RAM Admin portal.'});
    try {
      const {state,etag}=await read(scope);
      if(req.method==='GET'&&url.pathname.endsWith('/content'))return json(200,{...state,online:true});
      if(req.method==='GET'&&url.pathname.endsWith('/media'))return json(200,state.media||[]);
      if(req.method!=='POST')return json(405,{error:'Action unavailable.'});
      if(url.origin!==origin||req.headers.get('Origin')!==origin||req.headers.get('Content-Type')!=='application/json')return json(403,{error:'Use the control center to save changes.'});
      const p=await body(req);
      if(['sita','ram'].includes(scope) && url.pathname.endsWith('/videos')) return json(200,{videos:await latestVideos(p.channelId,request,p.sourceType === 'PLAYLIST' ? p.playlistId : '')});
      if(url.pathname.endsWith('/upload')) {if(!bucket)throw Error('Online image storage is unavailable.');const image=uploadedImage(p.data),id=crypto.randomUUID(),name=id+'.'+image.extension;await bucket.put('media/'+scope+'/'+name,image.bytes,{httpMetadata:{contentType:image.type}});const record={id,url:'/uploads/'+scope+'/'+name,name:String(p.name||'Uploaded Image').slice(0,120),alt:''};state.media||=[];state.media.push(record);if(!await write(scope,state,etag))return json(409,{error:'The image library changed. Please retry.'});return json(200,record);}
      if(!['/api/'+scope+'/draft','/api/'+scope+'/publish'].includes(url.pathname))return json(405,{error:'Action unavailable.'});
      (scope==='ram'?validateRam:scope==='sita'?validateContent:scope==='website'?validateWebsite:validateTestimonials)(p.content);
      if(p.revision!==state.published.updatedAt)return json(409,{error:'This page changed in another window. Reload before saving.'});
      if(publishPath(url.pathname)){p.content.updatedAt=new Date().toISOString();state.published=p.content;}
      state.draft=p.content;if(!await write(scope,state,etag))return json(409,{error:'Another administrator saved changes. Reload before saving.'});
      return json(200,{content:p.content,published:publishPath(url.pathname),online:true});
    }catch(error){return json(503,{error:error.message||'Publishing is unavailable. Your changes have not been discarded.'});}
  }
  return {handle,published,read};
}
const publishPath=path=>path.endsWith('/publish');
