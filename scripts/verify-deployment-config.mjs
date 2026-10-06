import {readFile} from 'node:fs/promises';
const project = process.env.FIREBASE_PROJECT_ID;
if (!project) throw Error('Organization setup missing: GitHub variable FIREBASE_PROJECT_ID.');
if (process.env.SERVICE_ACCOUNT_CONFIGURED !== 'true') throw Error('Organization setup missing: GitHub secret FIREBASE_SERVICE_ACCOUNT_GLORY_OF_PEACE.');
if (!process.env.CMS_BUCKET) throw Error('Organization setup missing: GitHub variable CMS_BUCKET for a private bucket in the existing project.');
const config = await readFile('.firebaserc','utf8').then(JSON.parse).catch(() => null);
const sites = config?.targets?.[project]?.hosting?.['gloryofpeace-landing'];
if (!Array.isArray(sites) || sites.length !== 1 || !sites[0]) throw Error('Organization setup missing: commit the verified .firebaserc target mapping for gloryofpeace-landing.');
console.log('Organization project and Hosting target mapping configured; no secret values inspected.');
