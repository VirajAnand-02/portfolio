/**
 * Pulls markdown posts (local BLOG_DIR or a shallow clone of BLOG_REPO) and bakes them into
 * public/blog/: index.json, posts/<slug>.json (pre-rendered HTML + TOC), assets/, rss.xml.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeShiki from '@shikijs/rehype';
import rehypeStringify from 'rehype-stringify';
import { visit, SKIP } from 'unist-util-visit';
import { toString as hastToString } from 'hast-util-to-string';
import type { Root, Element, Parent } from 'hast';
import type { VFile } from 'vfile';
import {
  BLOG_BRANCH, BLOG_DIR, BLOG_REPO, CACHE_DIR, INCLUDE_DRAFTS, IS_CI, PUBLIC_BLOG, SITE_NAME, SITE_URL,
  escapeHtml, type Post, type PostMeta, type TocItem,
} from './blog-config.ts';

const RESERVED_SLUGS = new Set(['posts', 'assets', 'index', 'rss']);
const log = (msg: string) => console.log(`[blog] ${msg}`);

type FileData = { postsDir: string; slug: string; toc: TocItem[]; excerpt: string };

function fail(msg: string): never {
  console.error(`[blog] ERROR: ${msg}`);
  process.exit(1);
}

/* ---------- 1. locate the posts ---------- */

function resolvePostsRoot(): string | null {
  if (BLOG_DIR) {
    if (!fs.existsSync(BLOG_DIR)) fail(`BLOG_DIR does not exist: ${BLOG_DIR}`);
    log(`using local posts from ${BLOG_DIR}`);
    return BLOG_DIR;
  }
  try {
    fs.rmSync(CACHE_DIR, { recursive: true, force: true });
    log(`cloning ${BLOG_REPO}@${BLOG_BRANCH}…`);
    execFileSync('git', ['clone', '--depth', '1', '--branch', BLOG_BRANCH, `https://github.com/${BLOG_REPO}.git`, CACHE_DIR], {
      stdio: ['ignore', 'ignore', 'pipe'],
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }, // a missing/private repo must not hang on a credential prompt
    });
    return CACHE_DIR;
  } catch (err) {
    const detail = err instanceof Error && 'stderr' in err ? String((err as { stderr: unknown }).stderr).trim() : String(err);
    if (IS_CI) fail(`could not clone ${BLOG_REPO}: ${detail}`);
    const reason = detail.split('\n').filter(Boolean).pop() ?? detail; // git's last line carries the cause
    console.warn(`[blog] WARN: could not clone ${BLOG_REPO} (${reason}). Building with no posts — set BLOG_DIR to preview local posts.`);
    return null;
  }
}

/* ---------- 2. rehype plugins ---------- */

const isRelative = (url: string) => !/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(url);

// copies relative images next to the build output and rewrites links between posts
function rehypeLocalize() {
  return (tree: Root, file: VFile) => {
    const { postsDir } = file.data as FileData;
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'img' && typeof node.properties.src === 'string') {
        node.properties.src = copyAsset(node.properties.src, postsDir);
        node.properties.loading = 'lazy';
        node.properties.decoding = 'async';
      }
      if (node.tagName === 'a' && typeof node.properties.href === 'string') {
        const href = node.properties.href;
        if (isRelative(href) && /\.md(#.*)?$/i.test(href)) {
          const [file, hash] = href.split('#');
          node.properties.href = `/blog/${slugify(path.basename(file, path.extname(file)))}${hash ? `#${hash}` : ''}`;
        } else if (/^https?:\/\//i.test(href)) {
          node.properties.target = '_blank';
          node.properties.rel = ['noopener', 'noreferrer'];
        }
      }
    });
  };
}

function rehypeCollect() {
  return (tree: Root, file: VFile) => {
    const data = file.data as FileData;
    data.toc = [];
    data.excerpt = '';
    visit(tree, 'element', (node: Element) => {
      if ((node.tagName === 'h2' || node.tagName === 'h3') && typeof node.properties.id === 'string') {
        data.toc.push({ id: node.properties.id, text: hastToString(node), depth: node.tagName === 'h2' ? 2 : 3 });
      }
      if (!data.excerpt && node.tagName === 'p') data.excerpt = hastToString(node).trim();
    });
  };
}

// <div class="code-block" data-lang="ts"><div class="code-head"><span>ts</span></div><pre>…</pre></div>
function rehypeCodeBlocks() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent: Parent | undefined) => {
      if (node.tagName !== 'pre' || !parent || index === undefined) return;
      const code = node.children.find((c): c is Element => c.type === 'element' && c.tagName === 'code');
      const classes = [...toClassList(node.properties.className), ...toClassList(code?.properties.className)];
      const lang = String(node.properties.dataLanguage ?? classes.find((c) => c.startsWith('language-'))?.slice(9) ?? 'text');
      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['code-block'], dataLang: lang },
        children: [
          { type: 'element', tagName: 'div', properties: { className: ['code-head'] }, children: [{ type: 'element', tagName: 'span', properties: {}, children: [{ type: 'text', value: lang }] }] },
          node,
        ],
      };
      return SKIP;
    });
  };
}

