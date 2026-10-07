import {readFile, writeFile, mkdir, rename} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {privateRamApi} from './ram-private-api.mjs';
import {validateWebsite} from '../src/lib/website/model.mjs';

export function websiteMiddleware({root=process.cwd(),guard=privateRamApi({root})}={}) {
  const publishedFile=path.join(root,'public/content/website.json'),draftFile=path.join(root,'.astro/website-draft.json');
  const read=async file=>JSON.parse(await readFile(file,'utf8'));
  const write=async(file,data)=>{await mkdir(path.dirname(file),{recursive:true});const temp=file+'.'+randomUUID()+'.tmp';await writeFile(temp,JSON.stringify(data,null,2)+'\n');await rename(temp,file);};
  let saving=false;
  return async(req,res,next)=>{
    const url=new URL(req.url,'http://localhost');
    const reply=(status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(data));};
    if(url.pathname==='/content/website.json'&&req.method==='GET') {try{return reply(200,await read(publishedFile));}catch{return reply(503,{error:'Website settings are unavailable.'});}}
    if(!url.pathname.startsWith('/api/website/'))return next();
    const originalUrl=req.url;
    req.url=req.url.replace('/api/website/','/api/ram/website/');
    return guard(req,res,async()=>{
      req.url=originalUrl;
      try {
        const published=await read(publishedFile);
        if(req.method==='GET'&&url.pathname==='/api/website/content') {const draft=await read(draftFile).catch(()=>null);return reply(200,{published,draft:draft?.updatedAt===published.updatedAt?draft:null});}
        if(req.method!=='POST'||!['/api/website/draft','/api/website/publish'].includes(url.pathname))return reply(405,{error:'Action unavailable.'});
        if(req.headers.origin!==`http://${req.headers.host}`||req.headers['content-type']!=='application/json')return reply(403,{error:'Use the control center to save changes.'});
        let body='';for await(const chunk of req){body+=chunk;if(body.length>256*1024)return reply(413,{error:'Website settings are too large.'});}
        const p=JSON.parse(body);validateWebsite(p.content);
        if(saving)return reply(409,{error:'Another save is in progress. Please retry.'});
        saving=true;
        try {
          // Re-read inside the save lock: a request body may arrive after another publish.
          const latest=await read(publishedFile);
          if(p.revision!==latest.updatedAt)return reply(409,{error:'Website settings changed in another window. Reload before saving.'});
          const publish=url.pathname.endsWith('/publish');
          if(publish)p.content.updatedAt=new Date().toISOString();
          await write(draftFile,p.content);
          if(publish)await write(publishedFile,p.content);
          return reply(200,{content:p.content,published:publish});
        }finally{saving=false;}
      }catch(error){return reply(400,{error:error.message||'Unable to save website settings.'});}
    });
  };
}
export default function websiteDevApi(){return {name:'website-settings-editor',configureServer(server){server.middlewares.use(websiteMiddleware());}};}
