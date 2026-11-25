// Turns the Vite build (dist/index.html, a full HTML document) into the page fragment the
// private preview host expects (it supplies <html>/<head>/<body> itself), with data.json beside it.
// Output: dist-artifact/index.html + dist-artifact/data.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(siteDir, 'dist', 'index.html'), 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
const pick = (re) => [...head.matchAll(re)].map((m) => m[0]);
const title = pick(/<title>[\s\S]*?<\/title>/g);
const metas = pick(/<meta name="claude:[^>]*>/g);
const links = pick(/<link [^>]*>/g);
const styles = pick(/<style[\s\S]*?<\/style>/g);
const scripts = pick(/<script[\s\S]*?<\/script>/g);
const out = [...title, ...metas, ...links, ...styles, body.replace(/<script[\s\S]*?<\/script>/g, '').trim(), ...scripts].join('\n');
const dir = path.join(siteDir, 'dist-artifact');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'index.html'), out);
fs.copyFileSync(path.join(siteDir, 'public', 'data.json'), path.join(dir, 'data.json'));
console.log(`dist-artifact/index.html ${(out.length / 1024).toFixed(0)} KB`);
