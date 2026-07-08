#!/usr/bin/env node
// Build the RAI-Institute team directory into _site/ — no dependencies.
// For each people/*.md (except TEMPLATE.md) it emits:
//   _site/u/<handle>/index.html   — a hosted profile page, OR a redirect if `redirect:` is set
//   _site/index.html              — the directory of everyone
// Run: node scripts/build.mjs

import { readdirSync, readFileSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PEOPLE_DIR = join(ROOT, "people");
const OUT = join(ROOT, "_site");
const SITE_TITLE = "RAI-Institute — Team";

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const attr = (s = "") => esc(s).replace(/'/g, "&#39;");

// Minimal, tolerant front-matter parser: `key: value` lines, repeated `link:` lines,
// body after the closing `---` becomes bio paragraphs. No external YAML dependency.
function parse(raw, file) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file}: missing front-matter (--- ... ---)`);
  const [, fm, body] = m;
  const data = { links: [] };
  for (const line of fm.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (key === "link") {
      if (!val) continue;
      const [label, ...rest] = val.split("|");
      const url = rest.join("|").trim();
      if (url) data.links.push({ label: label.trim() || url, url });
    } else {
      data[key] = val;
    }
  }
  data.bio = body.trim();
  return data;
}

function validate(p, file) {
  if (!p.name) throw new Error(`${file}: 'name' is required`);
  if (!p.handle) throw new Error(`${file}: 'handle' is required`);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(p.handle))
    throw new Error(`${file}: 'handle' must be lowercase letters, numbers, and hyphens (got "${p.handle}")`);
}

function bioHtml(bio) {
  if (!bio) return "";
  return bio
    .split(/\r?\n\s*\r?\n/)
    .map((para) => `<p>${esc(para.trim()).replace(/\r?\n/g, "<br>")}</p>`)
    .join("\n");
}

const STYLE = `
:root{--bg:#fff;--fg:#111;--muted:#5b6470;--card:#f6f7f9;--border:#e5e8ec;--accent:#1f7a5c}
@media (prefers-color-scheme:dark){:root{--bg:#0e1116;--fg:#e6e9ef;--muted:#9aa4b2;--card:#161b22;--border:#2a313a;--accent:#4bd1a0}}
:root[data-theme=dark]{--bg:#0e1116;--fg:#e6e9ef;--muted:#9aa4b2;--card:#161b22;--border:#2a313a;--accent:#4bd1a0}
:root[data-theme=light]{--bg:#fff;--fg:#111;--muted:#5b6470;--card:#f6f7f9;--border:#e5e8ec;--accent:#1f7a5c}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.wrap{max-width:60rem;margin:0 auto;padding:3rem 1.25rem}
h1{font-size:1.8rem;margin:0 0 .25rem}
.lede{color:var(--muted);margin:0 0 2rem}
a{color:var(--accent)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(15rem,1fr));gap:1rem}
.card{display:flex;gap:.85rem;align-items:center;padding:1rem;background:var(--card);border:1px solid var(--border);border-radius:12px;text-decoration:none;color:inherit}
.card:hover{border-color:var(--accent)}
.avatar{width:52px;height:52px;border-radius:50%;object-fit:cover;flex:0 0 auto;background:var(--border)}
.card .name{font-weight:600}
.card .meta{color:var(--muted);font-size:.86rem}
.tag{display:inline-block;font-size:.72rem;color:var(--accent);border:1px solid var(--accent);border-radius:999px;padding:.05rem .5rem;margin-top:.3rem}
.profile{display:flex;gap:1.5rem;align-items:flex-start;flex-wrap:wrap}
.profile .avatar{width:120px;height:120px}
.links{list-style:none;padding:0;margin:1.25rem 0 0}
.links li{margin:.35rem 0}
footer{margin-top:3rem;color:var(--muted);font-size:.85rem;border-top:1px solid var(--border);padding-top:1rem}
.back{display:inline-block;margin-bottom:1.5rem;color:var(--muted);text-decoration:none}
`.trim();

function page(title, inner) {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>${STYLE}</style></head>
<body><div class="wrap">${inner}
<footer>Part of the <a href="https://github.com/RAI-Institute">RAI-Institute</a> org · edit this directory in <a href="https://github.com/RAI-Institute/team">RAI-Institute/team</a></footer>
</div></body></html>`;
}

function redirectPage(p) {
  const url = p.redirect;
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${attr(url)}">
<link rel="canonical" href="${attr(url)}"><title>Redirecting to ${esc(p.name)}</title>
<script>location.replace(${JSON.stringify(url)})</script></head>
<body style="font-family:system-ui;padding:2rem">Redirecting to <a href="${attr(url)}">${esc(url)}</a>&hellip;</body></html>`;
}

function profilePage(p) {
  const links = p.links.length
    ? `<ul class="links">${p.links.map((l) => `<li><a href="${attr(l.url)}" rel="noopener">${esc(l.label)}</a></li>`).join("")}</ul>`
    : "";
  const avatar = p.avatar ? `<img class="avatar" src="${attr(p.avatar)}" alt="${attr(p.name)}">` : "";
  const meta = [p.role, p.group].filter(Boolean).map(esc).join(" · ");
  return page(`${p.name} — RAI-Institute`, `
<a class="back" href="../../">&larr; Team directory</a>
<div class="profile">${avatar}
<div><h1>${esc(p.name)}</h1>${meta ? `<p class="lede">${meta}</p>` : ""}
${bioHtml(p.bio)}${links}</div></div>`);
}

function indexPage(people) {
  const cards = people
    .map((p) => {
      const avatar = p.avatar
        ? `<img class="avatar" src="${attr(p.avatar)}" alt="">`
        : `<span class="avatar"></span>`;
      const meta = [p.role, p.group].filter(Boolean).map(esc).join(" · ");
      const redir = p.redirect ? `<span class="tag">redirects &rarr;</span>` : "";
      return `<a class="card" href="u/${attr(p.handle)}/">${avatar}
<span><span class="name">${esc(p.name)}</span><br><span class="meta">${meta}</span><br>${redir}</span></a>`;
    })
    .join("\n");
  return page(SITE_TITLE, `
<h1>RAI-Institute team</h1>
<p class="lede">${people.length} ${people.length === 1 ? "person" : "people"}. Each links to a profile page or redirects to a personal site. <a href="https://github.com/RAI-Institute/team#add-yourself">Add yourself &rarr;</a></p>
<div class="grid">${cards || "<p class='lede'>No profiles yet — be the first to add one.</p>"}</div>`);
}

// ---- build ----
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const files = readdirSync(PEOPLE_DIR).filter((f) => f.endsWith(".md") && f !== "TEMPLATE.md");
const seen = new Map();
const people = [];

for (const file of files) {
  const p = parse(readFileSync(join(PEOPLE_DIR, file), "utf8"), file);
  validate(p, file);
  if (seen.has(p.handle)) throw new Error(`Duplicate handle "${p.handle}" in ${file} and ${seen.get(p.handle)}`);
  seen.set(p.handle, file);
  people.push(p);
}

people.sort((a, b) => a.name.localeCompare(b.name));

for (const p of people) {
  const dir = join(OUT, "u", p.handle);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), p.redirect ? redirectPage(p) : profilePage(p));
}

writeFileSync(join(OUT, "index.html"), indexPage(people));
writeFileSync(join(OUT, ".nojekyll"), "");
console.log(`Built ${people.length} profile(s) into _site/`);
