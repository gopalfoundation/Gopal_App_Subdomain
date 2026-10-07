import { randomBytes } from 'node:crypto';
import { adminPasswordHash } from '../src/server/registrations.mjs';
let password = '';
for await (const chunk of process.stdin) password += chunk;
if (password.length < 12 || password.length > 256) throw new Error('Choose a password between 12 and 256 characters.');
process.stdout.write(JSON.stringify({passwordHash:await adminPasswordHash(password),sessionSecret:randomBytes(32).toString('hex'),backendToken:randomBytes(32).toString('hex')}));
