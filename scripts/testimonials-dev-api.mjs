import { readFile,writeFile,mkdir,rename,readdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { privateRamApi } from './ram-private-api.mjs';
import { validateTestimonials, publicTestimonials } from '../src/lib/testimonials/model.mjs';
import { uploadedImage } from '../src/server/cms.mjs';
export default function testimonialsDevApi() {
  const root=process.cwd(), file=path.join(root,'src/data/testimonials.json'), draft=path.join(root,'.astro/testimonials-draft.json');
  let saving=false;
  const read = async p=>JSON.parse(await readFile(p,'utf8'));
  async function write(p,c) { await mkdir(path.dirname(p),{recursive:true}); const tmp=p+'.'+randomUUID()+'.tmp'; await writeFile(tmp,JSON.stringify(c,null,2)+'\n'); await rename(tmp,p); }
  return {name:'testimonials-editor',configureServer(server) {
    const guard=privateRamApi({root});
    server.middlewares.use(async(req,res,next)=>{
      const url=new URL(req.url,'http://localhost');
      const media=url.pathname.match(/^\/uploads\/testimonials\/([a-f0-9-]{36}\.(png|jpg|webp))$/);
      if(media){
        const send=async()=>{try{const bytes=await readFile(path.join(root,'.astro/testimonial-media',media[1]));res.setHeader('Content-Type',media[2]==='jpg'?'image/jpeg':'image/'+media[2]);res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(bytes);}catch{res.statusCode=404;res.end();}};
        const c=await read(file);if(c.records.some(r=>r.published&&r.consentConfirmed&&!r.archived&&r.image===url.pathname))return send();
        req.url='/api/ram/testimonial-media';return guard(req,res,send);
      }
      if (!url.pathname.startsWith('/api/testimonials/')) return next();
      const reply=(code,data)=>{res.statusCode=code;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(data));};
      if (url.pathname==='/api/testimonials/public' && req.method==='GET') { try { return reply(200,publicTestimonials(await read(file),url.searchParams.get('initiative'),url.searchParams.get('program')||'')); } catch {return reply(503,{records:[]});} }
      req.url=req.url.replace('/api/testimonials/','/api/ram/testimonials/');
      await guard(req,res,async()=>{
        req.url=req.url.replace('/api/ram/testimonials/','/api/testimonials/');
        try {
          const published=await read(file);
          if (req.method==='GET' && url.pathname==='/api/testimonials/content') { const saved=await read(draft).catch(()=>null);const images=await readdir(path.join(root,'.astro/testimonial-media')).catch(()=>[]);return reply(200,{published,draft:saved?.updatedAt===published.updatedAt?saved:null,media:images.filter(n=>/^[a-f0-9-]{36}\.(png|jpg|webp)$/.test(n)).map(n=>({id:n,name:'Uploaded Testimonial Image',url:'/uploads/testimonials/'+n,alt:''}))}); }
          if (req.method!=='POST' || !['/api/testimonials/draft','/api/testimonials/publish','/api/testimonials/upload'].includes(url.pathname)) return reply(405,{error:'Action unavailable.'});
          if (req.headers.origin!==`http://${req.headers.host}` || req.headers['content-type']!=='application/json') return reply(403,{error:'Use the control center to save.'});
          let body='';for await (const chunk of req) {body+=chunk;if(body.length>9*1024*1024)return reply(413,{error:'Choose an image smaller than 5 MB.'});}
          const p=JSON.parse(body);
          if(url.pathname==='/api/testimonials/upload'){const image=uploadedImage(p.data),id=randomUUID(),name=id+'.'+image.extension;const directory=path.join(root,'.astro/testimonial-media');await mkdir(directory,{recursive:true});await writeFile(path.join(directory,name),image.bytes);return reply(200,{id,name:String(p.name||'Uploaded Image').slice(0,120),url:'/uploads/testimonials/'+name,alt:''});}
          validateTestimonials(p.content);
          if(saving || p.revision!==published.updatedAt)return reply(409,{error:'Testimonials changed in another window. Reload before saving.'});
          saving=true;try {if(url.pathname.endsWith('/publish')) {p.content.updatedAt=new Date().toISOString();await write(file,p.content);}await write(draft,p.content);return reply(200,{content:p.content});}finally{saving=false;}
        } catch(error){return reply(400,{error:error.message});}
      });
    });
  }};
}