const toClassList = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : typeof v === 'string' ? v.split(/\s+/) : []);

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeLocalize)
  .use(rehypeSlug)
  .use(rehypeCollect)
  .use(rehypeAutolinkHeadings, {
    behavior: 'prepend',
    properties: { className: ['heading-anchor'], ariaHidden: 'true', tabIndex: -1 },
    content: { type: 'text', value: '#' },
  })
  .use(rehypeShiki, {
    theme: 'catppuccin-mocha',
    fallbackLanguage: 'text',
    lazy: true,
    addLanguageClass: true,
    transformers: [{ pre(node) { node.properties.dataLanguage = this.options.lang; } }],
  })
  .use(rehypeCodeBlocks)
  .use(rehypeStringify);

/* ---------- 3. helpers ---------- */

const slugify = (name: string) =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const copiedAssets = new Set<string>();

function copyAsset(url: string, postsDir: string): string {
  if (!isRelative(url)) return url;
  const clean = decodeURIComponent(url.split(/[?#]/)[0]);
  const abs = path.resolve(postsDir, clean);
  const rel = path.relative(postsDir, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    console.warn(`[blog] WARN: asset outside posts/ ignored: ${url}`);
    return url;
  }
  if (!fs.existsSync(abs)) {
    console.warn(`[blog] WARN: missing asset: ${url}`);
    return url;
  }
  const webPath = rel.split(path.sep).map(encodeURIComponent).join('/');
  if (!copiedAssets.has(abs)) {
    const dest = path.join(PUBLIC_BLOG, 'assets', rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(abs, dest);
    copiedAssets.add(abs);
  }
  return `/blog/assets/${webPath}`;
}

function toIsoDate(value: unknown, file: string): string {
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) fail(`${file}: "date" is not a valid date (${String(value)})`);
  return d.toISOString().slice(0, 10);
}

function toTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
  return [];
}

function listMarkdown(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.mdx?$/i.test(e.name) && !/^readme\.md$/i.test(e.name))
    .map((e) => path.join(dir, e.name));
}

/* ---------- 4. build ---------- */

async function main() {
  const root = resolvePostsRoot();
  fs.rmSync(PUBLIC_BLOG, { recursive: true, force: true });
  fs.mkdirSync(path.join(PUBLIC_BLOG, 'posts'), { recursive: true });

  const posts: Post[] = [];
  if (root) {
    const postsDir = fs.existsSync(path.join(root, 'posts')) ? path.join(root, 'posts') : root;
    const seen = new Map<string, string>();

    for (const filePath of listMarkdown(postsDir)) {
      const name = path.relative(root, filePath);
      const { data: fm, content } = matter(fs.readFileSync(filePath, 'utf8'));
      if (fm.draft === true && !INCLUDE_DRAFTS) {
        log(`skip draft ${name}`);
        continue;
      }
      if (!fm.title || typeof fm.title !== 'string') fail(`${name}: frontmatter needs a "title"`);
      if (!fm.date) fail(`${name}: frontmatter needs a "date" (YYYY-MM-DD)`);

      const slug = slugify(typeof fm.slug === 'string' ? fm.slug : path.basename(filePath, path.extname(filePath)));
      if (!slug) fail(`${name}: could not derive a slug from the file name`);
      if (RESERVED_SLUGS.has(slug)) fail(`${name}: slug "${slug}" is reserved — rename the file`);
      if (seen.has(slug)) fail(`${name}: slug "${slug}" is already used by ${seen.get(slug)}`);
      seen.set(slug, name);

      const file = await processor.process({ value: content, path: filePath, data: { postsDir, slug } });
      const data = file.data as FileData;
      const words = content.replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter(Boolean).length;
      const excerpt = data.excerpt.length > 180 ? `${data.excerpt.slice(0, 177).trimEnd()}…` : data.excerpt;

      posts.push({
        slug,
        title: fm.title.trim(),
        date: toIsoDate(fm.date, name),
        description: typeof fm.description === 'string' && fm.description.trim() ? fm.description.trim() : excerpt,
        tags: toTags(fm.tags),
        readingMinutes: Math.max(1, Math.round(words / 220)),
        ...(typeof fm.cover === 'string' ? { cover: copyAsset(fm.cover, postsDir) } : {}),
        ...(fm.draft === true ? { draft: true } : {}),
        html: String(file),
        toc: data.toc,
      });
    }
  }

  posts.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));

  const index: PostMeta[] = posts.map(({ html: _html, toc: _toc, ...meta }) => meta);
  fs.writeFileSync(path.join(PUBLIC_BLOG, 'index.json'), JSON.stringify(index));
  for (const post of posts) fs.writeFileSync(path.join(PUBLIC_BLOG, 'posts', `${post.slug}.json`), JSON.stringify(post));
  fs.writeFileSync(path.join(PUBLIC_BLOG, 'rss.xml'), renderRss(posts));

  log(`built ${posts.length} post${posts.length === 1 ? '' : 's'} → public/blog`);
}

function renderRss(posts: Post[]) {
  const items = posts
    .map(
      (p) => `    <item>
      <title>${escapeHtml(p.title)}</title>
      <link>${SITE_URL}/blog/${p.slug}/</link>
      <guid>${SITE_URL}/blog/${p.slug}/</guid>
      <pubDate>${new Date(`${p.date}T00:00:00Z`).toUTCString()}</pubDate>
      <description>${escapeHtml(p.description)}</description>
    </item>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeHtml(SITE_NAME)} — Blog</title>
    <link>${SITE_URL}/blog/</link>
    <description>Posts by ${escapeHtml(SITE_NAME)}</description>
${items}
  </channel>
</rss>
`;
}

main().catch((err) => fail(err instanceof Error ? err.stack ?? err.message : String(err)));
