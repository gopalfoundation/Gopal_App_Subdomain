import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import path from 'node:path';
import {createFirebaseApp} from '../firebase/runtime.mjs';
import {htmlAssets} from '../firebase/assets.mjs';
import {memoryBucket} from '../firebase/memory-bucket.mjs';
const root=process.cwd(), port=Number(process.env.PORT||4322), origin=`http://127.0.0.1:${port}`;
const env=await readFile('.env.local','utf8').then(parseEnv).catch(()=>({}));
// Local sign-in may reuse the private hash, but never connect to the real Sheet.
const app=createFirebaseApp({env:{...env,SITE_ORIGIN:origin,REGISTRATION_BACKEND_URL:'',REGISTRATION_BACKEND_SECRET:''},bucket:memoryBucket(),assets:htmlAssets(path.join(root,'firebase/functions/site')),secure:false,request:async()=>{throw Error('Preview backend disabled.');}});
const types={'.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.txt':'text/plain','.xml':'application/xml'};
createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,origin), pathname=decodeURIComponent(url.pathname);
    if(pathname.includes('\\')||pathname.split('/').includes('..')){res.writeHead(400).end();return;}
    const file=path.join(root,'dist/hosting',pathname);
    const bytes=await readFile(file).catch(()=>null);
    if(bytes){res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'}).end(bytes);return;}
    const headers=new Headers();for(const [key,value]of Object.entries(req.headers))if(value)headers.set(key,Array.isArray(value)?value.join(', '):value);
    const options={method:req.method,headers};if(!['GET','HEAD'].includes(req.method)){options.body=req;options.duplex='half';}
    const response=await app(new Request(url,options),{ip:req.socket.remoteAddress});
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(503).end('Preview unavailable.');}
}).listen(port,'127.0.0.1',()=>console.log(`Firebase adapter preview: ${origin}; temporary CMS only; real submissions disabled.`));
