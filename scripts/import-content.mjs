/**
 * One-time (re-runnable) importer: converts the Obsidian vault at
 * ../astra/content into standard markdown under src/content/, and
 * copies images into public/assets/.
 *
 * Handles: ![[image|width]] embeds, [[note|display]] wikilinks, > [!type] callouts.
 * Usage: node scripts/import-content.mjs [vault-path]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.resolve(process.argv[2] ?? path.join(ROOT, '../astra/content'));
const ASSET_OUT = path.join(ROOT, 'public/assets');
const CONTENT_OUT = path.join(ROOT, 'src/content');

const dashify = (s) => s.replaceAll(' ', '-');

// --- assets ---------------------------------------------------------------
const assetDirs = [path.join(SRC, 'assets'), path.join(SRC, 'UX/16 UX Laws/assets')];
const assetMap = new Map(); // original basename -> public filename
fs.mkdirSync(ASSET_OUT, { recursive: true });
for (const dir of assetDirs) {
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const clean = dashify(name.replace(/\s+(?=\.[^.]+$)/, ''));
    assetMap.set(name, clean);
    fs.copyFileSync(path.join(dir, name), path.join(ASSET_OUT, clean));
  }
}

// --- note -> url map ------------------------------------------------------
const collections = [
  { srcDir: 'essays', outDir: 'essays', url: (base) => `/essays/${dashify(base)}` },
  { srcDir: 'products', outDir: 'products', url: (base) => `/products/${base}` },
  { srcDir: 'UX/16 UX Laws', outDir: 'ux/16 UX Laws', url: (base) => `/UX/16-UX-Laws/${dashify(base)}` },
  { srcDir: 'UX/ADE', outDir: 'ux/ADE', url: (base) => `/UX/ADE/${dashify(base)}` },
  { srcDir: '.', outDir: 'pages', url: (base) => `/${base}`, only: ['datacamp', 'ksana', 'portfolio'] },
];

const noteUrls = new Map(); // note basename (no ext) -> site url
const files = []; // { abs, outAbs }
for (const c of collections) {
  const dir = path.join(SRC, c.srcDir);
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.md')) continue;
    const base = name.slice(0, -3);
    if (c.only && !c.only.includes(base)) continue;
    noteUrls.set(base, c.url(base));
    files.push({ abs: path.join(dir, name), outAbs: path.join(CONTENT_OUT, c.outDir, name) });
  }
}

// --- convert --------------------------------------------------------------
const unresolved = new Set();

function convert(md) {
  // image embeds: ![[file.png]] / ![[file.png|800]]
  md = md.replace(/!\[\[([^\]|]+?)\s*(?:\|[^\]]*)?\]\]/g, (m, file) => {
    const clean = assetMap.get(file.trim());
    if (!clean) {
      unresolved.add(`embed: ${file}`);
      return m;
    }
    return `![${clean.replace(/\.[^.]+$/, '')}](/assets/${encodeURI(clean)})`;
  });
  // wikilinks: [[note]] / [[note|display]] / [[note#heading|display]]
  md = md.replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (m, target, display) => {
    const text = (display ?? target).trim();
    const url = noteUrls.get(target.trim());
    if (!url) {
      unresolved.add(`link: ${target.trim()}`);
      return text;
    }
    return `[${text}](${encodeURI(url)})`;
  });
  // callouts: > [!INFO] text  ->  bold blockquote line
  md = md.replace(/^(>\s*)\[!\w+\][+-]?\s*(.*)$/gm, (m, prefix, text) =>
    text ? `${prefix}**${text}**` : prefix.trimEnd()
  );
  // Obsidian block ids: trailing ^abc123
  md = md.replace(/\s*\^[a-zA-Z0-9]{4,}\s*$/gm, '');
  return md;
}

for (const f of files) {
  let md = convert(fs.readFileSync(f.abs, 'utf8'));
  // ensure every entry has a title (collection schema requires it)
  const base = path.basename(f.abs, '.md');
  if (!md.startsWith('---')) {
    md = `---\ntitle: ${base}\n---\n${md}`;
  } else if (!/^title:/m.test(md.split(/^---$/m)[1] ?? '')) {
    md = md.replace(/^---\n/, `---\ntitle: ${base}\n`);
  }
  fs.mkdirSync(path.dirname(f.outAbs), { recursive: true });
  fs.writeFileSync(f.outAbs, md);
}

console.log(`Imported ${files.length} markdown files, ${assetMap.size} assets.`);
if (unresolved.size) {
  console.log('Unresolved references (kept as plain text / left as-is):');
  for (const u of [...unresolved].sort()) console.log(`  - ${u}`);
}
