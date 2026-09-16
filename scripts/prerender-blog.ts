/**
 * After `vite build`: writes dist/blog/index.html and dist/blog/<slug>/index.html — copies of the SPA shell
 * with per-page <title>, description and Open Graph tags, so link previews (LinkedIn, X, Slack…) work
 * without JavaScript. The article HTML goes in <noscript> for crawlers that don't run JS.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DIST, SITE_NAME, SITE_URL, escapeHtml, type Post, type PostMeta } from './blog-config.ts';

const shellPath = path.join(DIST, 'index.html');
const indexPath = path.join(DIST, 'blog', 'index.json');
if (!fs.existsSync(shellPath) || !fs.existsSync(indexPath)) {
  console.error('[blog] ERROR: run `vite build` (and blog:build) before prerendering');
  process.exit(1);
}

const shell = fs.readFileSync(shellPath, 'utf8');
const index: PostMeta[] = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const abs = (url: string) => (/^https?:\/\//.test(url) ? url : `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`);

type Page = { url: string; title: string; description: string; image: string; type: 'website' | 'article'; published?: string; tags?: string[]; body: string };

function render(page: Page) {
  const e = escapeHtml;
  const head = [
    `<title>${e(page.title)}</title>`,
    `<meta name="description" content="${e(page.description)}" />`,
    `<link rel="canonical" href="${e(page.url)}" />`,
    `<link rel="alternate" type="application/rss+xml" title="${e(SITE_NAME)} — Blog" href="/blog/rss.xml" />`,
    `<meta property="og:site_name" content="${e(SITE_NAME)}" />`,
    `<meta property="og:type" content="${page.type}" />`,
    `<meta property="og:title" content="${e(page.title)}" />`,
    `<meta property="og:description" content="${e(page.description)}" />`,
    `<meta property="og:url" content="${e(page.url)}" />`,
    `<meta property="og:image" content="${e(page.image)}" />`,
    `<meta name="twitter:card" content="${page.image.endsWith('/profile.png') ? 'summary' : 'summary_large_image'}" />`,
    `<meta name="twitter:title" content="${e(page.title)}" />`,
    `<meta name="twitter:description" content="${e(page.description)}" />`,
    `<meta name="twitter:image" content="${e(page.image)}" />`,
    ...(page.published ? [`<meta property="article:published_time" content="${page.published}" />`] : []),
    ...(page.tags ?? []).map((t) => `<meta property="article:tag" content="${e(t)}" />`),
  ].join('\n    ');

  return shell
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+(?:name="(?:description|twitter:[^"]+)"|property="og:[^"]+")[^>]*>\s*/gi, '')
    .replace('</head>', `    ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root"></div>\n    <noscript>${page.body}</noscript>`);
}

function write(relDir: string, html: string) {
  const dir = path.join(DIST, relDir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}

write(
  'blog',
  render({
    url: `${SITE_URL}/blog/`,
    title: `Blog — ${SITE_NAME}`,
    description: `Posts and build logs by ${SITE_NAME}.`,
    image: abs('/profile.png'),
    type: 'website',
    body: `<h1>Blog</h1><ul>${index.map((p) => `<li><a href="/blog/${p.slug}/">${escapeHtml(p.title)}</a> — ${p.date}</li>`).join('')}</ul>`,
  })
);

for (const meta of index) {
  const post: Post = JSON.parse(fs.readFileSync(path.join(DIST, 'blog', 'posts', `${meta.slug}.json`), 'utf8'));
  write(
    path.join('blog', post.slug),
    render({
      url: `${SITE_URL}/blog/${post.slug}/`,
      title: `${post.title} — ${SITE_NAME}`,
      description: post.description,
      // social scrapers don't render SVG covers
      image: abs(post.cover && !/\.svg$/i.test(post.cover) ? post.cover : '/profile.png'),
      type: 'article',
      published: post.date,
      tags: post.tags,
      body: `<article><h1>${escapeHtml(post.title)}</h1>${post.html}</article>`,
    })
  );
}

if (SITE_URL.startsWith('http://localhost')) {
  console.warn('[blog] WARN: SITE_URL is not set — canonical and og:url/og:image point at localhost. Set SITE_URL in the Pages build env.');
}
console.log(`[blog] prerendered ${index.length + 1} page${index.length ? 's' : ''} → dist/blog`);
