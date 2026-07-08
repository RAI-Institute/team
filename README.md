# RAI-Institute — Team directory

A self-service directory of the RAI-Institute team. Every person adds **one file** and gets:

- a **stable short link** — `https://rai-institute.github.io/team/u/<handle>/`
- a **hosted profile page** at that link, **or** an automatic **redirect** to their own site if they set `redirect:`

The [directory index](https://rai-institute.github.io/team/) lists everyone.

## Add yourself

1. Copy [`people/TEMPLATE.md`](./people/TEMPLATE.md) to `people/<your-handle>.md` (lowercase, hyphens — this becomes your link `/u/<your-handle>/`).
2. Fill in the front-matter and, optionally, a short bio below it.
3. Open a PR. On merge, the site rebuilds and deploys automatically.

That's the whole flow — no build tools to install.

### File format

```markdown
---
name: Your Name                       # required
handle: your-handle                   # required — lowercase, numbers, hyphens; sets your /u/<handle>/ link
role: Research Fellow                 # optional
group: Research                       # optional — Research / Community / Finance WG / ...
avatar: https://github.com/you.png    # optional — any image URL (GitHub avatars work: github.com/<user>.png)
redirect: https://your-site.com       # optional — if set, /u/<handle>/ redirects here instead of showing a page
link: Website | https://your-site.com # optional, repeatable — "Label | URL"
link: GitHub | https://github.com/you
---

Optional short bio. Blank lines separate paragraphs.
```

- **Leave `redirect:` empty** to get a hosted profile page (bio + links).
- **Set `redirect:`** to point your short link straight at an existing profile (personal site, LinkedIn, etc.). Your `/u/<handle>/` link stays stable either way.

## How it works

- [`scripts/build.mjs`](./scripts/build.mjs) — dependency-free Node script that turns `people/*.md` into `_site/` (index + one page per person).
- [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml) — builds and deploys to GitHub Pages on every push to `main`.

Build locally to preview:

```bash
node scripts/build.mjs && open _site/index.html
```

The two `example*.md` files are samples (one hosted, one redirect) so the directory renders out of the box — delete them once real people are added.

## Related

- Org front door: [`.github`](https://github.com/RAI-Institute/.github)
- Get involved: [`fellowship`](https://github.com/RAI-Institute/fellowship)
