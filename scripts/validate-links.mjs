import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(await stat('dist/client').then(() => 'dist/client').catch(() => 'dist'));
const pages = new Set();
const files = new Set();
const links = [];

async function walk(dir) {
  for (const entry of await readdir(dir)) {
    const full = path.join(dir, entry);
    const info = await stat(full);
    if (info.isDirectory()) {
      await walk(full);
    } else if (entry.endsWith('.html')) {
      const rel = '/' + path.relative(root, full).replace(/\\/g, '/');
      files.add(rel);
      pages.add(rel.endsWith('/index.html') ? rel.slice(0, -10) || '/' : rel.replace(/\.html$/, ''));
      const html = await readFile(full, 'utf8');
      for (const match of html.matchAll(/href="([^"]+)"/g)) {
        links.push({ file: rel, href: match[1] });
      }
    } else {
      files.add('/' + path.relative(root, full).replace(/\\/g, '/'));
    }
  }
}

await walk(root);

const broken = links.filter(({ href }) => {
  if (!href.startsWith('/') || href.startsWith('//')) return false;
  if (href.includes('#') || href.includes('mailto:')) return false;
  const clean = href.split('?')[0].replace(/\/$/, '') || '/';
  return !pages.has(clean) && !pages.has(`${clean}/`) && !files.has(clean);
});

if (broken.length) {
  console.error('Broken internal links found:');
  for (const item of broken) console.error(`${item.file} -> ${item.href}`);
  process.exit(1);
}

console.log(`Validated ${links.length} links across ${pages.size} pages.`);
