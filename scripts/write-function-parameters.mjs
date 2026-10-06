import {writeFile} from 'node:fs/promises';
const project = process.env.FIREBASE_PROJECT_ID, bucket = process.env.CMS_BUCKET;
if (!/^[a-z0-9-]{4,100}$/.test(project || '') || !/^[a-z0-9][a-z0-9._-]{2,221}$/.test(bucket || '')) throw Error('Invalid existing project or private bucket parameter.');
await writeFile(`firebase/functions/.env.${project}`,`CMS_BUCKET=${bucket}\n`,{mode:0o600});
