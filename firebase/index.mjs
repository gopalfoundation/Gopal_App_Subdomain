import {onRequest} from 'firebase-functions/v2/https';
import {defineJsonSecret, defineString} from 'firebase-functions/params';
import {Storage} from '@google-cloud/storage';
import {fileURLToPath} from 'node:url';
import {createFirebaseApp, PRODUCTION_ORIGIN} from './runtime.mjs';
import {privateFileBucket} from './storage.mjs';
import {htmlAssets} from './assets.mjs';
const serverConfig = defineJsonSecret('SITARAM_SERVER_CONFIG');
const cmsBucket = defineString('CMS_BUCKET');
let app;
export const programsApp = onRequest({region:'us-central1', timeoutSeconds:60, memory:'512MiB', minInstances:0, maxInstances:3, invoker:'public', secrets:[serverConfig]}, async (req,res) => {
  try {
    if (!app) app = createFirebaseApp({env:{...serverConfig.value(), SITE_ORIGIN:PRODUCTION_ORIGIN}, bucket:privateFileBucket(new Storage().bucket(cmsBucket.value())), assets:htmlAssets(fileURLToPath(new URL('../site/',import.meta.url)))});
    const headers = new Headers();
    for (const [key,value] of Object.entries(req.headers)) if (value) headers.set(key,Array.isArray(value)?value.join(', '):value);
    const options = {method:req.method,headers};
    if (!['GET','HEAD'].includes(req.method)) options.body = req.rawBody;
    const route = req.originalUrl || req.url;
    if (!route.startsWith('/') || route.startsWith('//')) {res.status(400).send('Invalid URL');return;}
    const response = await app(new Request(new URL(route, PRODUCTION_ORIGIN),options),{ip:req.ip || 'unknown'});
    res.status(response.status);
    for (const [key,value] of response.headers) res.set(key,value);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch { res.status(503).set('Cache-Control','no-store').send('Website temporarily unavailable. Please retry.'); }
});
